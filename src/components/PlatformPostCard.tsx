'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PlatformPost, PlatformPostStatus } from '@/types'
import { stripMarkdown } from '@/lib/stripMarkdown'
import PlatformBadge from './PlatformBadge'
import StatusBadge from './StatusBadge'
import {
  Check,
  X,
  CalendarDays,
  Eye,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Pencil,
  Trash2,
} from 'lucide-react'

interface PlatformPostCardProps {
  post: PlatformPost
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onSchedule?: (id: string) => void
  onCancelSchedule?: (id: string) => void
  onRestore?: (id: string) => void
  onView?: (post: PlatformPost) => void
  onEdit?: (post: PlatformPost) => void
  onDelete?: (post: PlatformPost) => void
  animateStatus?: boolean
}

export default function PlatformPostCard({
  post,
  onApprove,
  onReject,
  onSchedule,
  onCancelSchedule,
  onRestore,
  onView,
  onEdit,
  onDelete,
  animateStatus,
}: PlatformPostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Delete auto-dismiss timer
  useEffect(() => {
    if (showDeleteConfirm) {
      deleteTimerRef.current = setTimeout(() => {
        setShowDeleteConfirm(false)
      }, 3000)
      return () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
      }
    }
  }, [showDeleteConfirm])

  // Lightbox: close on Escape + lock body scroll
  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, closeLightbox])

  const handleDeleteConfirm = () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setShowDeleteConfirm(false)
    onDelete?.(post)
  }

  const handleDeleteCancel = () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setShowDeleteConfirm(false)
  }

  const handleAction = async (
    action: string,
    handler?: (id: string) => void
  ) => {
    if (!handler) return
    setActionLoading(action)
    try {
      await handler(post.id)
    } finally {
      setActionLoading(null)
    }
  }

  // Strip markdown from caption before rendering (catches old DB content too)
  const cleanCaption = post.caption ? stripMarkdown(post.caption) : ''
  const captionLines = cleanCaption.split('\n')
  const isLong = captionLines.length > 3 || cleanCaption.length > 200
  const displayCaption = expanded
    ? cleanCaption
    : cleanCaption.slice(0, 200)

  const isPosted = post.status === 'posted'

  return (
    <div className="card h-full flex flex-col overflow-hidden animate-fade-in">
      {/* Header row */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0">
        <PlatformBadge platform={post.platform} />
        <div className="flex items-center gap-2">
          {/* Edit icon — NOT rendered for posted cards */}
          {onEdit && !isPosted && (
            <button
              onClick={() => onEdit(post)}
              className="w-6 h-6 flex items-center justify-center text-muted hover:text-accent transition-colors cursor-pointer"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
          )}
          {/* Delete — always visible */}
          {onDelete && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1 animate-fade-in">
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteCancel}
                    className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-surface border border-border text-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-6 h-6 flex items-center justify-center text-muted hover:text-danger transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </>
          )}
          <StatusBadge status={post.status} animate={animateStatus} />
        </div>
      </div>

      {/* Image */}
      {post.image_url && !imageError ? (
        <div className="relative w-full aspect-video bg-surface overflow-hidden mx-0 shrink-0 border-y border-border group">
          <img
            src={post.image_url}
            alt={`${post.platform} post image`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          {/* Eye icon — view full image */}
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            title="View full image"
          >
            <Eye size={14} />
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-video bg-surface/50 flex flex-col items-center justify-center border-y border-border shrink-0">
          <ImageIcon size={32} className="text-muted/30 mb-2" />
          {imageError && (
            <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider">
              Image unavailable
            </span>
          )}
        </div>
      )}

      {/* Caption */}
      <div className="px-4 py-3 flex-1">
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
          {displayCaption}
          {!expanded && isLong && (
            <span className="text-muted">...</span>
          )}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-muted hover:text-foreground mt-1 transition-colors cursor-pointer"
          >
            {expanded ? (
              <>
                Show less <ChevronUp size={12} />
              </>
            ) : (
              <>
                Show more <ChevronDown size={12} />
              </>
            )}
          </button>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-mono tracking-wider text-accent/70 bg-accent/5 border border-accent/10"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Schedule time */}
        {post.fire_at && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-purple">
            <CalendarDays size={12} />
            {new Date(post.fire_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="h-14 px-4 border-t border-border flex items-center gap-2 shrink-0">
        {renderActions(
          post.status,
          actionLoading,
          handleAction,
          onApprove,
          onReject,
          onSchedule,
          onCancelSchedule,
          onRestore,
          onView,
          post
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && post.image_url && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all cursor-pointer z-10"
          >
            <X size={20} />
          </button>
          <img
            src={post.image_url}
            alt={`${post.platform} post full image`}
            className="max-w-4xl w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function renderActions(
  status: PlatformPostStatus,
  actionLoading: string | null,
  handleAction: (action: string, handler?: (id: string) => void) => void,
  onApprove?: (id: string) => void,
  onReject?: (id: string) => void,
  onSchedule?: (id: string) => void,
  onCancelSchedule?: (id: string) => void,
  onRestore?: (id: string) => void,
  onView?: (post: PlatformPost) => void,
  post?: PlatformPost
) {
  const btnBase =
    'btn-press inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono tracking-wider uppercase border transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

  switch (status) {
    case 'pending':
      return (
        <>
          <button
            id="action-approve"
            className={`${btnBase} border-accent/30 text-accent hover:bg-accent/10`}
            onClick={() => handleAction('approve', onApprove)}
            disabled={actionLoading === 'approve'}
          >
            <Check size={12} />
            {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
          </button>
          <button
            id="action-reject"
            className={`${btnBase} border-danger/30 text-danger hover:bg-danger/10`}
            onClick={() => handleAction('reject', onReject)}
            disabled={actionLoading === 'reject'}
          >
            <X size={12} />
            {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
        </>
      )
    case 'approved':
      return (
        <button
          id="action-schedule"
          className={`${btnBase} border-purple/30 text-purple hover:bg-purple/10`}
          onClick={() => handleAction('schedule', onSchedule)}
          disabled={actionLoading === 'schedule'}
        >
          <CalendarDays size={12} />
          Schedule
        </button>
      )
    case 'scheduled':
      return (
        <>
          <button
            id="action-view-scheduled"
            className={`${btnBase} border-border text-muted hover:text-foreground`}
            onClick={() => onView && post && onView(post)}
          >
            <Eye size={12} />
            View
          </button>
          <button
            id="action-cancel-schedule"
            className={`${btnBase} border-danger/30 text-danger hover:bg-danger/10`}
            onClick={() => handleAction('cancel', onCancelSchedule)}
            disabled={actionLoading === 'cancel'}
          >
            <XCircle size={12} />
            Cancel
          </button>
        </>
      )
    case 'posted':
      return (
        <div className="flex items-center gap-2 text-[11px] font-mono text-accent">
          <Check size={12} />
          Posted
          {post?.posted_at && (
            <span className="text-muted">
              · {new Date(post.posted_at).toLocaleString()}
            </span>
          )}
        </div>
      )
    case 'rejected':
      return (
        <button
          id="action-restore"
          className={`${btnBase} border-amber/30 text-amber hover:bg-amber/10`}
          onClick={() => handleAction('restore', onRestore)}
          disabled={actionLoading === 'restore'}
        >
          <RotateCcw size={12} />
          {actionLoading === 'restore' ? 'Restoring...' : 'Restore'}
        </button>
      )
    default:
      return null
  }
}
