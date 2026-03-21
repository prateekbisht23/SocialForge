'use client'

import { useRef, useEffect, useCallback } from 'react'

const ITEM_HEIGHT = 40
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS // 200px

interface WheelColumnProps {
  items: string[]
  value: number
  onChange: (val: number) => void
  label: string
  wrap: number // modulus for wrapping (24 for hours, 60 for minutes)
}

function WheelColumn({ items, value, onChange, label, wrap }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const animFrame = useRef<number>(0)
  const currentOffset = useRef(0)

  const count = items.length
  const getOffset = useCallback((val: number) => -val * ITEM_HEIGHT, [])

  // Animate to a target index with eased cubic out
  const animateTo = useCallback((targetIndex: number) => {
    cancelAnimationFrame(animFrame.current)
    const targetOffset = getOffset(targetIndex)
    const startOffset = currentOffset.current
    const distance = targetOffset - startOffset

    if (Math.abs(distance) < 1) {
      currentOffset.current = targetOffset
      onChange(targetIndex)
      updateVisuals()
      return
    }

    const duration = 200
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      currentOffset.current = startOffset + distance * eased
      updateVisuals()

      if (progress < 1) {
        animFrame.current = requestAnimationFrame(tick)
      } else {
        currentOffset.current = targetOffset
        onChange(targetIndex)
        updateVisuals()
      }
    }

    animFrame.current = requestAnimationFrame(tick)
  }, [getOffset, onChange])

  function updateVisuals() {
    const container = containerRef.current
    if (!container) return

    const children = container.children
    const centerVal = -currentOffset.current / ITEM_HEIGHT

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const itemIndex = Number(child.dataset.index)

      let diff = itemIndex - centerVal
      if (diff > count / 2) diff -= count
      if (diff < -count / 2) diff += count

      const y = (diff * ITEM_HEIGHT) + (WHEEL_HEIGHT / 2) - (ITEM_HEIGHT / 2)
      const absDiff = Math.abs(diff)

      child.style.transform = `translateY(${y}px)`
      child.style.opacity = absDiff > 2.5 ? '0' : absDiff > 1.5 ? '0.2' : absDiff > 0.5 ? '0.5' : '1'
      child.style.fontSize = absDiff < 0.5 ? '18px' : '14px'
      child.style.fontWeight = absDiff < 0.5 ? '600' : '400'
      child.style.borderLeftColor = absDiff < 0.5 ? 'var(--color-accent, #00FF85)' : 'transparent'
      child.style.borderLeftWidth = '2px'
      child.style.borderLeftStyle = 'solid'
    }
  }

  // Set initial position
  useEffect(() => {
    currentOffset.current = getOffset(value)
    updateVisuals()
  }, [value, getOffset])

  // Non-passive wheel listener to prevent background scroll + handle 1-step-per-event
  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Exactly 1 step per scroll event regardless of deltaY magnitude
      const direction = e.deltaY > 0 ? 1 : -1
      const newVal = ((value + direction) % wrap + wrap) % wrap
      onChange(newVal)
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [value, onChange, wrap])

  // Cleanup animation frame
  useEffect(() => {
    return () => cancelAnimationFrame(animFrame.current)
  }, [])

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-mono text-muted/60 uppercase tracking-wider">
        {label}
      </span>
      <div
        ref={outerRef}
        className="relative overflow-hidden select-none"
        style={{ height: WHEEL_HEIGHT, width: 64 }}
      >
        {/* Center highlight line */}
        <div
          className="absolute left-0 right-0 pointer-events-none border-y border-accent/20"
          style={{
            top: (WHEEL_HEIGHT / 2) - (ITEM_HEIGHT / 2),
            height: ITEM_HEIGHT,
          }}
        />

        <div ref={containerRef} className="absolute inset-0">
          {items.map((item, i) => (
            <div
              key={i}
              data-index={i}
              className="absolute left-0 right-0 flex items-center justify-center font-mono text-foreground cursor-pointer transition-[font-size] duration-100"
              style={{
                height: ITEM_HEIGHT,
                top: 0,
                willChange: 'transform',
              }}
              onClick={() => animateTo(i)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Exported component ────────────────────────────────────────────

interface ScrollWheelTimePickerProps {
  hours: number
  minutes: number
  onHoursChange: (h: number) => void
  onMinutesChange: (m: number) => void
}

const hourItems = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const minuteItems = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

export default function ScrollWheelTimePicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: ScrollWheelTimePickerProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <WheelColumn items={hourItems} value={hours} onChange={onHoursChange} label="Hour" wrap={24} />
      <span className="text-2xl font-mono text-muted/40 self-center mt-4">:</span>
      <WheelColumn items={minuteItems} value={minutes} onChange={onMinutesChange} label="Min" wrap={60} />
    </div>
  )
}
