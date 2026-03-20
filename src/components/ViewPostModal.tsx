'use client'

import { PlatformPost } from '@/types'
import PlatformBadge from './PlatformBadge'
import StatusBadge from './StatusBadge'
import { X, CalendarDays, ImageIcon, Pencil } from 'lucide-react'

interface ViewPostModalProps {
  post: PlatformPost
  onClose: () => void
  onEdit: (post: PlatformPost) => void
}

export default function ViewPostModal({ post, onClose, onEdit }: ViewPostModalProps) {
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
            <StatusBadge status={post.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEdit(post) }}
              className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent transition-colors cursor-pointer"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image */}
        {post.image_url ? (
          <div className="w-full aspect-video bg-surface overflow-hidden">
            <img
              src={post.image_url}
              alt={`${post.platform} post`}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-surface/50 flex items-center justify-center border-b border-border">
            <ImageIcon size={32} className="text-muted/30" />
          </div>
        )}

        {/* Caption */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="font-label text-muted text-[11px] block mb-1">Caption</label>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
              {post.caption}
            </p>
          </div>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div>
              <label className="font-label text-muted text-[11px] block mb-1">Hashtags</label>
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] font-mono tracking-wider text-accent/70 bg-accent/5 border border-accent/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled time */}
          {post.fire_at && (
            <div>
              <label className="font-label text-muted text-[11px] block mb-1">Scheduled For</label>
              <div className="flex items-center gap-2 text-sm font-mono text-purple">
                <CalendarDays size={14} />
                {new Date(post.fire_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
