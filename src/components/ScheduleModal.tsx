'use client'

import { useState, useEffect } from 'react'
import { X, CalendarDays, Globe } from 'lucide-react'
import { PlatformPost } from '@/types'
import PlatformBadge from './PlatformBadge'
import ScrollWheelTimePicker from './ui/ScrollWheelTimePicker'

interface ScheduleModalProps {
  post: PlatformPost
  onClose: () => void
  onConfirm: (postId: string, fireAt: string) => Promise<void>
}

export default function ScheduleModal({
  post,
  onClose,
  onConfirm,
}: ScheduleModalProps) {
  // All date/time values are initialized in useEffect — no new Date() at render time
  const [date, setDate] = useState('')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [loading, setLoading] = useState(false)
  const [timezone, setTimezone] = useState('')
  const [minDate, setMinDate] = useState('')

  // Initialize defaults inside useEffect (fixes SSR hydration warning)
  useEffect(() => {
    const now = new Date()
    // Default to today
    const pad = (n: number) => n.toString().padStart(2, '0')
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    setDate(todayStr)
    setMinDate(todayStr)
    // Current time rounded to nearest minute
    setHours(now.getHours())
    setMinutes(now.getMinutes())
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const handleConfirm = async () => {
    if (!date) return
    setLoading(true)
    try {
      const hh = hours.toString().padStart(2, '0')
      const mm = minutes.toString().padStart(2, '0')
      const fireAt = new Date(`${date}T${hh}:${mm}:00`).toISOString()
      await onConfirm(post.id, fireAt)
      onClose()
    } catch (err) {
      console.error('Failed to schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  // Don't render picker until defaults are loaded (prevents flash)
  if (!date) return null

  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-purple" />
            <h3 className="text-base font-semibold">Schedule Post</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Post preview */}
        <div className="px-5 py-4 border-b border-border">
          <PlatformBadge platform={post.platform} />
          <p className="mt-3 text-sm text-foreground/70 line-clamp-2">
            {post.caption}
          </p>
        </div>

        {/* Date & Time */}
        <div className="px-5 py-5 space-y-5">
          {/* Date picker */}
          <div>
            <label className="font-label text-muted block mb-2">Date</label>
            <input
              type="date"
              id="schedule-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2.5 bg-background border border-border text-foreground font-mono text-sm focus:border-purple focus:outline-none transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Scroll wheel time picker */}
          <div>
            <label className="font-label text-muted block mb-2">Time</label>
            <div className="border border-border bg-background p-2">
              <ScrollWheelTimePicker
                hours={hours}
                minutes={minutes}
                onHoursChange={setHours}
                onMinutesChange={setMinutes}
              />
            </div>
            <div className="mt-2 text-center font-mono text-sm text-accent">
              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </div>
          </div>

          {/* Timezone */}
          {timezone && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
              <Globe size={12} />
              {timezone}
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="px-5 pb-5">
          <button
            id="confirm-schedule"
            onClick={handleConfirm}
            disabled={loading}
            className="btn-press w-full py-3 bg-purple text-white font-mono text-sm tracking-wider uppercase border border-purple/30 hover:bg-purple-dim transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Scheduling...' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
