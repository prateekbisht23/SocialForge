'use client'

import { useState, useEffect } from 'react'
import { PlatformPost, PlatformPostStatus } from '@/types'
import PlatformBadge from './PlatformBadge'
import ScrollWheelTimePicker from './ui/ScrollWheelTimePicker'
import { X, Save, Loader2, Globe, Upload, Sparkles, ImageIcon, AlertTriangle } from 'lucide-react'

interface EditPostModalProps {
  post: PlatformPost
  onClose: () => void
  onSave: (id: string, updates: Partial<PlatformPost>) => Promise<void>
}

const statusOptions: PlatformPostStatus[] = ['pending', 'approved', 'scheduled']

export default function EditPostModal({ post, onClose, onSave }: EditPostModalProps) {
  const isPosted = post.status === 'posted'

  const [caption, setCaption] = useState(post.caption || '')
  const [hashtags, setHashtags] = useState((post.hashtags || []).join(', '))
  const [status, setStatus] = useState(post.status)
  const [imageUrl, setImageUrl] = useState(post.image_url || '')

  // Image replacement state
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [imageMode, setImageMode] = useState<'upload' | 'generate' | null>(null)
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Schedule date + time (unified with ScrollWheelTimePicker)
  const [schedDate, setSchedDate] = useState('')
  const [schedHours, setSchedHours] = useState(0)
  const [schedMinutes, setSchedMinutes] = useState(0)
  const [timezone, setTimezone] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Initialize schedule fields in useEffect (no new Date() at render time)
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)

    if (post.fire_at) {
      const d = new Date(post.fire_at)
      const pad = (n: number) => n.toString().padStart(2, '0')
      setSchedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
      setSchedHours(d.getHours())
      setSchedMinutes(d.getMinutes())
    } else {
      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      setSchedDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
      setSchedHours(now.getHours())
      setSchedMinutes(now.getMinutes())
    }
  }, [post.fire_at])

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      setImageUrl(data.url)
      setShowImageOptions(false)
      setImageMode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return
    setImageLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          postId: post.post_id,
          imageCount: 1,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Image generation failed')
      }
      const data = await res.json()
      setImageUrl(data.image_url)
      setShowImageOptions(false)
      setImageMode(null)
      setImagePrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image generation failed')
    } finally {
      setImageLoading(false)
    }
  }

  const handleSave = async () => {
    if (isPosted) return
    setSaving(true)
    setError('')
    try {
      const updates: Record<string, unknown> = {}
      if (caption !== post.caption) updates.caption = caption
      if (hashtags !== (post.hashtags || []).join(', ')) {
        updates.hashtags = hashtags.split(',').map((h) => h.trim()).filter(Boolean)
      }
      if (status !== post.status) updates.status = status
      if (imageUrl !== (post.image_url || '')) updates.image_url = imageUrl

      // Build fire_at from date + scroll wheel time
      if (schedDate) {
        const hh = String(schedHours).padStart(2, '0')
        const mm = String(schedMinutes).padStart(2, '0')
        const newFireAt = new Date(`${schedDate}T${hh}:${mm}:00`).toISOString()
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
            <span className="font-mono text-[11px] text-muted tracking-wider uppercase">
              {isPosted ? 'View Post' : 'Edit Post'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Posted notice */}
        {isPosted && (
          <div className="mx-5 mt-4 px-3 py-2.5 border border-amber/30 bg-amber/5 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber shrink-0 mt-0.5" />
            <span className="text-[11px] font-mono text-amber/90">
              This post has already been published and cannot be edited.
            </span>
          </div>
        )}

        <div className="px-5 py-5 space-y-4">
          {/* Image preview + replace */}
          {imageUrl && (
            <div>
              <label className="font-label text-muted text-[11px] block mb-1">Image</label>
              <div className="relative w-full aspect-video bg-surface overflow-hidden border border-border">
                <img
                  src={imageUrl}
                  alt="Post image"
                  className="w-full h-full object-cover"
                />
                {(imageLoading || uploadingImage) && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Replace image button — hidden for posted cards */}
              {!isPosted && !showImageOptions && (
                <button
                  onClick={() => setShowImageOptions(true)}
                  className="mt-2 btn-press inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-border text-muted hover:text-foreground hover:border-border-hover transition-colors cursor-pointer"
                >
                  <ImageIcon size={12} />
                  Replace Image
                </button>
              )}

              {/* Image replacement options */}
              {!isPosted && showImageOptions && !imageMode && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setImageMode('upload')}
                    className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-accent/30 text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                  >
                    <Upload size={12} />
                    Upload New
                  </button>
                  <button
                    onClick={() => setImageMode('generate')}
                    className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-purple/30 text-purple hover:bg-purple/10 transition-colors cursor-pointer"
                  >
                    <Sparkles size={12} />
                    Generate with AI
                  </button>
                  <button
                    onClick={() => setShowImageOptions(false)}
                    className="w-6 h-6 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Upload mode */}
              {!isPosted && imageMode === 'upload' && (
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadImage(file)
                    }}
                    className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:border file:border-border file:bg-surface file:text-foreground file:text-[10px] file:font-mono file:uppercase file:tracking-wider file:cursor-pointer hover:file:bg-surface/80"
                  />
                  <button
                    onClick={() => { setImageMode(null); setShowImageOptions(true) }}
                    className="mt-1 text-[10px] font-mono text-muted hover:text-foreground cursor-pointer"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Generate mode */}
              {!isPosted && imageMode === 'generate' && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe the new image..."
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm placeholder:text-muted/40 focus:border-purple/50 focus:outline-none transition-colors resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateImage}
                      disabled={imageLoading || !imagePrompt.trim()}
                      className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-purple/30 text-purple hover:bg-purple/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {imageLoading ? (
                        <><Loader2 size={12} className="animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles size={12} /> Generate</>
                      )}
                    </button>
                    <button
                      onClick={() => { setImageMode(null); setShowImageOptions(true); setImagePrompt('') }}
                      className="text-[10px] font-mono text-muted hover:text-foreground cursor-pointer"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="font-label text-muted text-[11px] block mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              readOnly={isPosted}
              className={`w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm focus:border-accent/50 focus:outline-none transition-colors resize-none ${isPosted ? 'opacity-60 cursor-not-allowed' : ''}`}
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
              readOnly={isPosted}
              className={`w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-mono focus:border-accent/50 focus:outline-none transition-colors ${isPosted ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Status */}
          <div>
            <label className="font-label text-muted text-[11px] block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PlatformPostStatus)}
              disabled={isPosted}
              className={`w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm font-mono focus:border-accent/50 focus:outline-none transition-colors appearance-none cursor-pointer ${isPosted ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={{ colorScheme: 'dark' }}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled time — ScrollWheelTimePicker (same as ScheduleModal) */}
          {!isPosted && (
            <div>
              <label className="font-label text-muted text-[11px] block mb-1">
                Scheduled Time <span className="text-muted/50">(optional)</span>
              </label>
              <input
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border text-foreground font-mono text-sm focus:border-purple focus:outline-none transition-colors mb-2"
                style={{ colorScheme: 'dark' }}
              />
              <div className="border border-border bg-background p-2">
                <ScrollWheelTimePicker
                  hours={schedHours}
                  minutes={schedMinutes}
                  onHoursChange={setSchedHours}
                  onMinutesChange={setSchedMinutes}
                />
              </div>
              <div className="mt-2 text-center font-mono text-sm text-accent">
                {String(schedHours).padStart(2, '0')}:{String(schedMinutes).padStart(2, '0')}
              </div>
              {timezone && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted mt-1">
                  <Globe size={12} />
                  {timezone}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 border border-danger/30 bg-danger/5 text-danger text-[11px] font-mono">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isPosted && (
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
        )}
      </div>
    </div>
  )
}
