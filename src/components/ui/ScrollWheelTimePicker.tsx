'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

const ITEM_HEIGHT = 40
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS // 200px

interface WheelColumnProps {
  items: string[]
  value: number
  onChange: (val: number) => void
  label: string
}

function WheelColumn({ items, value, onChange, label }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isTouching = useRef(false)
  const touchStartY = useRef(0)
  const touchStartOffset = useRef(0)
  const currentOffset = useRef(0)
  const velocity = useRef(0)
  const lastTouchY = useRef(0)
  const lastTouchTime = useRef(0)
  const animFrame = useRef<number>(0)
  const isUserScrolling = useRef(false)

  const count = items.length

  // Position: offset in px from top; center item is at offset = -value * ITEM_HEIGHT
  // We display a virtual window: center ± 2 items, wrapping via modulo
  const getOffset = useCallback((val: number) => -val * ITEM_HEIGHT, [])

  // Snap offset to nearest item
  const snapToNearest = useCallback((offset: number) => {
    const rawIndex = Math.round(-offset / ITEM_HEIGHT)
    // Modulo wrap
    const index = ((rawIndex % count) + count) % count
    return index
  }, [count])

  // Animate to a target offset with deceleration
  const animateTo = useCallback((targetIndex: number) => {
    cancelAnimationFrame(animFrame.current)
    const targetOffset = getOffset(targetIndex)
    const startOffset = currentOffset.current
    const distance = targetOffset - startOffset

    // If very close, just snap
    if (Math.abs(distance) < 1) {
      currentOffset.current = targetOffset
      onChange(targetIndex)
      updateVisuals()
      return
    }

    const duration = 300
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
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
  }, [count, getOffset, onChange])

  // Momentum scrolling after touch release
  const startMomentum = useCallback(() => {
    cancelAnimationFrame(animFrame.current)
    const friction = 0.92

    function tick() {
      if (Math.abs(velocity.current) < 0.5) {
        // Snap
        const idx = snapToNearest(currentOffset.current)
        animateTo(idx)
        return
      }
      currentOffset.current += velocity.current
      velocity.current *= friction
      updateVisuals()
      animFrame.current = requestAnimationFrame(tick)
    }

    animFrame.current = requestAnimationFrame(tick)
  }, [snapToNearest, animateTo])

  function updateVisuals() {
    const container = containerRef.current
    if (!container) return

    const children = container.children
    // The offset in the center of the viewport
    const centerVal = -currentOffset.current / ITEM_HEIGHT

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const itemIndex = Number(child.dataset.index)

      // Calculate visual position relative to center
      let diff = itemIndex - centerVal
      // Wrap around for infinite scroll feel
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

  // Mouse wheel handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    isUserScrolling.current = true
    cancelAnimationFrame(animFrame.current)

    const delta = e.deltaY > 0 ? ITEM_HEIGHT : -ITEM_HEIGHT
    currentOffset.current -= delta
    const idx = snapToNearest(currentOffset.current)
    animateTo(idx)
  }, [snapToNearest, animateTo])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isTouching.current = true
    isUserScrolling.current = true
    cancelAnimationFrame(animFrame.current)
    touchStartY.current = e.touches[0].clientY
    touchStartOffset.current = currentOffset.current
    lastTouchY.current = e.touches[0].clientY
    lastTouchTime.current = performance.now()
    velocity.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouching.current) return
    e.preventDefault()

    const y = e.touches[0].clientY
    const dy = y - touchStartY.current
    currentOffset.current = touchStartOffset.current + dy

    const now = performance.now()
    const dt = now - lastTouchTime.current
    if (dt > 0) {
      velocity.current = (y - lastTouchY.current) / dt * 16
    }
    lastTouchY.current = y
    lastTouchTime.current = now

    updateVisuals()
  }, [])

  const handleTouchEnd = useCallback(() => {
    isTouching.current = false
    if (Math.abs(velocity.current) > 2) {
      startMomentum()
    } else {
      const idx = snapToNearest(currentOffset.current)
      animateTo(idx)
    }
  }, [startMomentum, snapToNearest, animateTo])

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(animFrame.current)
  }, [])

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-mono text-muted/60 uppercase tracking-wider">
        {label}
      </span>
      <div
        className="relative overflow-hidden select-none"
        style={{ height: WHEEL_HEIGHT, width: 64 }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
              onClick={() => {
                isUserScrolling.current = true
                animateTo(i)
              }}
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
      <WheelColumn items={hourItems} value={hours} onChange={onHoursChange} label="Hour" />
      <span className="text-2xl font-mono text-muted/40 self-center mt-4">:</span>
      <WheelColumn items={minuteItems} value={minutes} onChange={onMinutesChange} label="Min" />
    </div>
  )
}
