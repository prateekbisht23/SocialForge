import { NextRequest } from 'next/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { platform_post_id } = await request.json()

    if (!platform_post_id) {
      return Response.json(
        { error: 'Missing platform_post_id' },
        { status: 400 }
      )
    }

    // Use service role key for webhook routes (called by n8n)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update platform post to posted
    const { error: updateError } = await supabase
      .from('platform_posts')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', platform_post_id)

    if (updateError) {
      console.error('Webhook update error:', updateError)
      return Response.json(
        { error: 'Failed to update post status' },
        { status: 500 }
      )
    }

    // Update schedule status
    await supabase
      .from('schedules')
      .update({
        status: 'triggered',
        triggered_at: new Date().toISOString(),
      })
      .eq('platform_post_id', platform_post_id)
      .eq('status', 'pending')

    return Response.json({ success: true })
  } catch (error) {
    console.error('Webhook posted error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
