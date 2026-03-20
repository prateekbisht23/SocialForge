'use client'

import { useState } from 'react'
import { X, CalendarDays, Clock, Globe } from 'lucide-react'
import { PlatformPost } from '@/types'
import PlatformBadge from './PlatformBadge'

interface ScheduleModalProps {
  post: PlatformPost
  onClose: () => void
  onConfirm: (postId: string, fireAt: string) => Promise<void>
}

function generateTimeSlots() {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0')
      const mm = m.toString().padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }
  }
  return slots
}

const timeSlots = generateTimeSlots()

export default function ScheduleModal({
  post,
  onClose,
  onConfirm,
}: ScheduleModalProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('09:00')
  const [loading, setLoading] = useState(false)
  const minDate = defaultDate // stable, no new Date() in render
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const fireAt = new Date(`${date}T${time}:00`).toISOString()
      await onConfirm(post.id, fireAt)
      onClose()
    } catch (err) {
      console.error('Failed to schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-end sm:items-center justify-center p-4">
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
        <div className="px-5 py-5 space-y-4">
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
            />
          </div>

          {/* Time picker */}
          <div>
            <label className="font-label text-muted block mb-2">
              <Clock size={12} className="inline mr-1" />
              Time
            </label>
            <select
              id="schedule-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border text-foreground font-mono text-sm focus:border-purple focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
            <Globe size={12} />
            {timezone}
          </div>
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
