import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { caption, hashtags, fire_at, status, image_url } = body

    const supabase = await createClient()

    // Build platform_posts update object (only include provided fields)
    const platformUpdate: Record<string, unknown> = {}
    if (caption !== undefined) platformUpdate.caption = caption
    if (hashtags !== undefined) {
      // Accept comma-separated string or array
      platformUpdate.hashtags = Array.isArray(hashtags)
        ? hashtags
        : hashtags.split(',').map((h: string) => h.trim()).filter(Boolean)
    }
    if (fire_at !== undefined) platformUpdate.fire_at = fire_at
    if (status !== undefined) platformUpdate.status = status
    platformUpdate.updated_at = new Date().toISOString()

    if (Object.keys(platformUpdate).length > 1) {
      const { error: updateError } = await supabase
        .from('platform_posts')
        .update(platformUpdate)
        .eq('id', id)

      if (updateError) {
        console.error('Platform post update error:', updateError)
        return Response.json(
          { error: `Update failed: ${updateError.message}` },
          { status: 500 }
        )
      }
    }

    // If image_url is provided, update the parent posts table
    if (image_url !== undefined) {
      // Get the post_id from the platform_post
      const { data: platformPost } = await supabase
        .from('platform_posts')
        .select('post_id')
        .eq('id', id)
        .single()

      if (platformPost) {
        await supabase
          .from('posts')
          .update({ image_url, updated_at: new Date().toISOString() })
          .eq('id', platformPost.post_id)
      }
    }

    // Fetch and return updated row
    const { data: updated, error: fetchError } = await supabase
      .from('platform_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      return Response.json({ error: 'Failed to fetch updated post' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (error) {
    console.error('PATCH post error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
