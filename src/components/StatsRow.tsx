'use client'

import { useEffect, useRef } from 'react'
import {
  BarChart3,
  Clock,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react'

interface StatsRowProps {
  totalPosts: number
  pendingCount: number
  scheduledCount: number
  postedCount: number
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prevValue.current !== value && ref.current) {
      ref.current.classList.remove('animate-number-tick')
      // Force reflow
      void ref.current.offsetWidth
      ref.current.classList.add('animate-number-tick')
    }
    prevValue.current = value
  }, [value])

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  )
}

const stats = [
  {
    key: 'total',
    label: 'Total Generated',
    icon: BarChart3,
    color: '#F0EDE8',
    getValue: (p: StatsRowProps) => p.totalPosts,
  },
  {
    key: 'pending',
    label: 'Pending Approval',
    icon: Clock,
    color: '#F5A623',
    getValue: (p: StatsRowProps) => p.pendingCount,
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    icon: CalendarCheck,
    color: '#A855F7',
    getValue: (p: StatsRowProps) => p.scheduledCount,
  },
  {
    key: 'posted',
    label: 'Posted',
    icon: CheckCircle2,
    color: '#00FF85',
    getValue: (p: StatsRowProps) => p.postedCount,
  },
]

export default function StatsRow(props: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.key}
            id={`stat-${stat.key}`}
            className="card px-5 py-4 flex items-center gap-4"
          >
            <div
              className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{
                background: `${stat.color}10`,
                border: `1px solid ${stat.color}22`,
              }}
            >
              <Icon size={18} style={{ color: stat.color }} />
            </div>
            <div className="min-w-0">
              <div
                className="text-2xl font-bold font-mono tracking-tight"
                style={{ color: stat.color }}
              >
                <AnimatedNumber value={stat.getValue(props)} />
              </div>
              <div className="font-label text-muted truncate">
                {stat.label}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
