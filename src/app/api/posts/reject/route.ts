import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { platform_post_id } = await request.json()

    if (!platform_post_id) {
      return Response.json(
        { error: 'Missing platform_post_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('platform_posts')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', platform_post_id)

    if (error) {
      console.error('Reject error:', error)
      return Response.json({ error: 'Failed to reject post' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Reject route error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
