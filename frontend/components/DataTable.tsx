'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Check,
  Search,
  X,
} from 'lucide-react'
import type { TeamMember, Status } from '@/lib/table-data'

type SortKey = 'name' | 'status' | 'spend' | 'joined' | 'usage'
type SortDir = 'asc' | 'desc'
type Filter = Status | 'all'

const statusStyles: Record<
  Status,
  { label: string; dot: string; text: string; bg: string; chip: string }
> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    chip: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    chip: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  },
  inactive: {
    label: 'Inactive',
    dot: 'bg-neutral-400',
    text: 'text-neutral-300',
    bg: 'bg-neutral-500/10',
    chip: 'border-neutral-400/40 bg-neutral-500/15 text-neutral-200',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-rose-400',
    text: 'text-rose-300',
    bg: 'bg-rose-500/10',
    chip: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
  },
}

const statusOrder = Object.keys(statusStyles) as Status[]

const columns: { key: SortKey | 'actions'; label: string; sortable?: boolean; align?: 'right' }[] = [
  { key: 'name', label: 'Member', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'spend', label: 'Spend', sortable: true, align: 'right' },
  { key: 'joined', label: 'Joined', sortable: true },
  { key: 'usage', label: 'Usage', sortable: true },
  { key: 'actions', label: 'Actions' },
]

// Full class strings so Tailwind can detect them
const avatarGradients = [
  'from-fuchsia-500 via-violet-500 to-indigo-500',
  'from-sky-500 via-cyan-500 to-blue-500',
  'from-emerald-400 via-green-500 to-teal-500',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-pink-500 via-rose-500 to-red-500',
]

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

const usageBar = (usage: number) =>
  usage >= 90
    ? 'from-rose-400 to-orange-500'
    : usage >= 75
      ? 'from-amber-400 to-orange-400'
      : 'from-sky-400 to-violet-500'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
