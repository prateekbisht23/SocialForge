'use client'

import { useState } from 'react'
import { PlatformPost, PlatformPostStatus } from '@/types'
import PlatformBadge from './PlatformBadge'
import { X, Save, Loader2 } from 'lucide-react'

interface EditPostModalProps {
  post: PlatformPost
  onClose: () => void
  onSave: (id: string, updates: Partial<PlatformPost>) => Promise<void>
}

const statusOptions: PlatformPostStatus[] = ['pending', 'approved', 'scheduled']

export default function EditPostModal({ post, onClose, onSave }: EditPostModalProps) {
  const [caption, setCaption] = useState(post.caption || '')
  const [hashtags, setHashtags] = useState((post.hashtags || []).join(', '))
  const [status, setStatus] = useState(post.status)
  const [fireAt, setFireAt] = useState(() => {
    if (!post.fire_at) return ''
    const d = new Date(post.fire_at)
    // Format as datetime-local: YYYY-MM-DDTHH:MM
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const updates: Record<string, unknown> = {}
      if (caption !== post.caption) updates.caption = caption
      if (hashtags !== (post.hashtags || []).join(', ')) {
        updates.hashtags = hashtags.split(',').map((h) => h.trim()).filter(Boolean)
      }
      if (status !== post.status) updates.status = status
      if (fireAt) {
        const newFireAt = new Date(fireAt).toISOString()
        if (newFireAt !== post.fire_at) updates.fire_at = newFireAt
      }

      if (Object.keys(updates).length === 0) {
        onClose()
        return
      }

      await onSave(post.id, updates as Partial<PlatformPost>)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <PlatformBadge platform={post.platform} />
            <span className="font-mono text-[11px] text-muted tracking-wider uppercase">Edit Post</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Caption */}
          <div>
            <label className="font-label text-muted text-[11px] block mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm focus:border-accent/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="font-label text-muted text-[11px] block mb-1">
              Hashtags <span className="text-muted/50">(comma separated)</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="Fintech, Launch, Payments"
              className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-mono focus:border-accent/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Status */}
          <div>
            <label className="font-label text-muted text-[11px] block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PlatformPostStatus)}
              className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-mono focus:border-accent/50 focus:outline-none transition-colors appearance-none cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled time */}
          <div>
            <label className="font-label text-muted text-[11px] block mb-1">
              Scheduled Time <span className="text-muted/50">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={fireAt}
              onChange={(e) => setFireAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-mono focus:border-accent/50 focus:outline-none transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 border border-danger/30 bg-danger/5 text-danger text-[11px] font-mono">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-press w-full py-3 bg-accent text-background font-mono text-sm tracking-wider uppercase border border-accent hover:bg-accent-dim transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
