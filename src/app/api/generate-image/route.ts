import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(request: NextRequest) {
  try {
    const { prompt, postId, imageCount: rawImageCount } = await request.json()

    if (!prompt || !postId) {
      return Response.json({ error: 'prompt and postId are required' }, { status: 400 })
    }

    // Validate and clamp imageCount (1-4)
    const imageCount = Math.max(1, Math.min(4, Number(rawImageCount) || 1))

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
        num_images: imageCount,
      }),
    })

    if (createRes.status === 429) {
      throw new Error('Freepik rate limit hit. Please wait a moment and try again.')
    }

    if (!createRes.ok) {
      const errText = await createRes.text()
      throw new Error(`Freepik API error ${createRes.status}: ${errText}`)
    }

    const createData = await createRes.json()
    const taskId = createData?.data?.task_id

    if (!taskId) {
      console.error('No task_id in Freepik response:', createData)
      return Response.json({ error: 'Failed to get task_id from Freepik' }, { status: 500 })
    }

    // Step B: Poll for completion with exponential backoff + 429 handling
    const MAX_ATTEMPTS = 12
    const BASE_DELAY = 5000
    let generatedImages: { url: string }[] = []
    let attempts = 0

    while (attempts < MAX_ATTEMPTS) {
      // Calculate delay
      const delay = attempts < 2
        ? BASE_DELAY
        : Math.min(BASE_DELAY * Math.pow(1.3, attempts - 2), 15000)

      await sleep(delay)

      const pollRes = await fetch(`https://api.freepik.com/v1/ai/mystic/${taskId}`, {
        headers: { 'x-freepik-api-key': apiKey },
      })

      if (pollRes.status === 429) {
        const retryAfter = Number(pollRes.headers.get('retry-after') || '10') * 1000 || 10000
        console.log(`Freepik poll 429 — sleeping ${retryAfter}ms (retry-after)`)
        await sleep(retryAfter)
        // Do NOT increment attempts on 429
        continue
      }

      if (!pollRes.ok) {
        throw new Error(`Freepik poll error: ${pollRes.status}`)
      }

      const pollData = await pollRes.json()
      const status = pollData?.data?.status

      console.log(`Freepik poll attempt ${attempts}: status = ${status}`)

      if (status === 'COMPLETED') {
        generatedImages = pollData?.data?.generated || []
        break
      }

      if (status === 'FAILED') {
        throw new Error('Freepik image generation failed')
      }

      // IN_PROGRESS or other statuses → continue
      attempts++
    }

    if (generatedImages.length === 0) {
      throw new Error('Freepik image generation timed out')
    }

    // Step C: Upload all generated images to Supabase Storage
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const uploadedUrls: string[] = []

    for (let i = 0; i < generatedImages.length; i++) {
      const imgUrl = generatedImages[i].url
      if (!imgUrl) continue

      const imageRes = await fetch(imgUrl)
      const imageBuffer = await imageRes.arrayBuffer()

      const fileName = `${postId}_${i}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, Buffer.from(imageBuffer), {
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        console.error(`Supabase upload error for image ${i}:`, uploadError)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    if (uploadedUrls.length === 0) {
      return Response.json({ error: 'All image uploads failed' }, { status: 500 })
    }

    // Return array of URLs (backwards-compatible: also set image_url to first)
    return Response.json({
      image_url: uploadedUrls[0],
      image_urls: uploadedUrls,
    })
  } catch (error) {
    console.error('Generate image error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    )
  }
}