// UTC so "2025-03-01" doesn't shift a day in other timezones
const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export default function DataTable({ data }: { data: TeamMember[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const reduceMotion = useReducedMotion()

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: data.length, active: 0, pending: 0, inactive: 0, failed: 0 }
    data.forEach((m) => c[m.status]++)
    return c
  }, [data])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = data.filter(
      (m) =>
        (filter === 'all' || m.status === filter) &&
        (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    )

    rows.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'status') cmp = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
      else if (sortKey === 'joined') cmp = Date.parse(a.joined) - Date.parse(b.joined)
      else if (sortKey === 'spend' || sortKey === 'usage') cmp = a[sortKey] - b[sortKey]
      else cmp = a.name.localeCompare(b.name)

      // Stable tiebreaker so equal values don't shuffle
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, query, filter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Select-all applies to the rows you can currently see
  const allSelected = visible.length > 0 && visible.every((m) => selected.has(m.id))
  const someSelected = !allSelected && visible.some((m) => selected.has(m.id))

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) visible.forEach((m) => next.delete(m.id))
      else visible.forEach((m) => next.add(m.id))
      return next
    })

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectedSpend = useMemo(
    () => data.reduce((sum, m) => (selected.has(m.id) ? sum + m.spend : sum), 0),
    [data, selected]
  )

  const filters: Filter[] = ['all', ...statusOrder]

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 shadow-2xl shadow-black/40 backdrop-blur-xl">
      {/* Search + filters */}
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search members"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-8 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-violet-400/60 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-violet-400/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                  active
                    ? f === 'all'
                      ? 'border-white/30 bg-white/15 text-white'
                      : statusStyles[f].chip
                    : 'border-white/10 text-white/50 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                {f === 'all' ? 'All' : statusStyles[f].label}
                <span className="tabular-nums text-white/40">{counts[f]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selection toolbar */}
      <AnimatePresence initial={false}>
        {selected.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-violet-400/20 bg-violet-500/10"
          >
            <div className="flex items-center justify-between px-4 py-2 text-sm text-white/80">
              <span aria-live="polite">
                <span className="font-medium text-white">{selected.size}</span> selected
                <span className="mx-2 text-white/30">·</span>
                <span className="tabular-nums">{currency.format(selectedSpend)}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-md px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Clear selection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-h-[36rem] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <caption className="sr-only">Team members</caption>

          <thead>
            <tr className="text-xs uppercase tracking-wider text-white/40">
              <th className="sticky top-0 z-10 w-10 border-b border-white/10 bg-neutral-900/95 px-4 py-3 backdrop-blur">
                <Checkbox
                  label="Select all visible members"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                />
              </th>
              {columns.map((c) => {
                const isActive = c.sortable && sortKey === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      c.sortable
                        ? isActive
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={`sticky top-0 z-10 border-b border-white/10 bg-neutral-900/95 px-4 py-3 font-medium backdrop-blur ${
                      c.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key as SortKey)}
                        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                          isActive ? 'text-white/90' : ''
                        }`}
                      >
                        {c.label}
                        {isActive ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <span className="sr-only">{c.label}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            <AnimatePresence initial={false}>
              {visible.map((m, i) => {
                const isSelected = selected.has(m.id)
                const st = statusStyles[m.status]
                const delay = Math.min(i, 12) * 0.03
                return (
                  <motion.tr
                    key={m.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    // Stagger only the entrance; re-sorting stays snappy
                    transition={{
                      opacity: { delay, duration: 0.2 },
                      y: { delay, duration: 0.2 },
                      layout: { type: 'spring', stiffness: 500, damping: 40 },
                    }}
                    aria-selected={isSelected}
                    className={`group border-b border-white/5 transition-colors last:border-0 ${
                      isSelected ? 'bg-violet-500/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        label={`Select ${m.name}`}
                        checked={isSelected}
                        onChange={() => toggleRow(m.id)}
                      />
                    </td>

                    {/* Member */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden="true"
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${
                            avatarGradients[hash(m.id) % avatarGradients.length]
                          } text-[11px] font-bold text-white shadow-inner ring-1 ring-white/10`}
                        >
                          {m.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{m.name}</p>
                          <p className="truncate text-xs text-white/50">{m.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.bg} ${st.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden="true" />
                        {st.label}
                      </span>
                    </td>

                    {/* Spend */}
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-white">
                      {currency.format(m.spend)}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 tabular-nums text-white/70">
                      {dateFmt.format(new Date(m.joined))}
                    </td>

                    {/* Usage */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          role="progressbar"
                          aria-valuenow={m.usage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${m.name} usage`}
                          className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/10"
                        >
                          <motion.div
                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${usageBar(m.usage)}`}
                            initial={reduceMotion ? false : { width: 0 }}
                            animate={{ width: `${m.usage}%` }}
                            transition={{ duration: 0.6, delay, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="w-9 text-xs tabular-nums text-white/50">{m.usage}%</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Actions for ${m.name}`}
                        className="rounded-lg p-1.5 text-white/40 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 [@media(hover:none)]:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>

            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-white/80">No members found</p>
                  <p className="mt-1 text-xs text-white/40">Try a different search or status filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setFilter('all')
                    }}
                    className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    Reset filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-white/50">
        <span aria-live="polite">
          Showing {visible.length} of {data.length} members
        </span>
        <span className="hidden sm:inline">
          Sorted by {sortKey} ({sortDir === 'asc' ? 'ascending' : 'descending'})
        </span>
      </div>
    </div>
  )
}

/* ----------------------------- Checkbox ----------------------------- */

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  label: string
}) {
  const on = checked || indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={onChange}
      className={`grid h-4 w-4 place-items-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
        on
          ? 'border-violet-500 bg-violet-500 text-white'
          : 'border-white/20 bg-transparent hover:border-white/40'
      }`}
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            {indeterminate ? (
              <span className="block h-0.5 w-2 rounded bg-white" />
            ) : (
              <Check className="h-3 w-3" strokeWidth={3} />
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}