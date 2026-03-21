'use client'

import { PlatformPostStatus, Platform } from '@/types'
import { X } from 'lucide-react'

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

const sortOptions: { value: 'newest' | 'oldest'; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
]

const contentTypeOptions: { value: 'all' | 'post' | 'ad'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'post', label: 'Post' },
  { value: 'ad', label: 'Ad' },
]

interface FilterBarProps {
  statusFilter: PlatformPostStatus | 'all'
  platformFilter: Platform | 'all'
  sortOrder: 'newest' | 'oldest'
  contentTypeFilter: 'all' | 'post' | 'ad'
  onStatusChange: (status: PlatformPostStatus | 'all') => void
  onPlatformChange: (platform: Platform | 'all') => void
  onSortChange: (sort: 'newest' | 'oldest') => void
  onContentTypeChange: (type: 'all' | 'post' | 'ad') => void
  hasActiveFilters: boolean
  onClearAll: () => void
  filteredCount: number
}

export default function FilterBar({
  statusFilter,
  platformFilter,
  sortOrder,
  contentTypeFilter,
  onStatusChange,
  onPlatformChange,
  onSortChange,
  onContentTypeChange,
  hasActiveFilters,
  onClearAll,
  filteredCount,
}: FilterBarProps) {
  const btnBase =
    'btn-press px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase border transition-all duration-200 cursor-pointer'
  const btnActive = 'bg-accent/10 border-accent/30 text-accent'
  const btnInactive =
    'bg-transparent border-border text-muted hover:text-foreground hover:border-border-hover'

  return (
    <div className="space-y-3">
      {/* Filter rows — horizontally scrollable on mobile */}
      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {/* Sort */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-label text-muted mr-1">Sort</span>
          {sortOptions.map((s) => (
            <button
              key={s.value}
              id={`filter-sort-${s.value}`}
              onClick={() => onSortChange(s.value)}
              className={`${btnBase} ${sortOrder === s.value ? btnActive : btnInactive}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-border self-center shrink-0" />

        {/* Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-label text-muted mr-1">Status</span>
          <div className="flex flex-wrap gap-1">
            {allStatuses.map((s) => (
              <button
                key={s.value}
                id={`filter-status-${s.value}`}
                onClick={() => onStatusChange(s.value)}
                className={`${btnBase} ${
                  statusFilter === s.value
                    ? s.value === 'all'
                      ? 'bg-foreground/10 border-foreground/30 text-foreground'
                      : btnActive
                    : btnInactive
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-border self-center shrink-0" />

        {/* Platform */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-label text-muted mr-1">Platform</span>
          <div className="flex flex-wrap gap-1">
            {allPlatforms.map((p) => (
              <button
                key={p.value}
                id={`filter-platform-${p.value}`}
                onClick={() => onPlatformChange(p.value)}
                className={`${btnBase} ${
                  platformFilter === p.value
                    ? p.value === 'all'
                      ? 'bg-foreground/10 border-foreground/30 text-foreground'
                      : btnActive
                    : btnInactive
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-border self-center shrink-0" />

        {/* Content Type */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-label text-muted mr-1">Type</span>
          {contentTypeOptions.map((t) => (
            <button
              key={t.value}
              id={`filter-type-${t.value}`}
              onClick={() => onContentTypeChange(t.value)}
              className={`${btnBase} ${
                contentTypeFilter === t.value
                  ? t.value === 'all'
                    ? 'bg-foreground/10 border-foreground/30 text-foreground'
                    : btnActive
                  : btnInactive
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear all + count */}
      {hasActiveFilters && (
        <div className="flex items-center gap-3 animate-fade-in">
          <button
            id="clear-all-filters"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono tracking-wider uppercase text-danger border border-danger/20 hover:bg-danger/10 transition-colors cursor-pointer"
          >
            <X size={10} />
            Clear All
          </button>
          <span className="text-[10px] font-mono text-muted tracking-wider uppercase">
            Showing {filteredCount} posts
          </span>
        </div>
      )}
    </div>
  )
}
