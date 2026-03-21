import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Soft delete — only set is_deleted = true on this specific platform_post
    const { error } = await supabase
      .from('platform_posts')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Soft delete error:', error)
      return Response.json({ error: `Delete failed: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete route error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
