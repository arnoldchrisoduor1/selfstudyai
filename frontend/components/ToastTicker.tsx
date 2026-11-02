'use client'

import { useEffect } from 'react'
import { useToast, type ToastVariant } from './ToastContext'

const MESSAGES: { title: string; description: string; variant: ToastVariant }[] = [
  {
    variant: 'success',
    title: 'Session saved',
    description: 'Progress stored. Pick up where you left off.',
  },
  {
    variant: 'info',
    title: 'Lesson unlocked',
    description: 'Linear algebra, set 4 is ready.',
  },
  {
    variant: 'warning',
    title: 'Streak at risk',
    description: 'One study block today keeps the streak.',
  },
  {
    variant: 'error',
    title: 'Sync failed',
    description: 'Server unreachable. Will retry shortly.',
  },
  {
    variant: 'info',
    title: 'Review due',
    description: '12 cards from yesterday are waiting.',
  },
  {
    variant: 'success',
    title: 'Quiz passed',
    description: 'Derivatives — 9 of 10 correct.',
  },
]

const FIRST_DELAY_MS = 1200
const INTERVAL_MS = 8000

export function ToastTicker() {
  const { toast } = useToast()

  useEffect(() => {
    let index = 0

    const show = () => {
      const message = MESSAGES[index % MESSAGES.length]
      index += 1
      toast(message)
    }

    const first = setTimeout(show, FIRST_DELAY_MS)
    const interval = setInterval(show, INTERVAL_MS)

    return () => {
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [toast])

  return null
}
