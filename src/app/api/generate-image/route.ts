import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(request: NextRequest) {
  try {
    const { prompt, postId, imageCount: rawImageCount } = await request.json()

    if (!prompt || !postId) {
      return NextResponse.json({ error: 'prompt and postId are required' }, { status: 400 })
    }

    // Validate and clamp imageCount (1-4)
    const imageCount = Math.max(1, Math.min(4, Number(rawImageCount) || 1))

    const apiKey = process.env.FREEPIK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'FREEPIK_API_KEY not configured' }, { status: 500 })
    }

    // Build enhanced Freepik prompt — wrap agent image_prompt with style context
    const freepikPrompt = `${prompt}
Additional style requirements: photorealistic render quality, 8K resolution aesthetic, cinematic lighting, premium brand feel consistent with Bloomberg or McKinsey visual standards.
Color palette: deep navy #0A1628, charcoal #1A1A2E, electric blue #0066FF, cyan accent #00D4FF, white text elements.`.trim()

    // Step A: Submit generation task
    const createRes = await fetch('https://api.freepik.com/v1/ai/mystic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt: freepikPrompt,
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
      return NextResponse.json({ error: 'Failed to get task_id from Freepik' }, { status: 500 })
    }

    // Step B: Poll for completion with exponential backoff + 429 handling
    const MAX_ATTEMPTS = 12
    const BASE_DELAY = 5000
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let generatedImages: any[] = []
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
        console.log('Freepik completed response:', JSON.stringify(pollData, null, 2))
        generatedImages = pollData.data?.generated ?? []
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
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const results: string[] = []

    for (let i = 0; i < generatedImages.length; i++) {
      try {
        // generatedImages[i] is a plain string URL, not an object
        const imageUrl = typeof generatedImages[i] === 'string'
          ? generatedImages[i]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (generatedImages[i] as any).url ?? (generatedImages[i] as any).base64

        if (!imageUrl) throw new Error('No image URL found in Freepik response')

        let buffer: Buffer

        if (imageUrl.startsWith('data:') || !imageUrl.startsWith('http')) {
          // base64 string
          const base64 = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl
          buffer = Buffer.from(base64, 'base64')
        } else {
          // regular URL — fetch it
          const imageRes = await fetch(imageUrl)
          if (!imageRes.ok) throw new Error(`CDN fetch failed: ${imageRes.status}`)
          buffer = Buffer.from(await imageRes.arrayBuffer())
        }

        console.log(`Image ${i} buffer size:`, buffer.byteLength)

        const filePath = `${postId}_${i}.jpg`
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await supabaseAdmin.storage
          .from('post-images')
          .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: true })

        if (error) throw new Error(`Supabase upload failed: ${error.message}`)

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('post-images')
          .getPublicUrl(filePath)

        results.push(publicUrl)
        console.log(`Image ${i} uploaded successfully:`, publicUrl)

      } catch (err) {
        console.error(`Image ${i} failed:`, err)
      }
    }

    if (results.length === 0) {
      throw new Error('All image uploads failed')
    }

    return NextResponse.json({ image_url: results[0], image_urls: results })
  } catch (error) {
    console.error('Generate image error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    )
  }
}
