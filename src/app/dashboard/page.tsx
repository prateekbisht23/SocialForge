'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PlatformPost, PlatformPostStatus, Platform } from '@/types'
import StatsRow from '@/components/StatsRow'
import FilterBar from '@/components/FilterBar'
import PlatformPostCard from '@/components/PlatformPostCard'
import ScheduleModal from '@/components/ScheduleModal'
import ViewPostModal from '@/components/ViewPostModal'
import EditPostModal from '@/components/EditPostModal'
import { Plus, Activity } from 'lucide-react'

export default function DashboardPage() {
  const [posts, setPosts] = useState<PlatformPost[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PlatformPostStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [schedulePost, setSchedulePost] = useState<PlatformPost | null>(null)
  const [viewPost, setViewPost] = useState<PlatformPost | null>(null)
  const [editPost, setEditPost] = useState<PlatformPost | null>(null)
  const [animatedPostIds, setAnimatedPostIds] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('platform_posts')
      .select(`
        *,
        posts (
          topic,
          tone,
          image_url,
          user_id
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
    } else {
      setPosts((data as PlatformPost[]) || [])
    }
    setLoading(false)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('platform_posts_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'platform_posts',
        },
        (payload) => {
          const updated = payload.new as PlatformPost
          setPosts((prev) =>
            prev.map((p) =>
              p.id === updated.id ? { ...p, ...updated } : p
            )
          )

          if (updated.status === 'posted') {
            setAnimatedPostIds((prev) => new Set(prev).add(updated.id))
            setTimeout(() => {
              setAnimatedPostIds((prev) => {
                const next = new Set(prev)
                next.delete(updated.id)
                return next
              })
            }, 2000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_posts',
        },
        () => {
          fetchPosts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPosts])

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    return true
  })

  // Stats
  const totalPosts = posts.length
  const pendingCount = posts.filter((p) => p.status === 'pending').length
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length
  const postedCount = posts.filter((p) => p.status === 'posted').length

  // Actions
  const handleApprove = async (id: string) => {
    const res = await fetch('/api/posts/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: id }),
    })
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'approved' as const } : p))
      )
    }
  }

  const handleReject = async (id: string) => {
    const res = await fetch('/api/posts/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: id }),
    })
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'rejected' as const } : p))
      )
    }
  }

  const handleSchedule = (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (post) setSchedulePost(post)
  }

  const handleConfirmSchedule = async (postId: string, fireAt: string) => {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: postId, fire_at: fireAt }),
    })
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, status: 'scheduled' as const, fire_at: fireAt }
            : p
        )
      )
    }
  }

  const handleCancelSchedule = async (id: string) => {
    const res = await fetch('/api/posts/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: id }),
    })
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: 'approved' as const, fire_at: null }
            : p
        )
      )
    }
  }

  const handleRestore = async (id: string) => {
    const res = await fetch('/api/posts/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: id }),
    })
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'pending' as const } : p))
      )
    }
  }

  const handleView = (post: PlatformPost) => {
    setViewPost(post)
  }

  const handleEdit = (post: PlatformPost) => {
    setEditPost(post)
  }

  const handleSaveEdit = async (id: string, updates: Partial<PlatformPost>) => {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Save failed')
    }
    const updated = await res.json()
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">
              Social<span className="text-accent">Forge</span>
            </span>
            <span className="hidden sm:inline font-mono text-[10px] text-muted tracking-wider uppercase px-2 py-0.5 border border-border">
              Dashboard
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/logs"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-muted tracking-wider uppercase border border-border hover:text-foreground hover:border-border-hover transition-colors"
            >
              <Activity size={12} />
              Logs
            </Link>
            <Link
              href="/generate"
              id="new-post-button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-background text-[11px] font-mono tracking-wider uppercase border border-accent hover:bg-accent-dim transition-colors"
            >
              <Plus size={14} />
              New Post
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <StatsRow
          totalPosts={totalPosts}
          pendingCount={pendingCount}
          scheduledCount={scheduledCount}
          postedCount={postedCount}
        />

        {/* Filters */}
        <FilterBar
          statusFilter={statusFilter}
          platformFilter={platformFilter}
          onStatusChange={setStatusFilter}
          onPlatformChange={setPlatformFilter}
        />

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-80 shimmer" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-surface border border-border mb-4">
              <Plus size={24} className="text-muted" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No posts found</h3>
            <p className="text-sm text-muted mb-6">
              {statusFilter !== 'all' || platformFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Generate your first piece of content to get started.'}
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-background text-[11px] font-mono tracking-wider uppercase border border-accent hover:bg-accent-dim transition-colors"
            >
              <Plus size={14} />
              Generate Content
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filteredPosts.map((post) => (
              <PlatformPostCard
                key={post.id}
                post={post}
                onApprove={handleApprove}
                onReject={handleReject}
                onSchedule={handleSchedule}
                onCancelSchedule={handleCancelSchedule}
                onRestore={handleRestore}
                onView={handleView}
                onEdit={handleEdit}
                animateStatus={animatedPostIds.has(post.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Schedule Modal */}
      {schedulePost && (
        <ScheduleModal
          post={schedulePost}
          onClose={() => setSchedulePost(null)}
          onConfirm={handleConfirmSchedule}
        />
      )}

      {/* View Modal */}
      {viewPost && (
        <ViewPostModal
          post={viewPost}
          onClose={() => setViewPost(null)}
          onEdit={(p) => {
            setViewPost(null)
            setEditPost(p)
          }}
        />
      )}

      {/* Edit Modal */}
      {editPost && (
        <EditPostModal
          post={editPost}
          onClose={() => setEditPost(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
