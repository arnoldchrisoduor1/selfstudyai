'use client'

import { forwardRef, useEffect, useRef } from 'react'
import {
  motion,
  AnimatePresence,
  useAnimate,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'motion/react'
import { Check, X, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import { useToast, type Toast, type ToastVariant } from './ToastContext'

const RADIUS = 15
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Full class strings so Tailwind can detect them (dynamic string replacement gets purged)
const variantStyles: Record<
  ToastVariant,
  {
    icon: React.ElementType
    text: string
    iconBg: string
    ring: string
    blob: string
    shadow: string
    role: 'status' | 'alert'
  }
> = {
  success: {
    icon: Check,
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    ring: 'stroke-emerald-400',
    blob: 'bg-emerald-500',
    shadow: 'shadow-emerald-500/20',
    role: 'status',
  },
  error: {
    icon: AlertCircle,
    text: 'text-rose-400',
    iconBg: 'bg-rose-500/15',
    ring: 'stroke-rose-400',
    blob: 'bg-rose-500',
    shadow: 'shadow-rose-500/25',
    role: 'alert',
  },
  info: {
    icon: Info,
    text: 'text-sky-400',
    iconBg: 'bg-sky-500/15',
    ring: 'stroke-sky-400',
    blob: 'bg-sky-500',
    shadow: 'shadow-sky-500/20',
    role: 'status',
  },
  warning: {
    icon: AlertTriangle,
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    ring: 'stroke-amber-400',
    blob: 'bg-amber-500',
    shadow: 'shadow-amber-500/20',
    role: 'alert',
  },
}

const ToastItem = forwardRef<HTMLDivElement, { toast: Toast }>(function ToastItem(
  { toast },
  ref
) {
  const { dismiss } = useToast()
  const reduceMotion = useReducedMotion()
  const s = variantStyles[toast.variant]
  const Icon = s.icon

  const [scope, animate] = useAnimate<SVGCircleElement>()
  const playback = useRef<AnimationPlaybackControls | null>(null)
  const dismissRef = useRef(dismiss)
  dismissRef.current = dismiss

  // The countdown ring is the single source of truth for the lifetime:
  // when it finishes, the toast dismisses. Pausing the ring pauses the toast.
  useEffect(() => {
    if (!scope.current) return
    let cancelled = false

    const controls = animate(
      scope.current,
      { strokeDashoffset: [0, CIRCUMFERENCE] },
      { duration: toast.duration / 1000, ease: 'linear' }
    )
    playback.current = controls
    controls.then(() => {
      if (!cancelled) dismissRef.current(toast.id)
    })

    return () => {
      cancelled = true
      controls.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pause = () => playback.current?.pause()
  const resume = () => playback.current?.play()

  return (
    <motion.div
      ref={ref}
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.6 }}
      onDragStart={pause}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80 || info.velocity.x > 500) dismiss(toast.id)
        else resume()
      }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.92 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, x: 60, scale: 0.92, transition: { duration: 0.2 } }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      onPointerEnter={pause}
      onPointerLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume()
      }}
      role={s.role}
      className={`
        pointer-events-auto relative w-[22rem] max-w-[calc(100vw-2rem)] touch-pan-y
        overflow-hidden rounded-2xl border border-white/10
        bg-neutral-900/85 text-white backdrop-blur-xl
        shadow-xl ${s.shadow}
      `}
    >
      {/* Soft accent glow in the corner */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-3xl ${s.blob}`}
      />

      <div className="relative flex items-start gap-3 p-4">
        {/* Icon with countdown ring */}
        <div className="relative h-9 w-9 shrink-0">
          <svg
            viewBox="0 0 36 36"
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle cx="18" cy="18" r={RADIUS} fill="none" strokeWidth="2" className="stroke-white/10" />
            <circle
              ref={scope}
              cx="18"
              cy="18"
              r={RADIUS}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={0}
              className={s.ring}
            />
          </svg>
          <motion.span
            aria-hidden="true"
            className={`absolute inset-[5px] flex items-center justify-center rounded-full ${s.iconBg} ${s.text}`}
            initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.08 }}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
          </motion.span>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-tight tracking-tight">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-white/60">{toast.description}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
})

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:inset-x-auto sm:right-0 sm:items-end"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}