import { NextRequest } from 'next/server'
import { generateWithClaude } from '@/lib/claude'
import { stripMarkdown } from '@/lib/stripMarkdown'
import { createClient } from '@/lib/supabase/server'
import { Platform } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      post_id,
      content_type,
      topic,
      tone,
      custom_tone,
      brand_voice_text,
      platforms,
      brand_context,
      image_url,
      image_urls,
      brand_reference_images,
      creativity: rawCreativity,
    }: {
      post_id: string
      content_type: 'post' | 'ad'
      topic: string
      tone: string
      custom_tone?: string | null
      brand_voice_text?: string | null
      platforms: Platform[]
      brand_context?: string
      image_url?: string | null
      image_urls?: string[] | null
      brand_reference_images?: string[] | null
      creativity?: number | null
    } = body

    if (!topic || !tone || !platforms?.length) {
      return Response.json(
        { error: 'Missing required fields: topic, tone, platforms' },
        { status: 400 }
      )
    }

    // Validate and clamp creativity (0.0-1.0)
    const creativity = Math.max(0, Math.min(1, Number(rawCreativity ?? 0.5)))

    const startTime = Date.now()

    // Generate content with AI Agent
    const result = await generateWithClaude({
      content_type: content_type || 'post',
      topic,
      tone,
      custom_tone: custom_tone || undefined,
      brand_voice_text: brand_voice_text || undefined,
      platforms,
      brand_context,
      image_url,
      brand_reference_images: brand_reference_images || undefined,
      creativity,
    })

    const latency = Date.now() - startTime

    // Strip any markdown that slipped through the pipeline
    for (const platform of Object.keys(result)) {
      if (result[platform]?.caption) {
        result[platform].caption = stripMarkdown(result[platform].caption)
      }
    }

    // Save to Supabase
    const supabase = await createClient()

    // Create parent post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        id: post_id,
        topic,
        tone: tone.toLowerCase(),
        content_type: content_type || 'post',
        custom_tone: custom_tone || null,
        brand_voice_text: brand_voice_text || null,
        image_url: image_url || null,
        image_urls: image_urls || [],
        brand_reference_images: brand_reference_images || null,
        platforms,
        creativity,
        status: 'draft',
      })
      .select()
      .single()

    if (postError) {
      console.error('Post insert error:', postError)
      return Response.json(
        { error: 'Failed to create post record' },
        { status: 500 }
      )
    }

    // Create platform posts — include image_urls for carousel
    const primaryImageUrl = image_url || (image_urls && image_urls.length > 0 ? image_urls[0] : null)
    const allImageUrls = image_urls || (primaryImageUrl ? [primaryImageUrl] : [])

    const platformPosts = platforms.map((platform) => {
      const content = result[platform]
      return {
        post_id: post.id,
        platform,
        caption: content?.caption || '',
        hashtags: content?.hashtags || [],
        image_url: primaryImageUrl,
        image_urls: allImageUrls,
        image_prompt: content?.image_prompt || null,
        status: 'pending' as const,
      }
    })

    const { data: insertedPosts, error: platformError } = await supabase
      .from('platform_posts')
      .insert(platformPosts)
      .select()

    if (platformError) {
      console.error('Platform posts insert error:', platformError)
      return Response.json(
        { error: 'Failed to create platform posts' },
        { status: 500 }
      )
    }

    // Log the generation
    await supabase.from('generation_logs').insert({
      post_id: post.id,
      prompt: `Topic: ${topic}, Tone: ${tone}, Type: ${content_type}, Creativity: ${creativity}, Platforms: ${platforms.join(', ')}`,
      response: result,
      latency_ms: latency,
      status: 'success',
    })

    return Response.json({
      post_id: post.id,
      platform_posts: insertedPosts,
      platform_contents: result,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
