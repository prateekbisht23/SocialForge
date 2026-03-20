'use client'

import { PlatformPostStatus, Platform } from '@/types'

const allStatuses: { value: PlatformPostStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'posted', label: 'Posted' },
  { value: 'rejected', label: 'Rejected' },
]

const allPlatforms: { value: Platform | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
]

interface FilterBarProps {
  statusFilter: PlatformPostStatus | 'all'
  platformFilter: Platform | 'all'
  onStatusChange: (status: PlatformPostStatus | 'all') => void
  onPlatformChange: (platform: Platform | 'all') => void
}

export default function FilterBar({
  statusFilter,
  platformFilter,
  onStatusChange,
  onPlatformChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex items-center gap-1.5">
        <span className="font-label text-muted mr-2">Status</span>
        <div className="flex flex-wrap gap-1">
          {allStatuses.map((s) => (
            <button
              key={s.value}
              id={`filter-status-${s.value}`}
              onClick={() => onStatusChange(s.value)}
              className={`btn-press px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase border transition-all duration-200 cursor-pointer ${
                statusFilter === s.value
                  ? 'bg-foreground/10 border-foreground/30 text-foreground'
                  : 'bg-transparent border-border text-muted hover:text-foreground hover:border-border-hover'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden sm:block w-px h-6 bg-border" />

      <div className="flex items-center gap-1.5">
        <span className="font-label text-muted mr-2">Platform</span>
        <div className="flex flex-wrap gap-1">
          {allPlatforms.map((p) => (
            <button
              key={p.value}
              id={`filter-platform-${p.value}`}
              onClick={() => onPlatformChange(p.value)}
              className={`btn-press px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase border transition-all duration-200 cursor-pointer ${
                platformFilter === p.value
                  ? 'bg-foreground/10 border-foreground/30 text-foreground'
                  : 'bg-transparent border-border text-muted hover:text-foreground hover:border-border-hover'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
