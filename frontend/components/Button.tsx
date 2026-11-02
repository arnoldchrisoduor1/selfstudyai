'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Check, X } from 'lucide-react'

type ButtonStatus = 'idle' | 'loading' | 'success' | 'error'

interface StatefulButtonProps {
  /** Async action. Resolve = success, reject/throw = error. Omit for a demo simulation. */
  onAction?: () => Promise<unknown>
  idleLabel?: string
  loadingLabel?: string
  successLabel?: string
  errorLabel?: string
  /** ms to wait on success/error before returning to idle */
  resetDelay?: number
  className?: string
}

const gradients: Record<ButtonStatus, string> = {
  idle: 'linear-gradient(90deg, #d946ef, #8b5cf6, #6366f1)',
  loading: 'linear-gradient(90deg, #0ea5e9, #06b6d4, #3b82f6)',
  success: 'linear-gradient(90deg, #34d399, #22c55e, #14b8a6)',
  error: 'linear-gradient(90deg, #f43f5e, #ef4444, #f97316)',
}

const shadows: Record<ButtonStatus, string> = {
  idle: '0 10px 25px -5px rgba(139, 92, 246, 0.4)',
  loading: '0 10px 25px -5px rgba(14, 165, 233, 0.4)',
  success: '0 10px 25px -5px rgba(34, 197, 94, 0.45)',
  error: '0 10px 25px -5px rgba(244, 63, 94, 0.45)',
}

const statuses = Object.keys(gradients) as ButtonStatus[]

const labelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

// Demo fallback so the component works standalone
const simulate = () =>
  new Promise<void>((resolve, reject) =>
    setTimeout(() => (Math.random() > 0.25 ? resolve() : reject(new Error('Failed'))), 2000)
  )

export default function StatefulButton({
  onAction = simulate,
  idleLabel = 'Start',
  loadingLabel = 'Working…',
  successLabel = 'Completed',
  errorLabel = 'Failed',
  resetDelay = 2200,
  className = '',
}: StatefulButtonProps) {
  const [status, setStatus] = useState<ButtonStatus>('idle')
  const reduceMotion = useReducedMotion()
  const mounted = useRef(true)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const handleClick = useCallback(async () => {
    if (status !== 'idle') return
    setStatus('loading')

    let next: ButtonStatus = 'success'
    try {
      await onAction()
    } catch {
      next = 'error'
    }

    if (!mounted.current) return
    setStatus(next)
    resetTimer.current = setTimeout(() => {
      if (mounted.current) setStatus('idle')
    }, resetDelay)
  }, [status, onAction, resetDelay])

  const isIdle = status === 'idle'

  const buttonAnimate = reduceMotion
    ? {}
    : status === 'success'
      ? { scale: [1, 1.08, 1], x: 0 }
      : status === 'error'
        ? { scale: 1, x: [0, -6, 6, -4, 4, 0] }
        : { scale: 1, x: 0 }

  const buttonTransition =
    status === 'success' || status === 'error'
      ? { duration: 0.45, ease: 'easeOut' as const }
      : { type: 'spring' as const, stiffness: 300, damping: 18 }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-busy={status === 'loading'}
      aria-disabled={!isIdle}
      whileHover={isIdle && !reduceMotion ? { scale: 1.05 } : undefined}
      whileTap={isIdle && !reduceMotion ? { scale: 0.95 } : undefined}
      animate={buttonAnimate}
      transition={buttonTransition}
      style={{
        boxShadow: shadows[status],
        transition: 'box-shadow 0.4s ease',
      }}
      className={`
        relative h-12 min-w-[10rem] rounded-xl px-6 font-semibold text-white
        select-none outline-none
        focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900
        ${isIdle ? 'cursor-pointer' : status === 'loading' ? 'cursor-wait' : 'cursor-default'}
        ${className}
      `}
    >
      {/* Clipped layer: gradients, shimmer, progress bar */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        {/* Stacked gradients crossfade (CSS can't transition between gradients) */}
        {statuses.map((s) => (
          <motion.span
            key={s}
            className="absolute inset-0"
            style={{ background: gradients[s] }}
            initial={false}
            animate={{ opacity: status === s ? 1 : 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        ))}

        <AnimatePresence>
          {status === 'loading' && !reduceMotion && (
            <>
              <motion.span
                key="shimmer"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.35) 50%, transparent 75%)',
                }}
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: '100%', opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  x: { duration: 1.4, repeat: Infinity, ease: 'linear' },
                  opacity: { duration: 0.2 },
                }}
              />
            </>
          )}
        </AnimatePresence>
      </span>

      {/* Success ring: outside the clipped layer so it can expand past the edge */}
      <AnimatePresence>
        {status === 'success' && !reduceMotion && (
          <motion.span
            key="ring"
            className="pointer-events-none absolute inset-0 rounded-md border-2 border-emerald-300"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <span
        className="relative z-10 flex h-full items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === 'idle' && (
            <motion.span key="idle" {...labelMotion}>
              {idleLabel}
            </motion.span>
          )}

          {status === 'loading' && (
            <motion.span key="loading" {...labelMotion} className="flex items-center gap-2">
              <span className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-white"
                    animate={
                      reduceMotion ? { opacity: 1 } : { y: [0, -4, 0], opacity: [0.6, 1, 0.6] }
                    }
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
              {loadingLabel}
            </motion.span>
          )}

          {status === 'success' && (
            <motion.span key="success" {...labelMotion} className="flex items-center gap-2">
              <motion.span
                aria-hidden="true"
                initial={reduceMotion ? false : { scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.span>
              {successLabel}
            </motion.span>
          )}

          {status === 'error' && (
            <motion.span key="error" {...labelMotion} className="flex items-center gap-2">
              <motion.span
                aria-hidden="true"
                initial={reduceMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </motion.span>
              {errorLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  )
}