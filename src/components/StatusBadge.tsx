'use client'

import { PlatformPostStatus } from '@/types'

const statusConfig: Record<
  PlatformPostStatus,
  { label: string; color: string; bg: string; glow?: string }
> = {
  pending: {
    label: 'Pending',
    color: '#F5A623',
    bg: 'rgba(245, 166, 35, 0.12)',
  },
  approved: {
    label: 'Approved',
    color: '#4A9EFF',
    bg: 'rgba(74, 158, 255, 0.12)',
  },
  rejected: {
    label: 'Rejected',
    color: '#FF4444',
    bg: 'rgba(255, 68, 68, 0.12)',
  },
  scheduled: {
    label: 'Scheduled',
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.12)',
  },
  posted: {
    label: 'Posted',
    color: '#00FF85',
    bg: 'rgba(0, 255, 133, 0.12)',
    glow: '0 0 12px rgba(0, 255, 133, 0.3)',
  },
}

interface StatusBadgeProps {
  status: PlatformPostStatus
  animate?: boolean
}

export default function StatusBadge({ status, animate }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`status-badge inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider uppercase ${
        animate && status === 'posted' ? 'posted-glow' : ''
      }`}
      style={{
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.color}22`,
        boxShadow: config.glow || 'none',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: config.color }}
      />
      {config.label}
    </span>
  )
}

export { statusConfig }
