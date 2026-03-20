'use client'

import { Platform } from '@/types'
import {
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
} from 'lucide-react'

const platformConfig: Record<
  Platform,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    bg: 'rgba(10, 102, 194, 0.15)',
    icon: Linkedin,
  },
  twitter: {
    label: 'Twitter',
    color: '#F0EDE8',
    bg: 'rgba(240, 237, 232, 0.1)',
    icon: Twitter,
  },
  instagram: {
    label: 'Instagram',
    color: '#E4405F',
    bg: 'rgba(228, 64, 95, 0.15)',
    icon: Instagram,
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    bg: 'rgba(24, 119, 242, 0.15)',
    icon: Facebook,
  },
}

export default function PlatformBadge({ platform }: { platform: Platform }) {
  const config = platformConfig[platform]
  const Icon = config.icon

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider uppercase"
      style={{
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.color}33`,
      }}
    >
      <Icon size={12} />
      {config.label}
    </span>
  )
}

export { platformConfig }
