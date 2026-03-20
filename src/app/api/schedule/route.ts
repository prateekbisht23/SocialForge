import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { platform_post_id, fire_at } = await request.json()

    if (!platform_post_id || !fire_at) {
      return Response.json(
        { error: 'Missing platform_post_id or fire_at' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create schedule entry
    const { error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        platform_post_id,
        fire_at,
        status: 'pending',
      })

    if (scheduleError) {
      console.error('Schedule insert error:', scheduleError)
      return Response.json(
        { error: 'Failed to create schedule' },
        { status: 500 }
      )
    }

    // Update platform post status
    const { error: updateError } = await supabase
      .from('platform_posts')
      .update({
        status: 'scheduled',
        fire_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', platform_post_id)

    if (updateError) {
      console.error('Post update error:', updateError)
      return Response.json(
        { error: 'Failed to update post status' },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Schedule route error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
