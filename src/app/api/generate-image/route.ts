import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { prompt, postId } = await request.json()

    if (!prompt || !postId) {
      return Response.json({ error: 'prompt and postId are required' }, { status: 400 })
    }

    const apiKey = process.env.FREEPIK_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'FREEPIK_API_KEY not configured' }, { status: 500 })
    }

    // Step A: Submit generation task
    const createRes = await fetch('https://api.freepik.com/v1/ai/mystic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt,
        resolution: '2k',
        aspect_ratio: 'square_1_1',
        model: 'realism',
        engine: 'automatic',
        filter_nsfw: true,
      }),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      console.error('Freepik create error:', errText)
      return Response.json({ error: `Freepik API error: ${createRes.status}` }, { status: 500 })
    }

    const createData = await createRes.json()
    const taskId = createData?.data?.task_id

    if (!taskId) {
      console.error('No task_id in Freepik response:', createData)
      return Response.json({ error: 'Failed to get task_id from Freepik' }, { status: 500 })
    }

    // Step C: Poll for completion
    let imageUrl: string | null = null
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 3000))

      const pollRes = await fetch(`https://api.freepik.com/v1/ai/mystic/${taskId}`, {
        headers: { 'x-freepik-api-key': apiKey },
      })

      if (!pollRes.ok) {
        console.error('Freepik poll error:', pollRes.status)
        continue
      }

      const pollData = await pollRes.json()
      const status = pollData?.data?.status

      if (status === 'COMPLETED') {
        imageUrl = pollData?.data?.generated?.[0]?.url
        break
      }

      if (status === 'FAILED') {
        return Response.json({ error: 'Image generation failed' }, { status: 500 })
      }
    }

    if (!imageUrl) {
      return Response.json({ error: 'Image generation timed out' }, { status: 504 })
    }

    // Step D: Fetch the generated image
    const imageRes = await fetch(imageUrl)
    const imageBuffer = await imageRes.arrayBuffer()

    // Step E: Upload to Supabase Storage
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const fileName = `${postId}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, Buffer.from(imageBuffer), {
        upsert: true,
        contentType: 'image/jpeg',
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName)

    return Response.json({ image_url: publicUrl })
  } catch (error) {
    console.error('Generate image error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    )
  }
}
