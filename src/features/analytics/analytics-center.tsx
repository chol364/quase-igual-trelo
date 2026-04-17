'use client'

import { useMemo, useState } from 'react'

type AnalyticsCard = {
  id: string
  createdAt: string
  completedAt: string | null
  status: string
  dueDate: string | null
  boardTitle: string | null
  members: Array<{ id: string; name: string }>
}

type PeriodKey = '7' | '30' | '90'

const periods: Array<{ value: PeriodKey; label: string }> = [
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
]

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

function buildDates(days: number) {
  const now = new Date()
  const normalized = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Array.from({ length: days }, (_, index) => {
    const item = new Date(normalized)
    item.setDate(normalized.getDate() - (days - 1 - index))
    return item
  })
}

function buildSeries(cards: AnalyticsCard[], days: number) {
  const dates = buildDates(days)
  const created = dates.map((date) => ({ label: formatDay(date), value: 0 }))
  const completed = dates.map((date) => ({ label: formatDay(date), value: 0 }))
  const overdue = dates.map((date) => ({ label: formatDay(date), value: 0 }))
  const dateIndex = new Map(dates.map((date, index) => [date.toISOString().slice(0, 10), index]))

  cards.forEach((card) => {
    const createdKey = card.createdAt.slice(0, 10)
    const completedKey = card.completedAt?.slice(0, 10)
    const dueKey = card.dueDate?.slice(0, 10)

    if (dateIndex.has(createdKey)) created[dateIndex.get(createdKey)!].value += 1
    if (completedKey && dateIndex.has(completedKey)) completed[dateIndex.get(completedKey)!].value += 1
    if (dueKey && dateIndex.has(dueKey) && card.status !== 'DONE') overdue[dateIndex.get(dueKey)!].value += 1
  })

  const backlog = created.reduce<Array<{ label: string; value: number }>>((acc, item, index) => {
    const previous = index === 0 ? 0 : acc[index - 1].value
    const completedCount = completed[index].value
    return [...acc, { label: item.label, value: Math.max(previous + item.value - completedCount, 0) }]
  }, [])

  return { created, completed, overdue, backlog }
}

function LinearChart({ series }: { series: Array<{ label: string; value: number }> }) {
  const max = Math.max(...series.map((item) => item.value), 1)
  const points = series.map((item, index) => ({
    x: (index / Math.max(series.length - 1, 1)) * 100,
    y: 100 - (item.value / max) * 100,
  }))
  const path = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 text-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.25em] text-white/45">Tendencia de backlog</p>
        <span className="text-xs text-white/40">Ultimos dados</span>
      </div>
      <div className="relative h-64 overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-slate-950/80 to-slate-950/50 p-3">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline fill="none" points={path} stroke="#38bdf8" strokeWidth="2" />
          {points.map((point, index) => (
            <circle key={series[index].label} cx={point.x} cy={point.y} fill="#38bdf8" r="1.6" />
          ))}
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-white/45">
        {series.slice(-3).map((item) => (
          <div key={item.label} className="rounded-2xl bg-white/5 p-2 text-center">
            <p className="font-semibold text-white">{item.value}</p>
            <p>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ series, title, accent }: { series: Array<{ label: string; value: number }>; title: string; accent: string }) {
  const max = Math.max(...series.map((item) => item.value), 1)

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 text-white">
      <p className="text-sm uppercase tracking-[0.25em] text-white/45">{title}</p>
      <div className="mt-4 flex h-52 items-end gap-2">
        {series.map((item) => (
          <div key={item.label} className="flex-1 text-center text-[10px] text-white/40">
            <div className="mx-auto mb-2 h-full w-full max-w-[1.1rem] overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  background: accent,
                  height: `${(item.value / max) * 100}%`,
                }}
              />
            </div>
            <div className="mt-2 whitespace-nowrap">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsCenter({ initialCards }: { initialCards: AnalyticsCard[] }) {
  const [period, setPeriod] = useState<PeriodKey>('30')

  const { created, completed, overdue, backlog } = useMemo(() => buildSeries(initialCards, Number(period)), [initialCards, period])
  const totalOpen = initialCards.filter((card) => card.status !== 'DONE').length
  const totalCompleted = initialCards.filter((card) => card.status === 'DONE').length
  const totalOverdue = initialCards.filter((card) => card.dueDate && new Date(card.dueDate) < new Date() && card.status !== 'DONE').length

  return (
    <div className="space-y-6">
      <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,23,42,.94),rgba(21,37,68,.82))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Analytics</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Fluxo real em numeros</h1>
            <p className="mt-4 max-w-3xl text-white/62">Veja o desempenho do time em barras e tendencias por periodo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {periods.map((item) => (
              <button
                key={item.value}
                className={`rounded-full px-4 py-2 text-sm transition ${period === item.value ? 'bg-cyan-500 text-white' : 'border border-white/10 bg-white/[0.04] text-white/60'}`}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-4">
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.25em] text-white/45">Tarefas em aberto</p>
          <p className="mt-4 text-5xl font-semibold">{totalOpen}</p>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.25em] text-white/45">Concluidas</p>
          <p className="mt-4 text-5xl font-semibold">{totalCompleted}</p>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.25em] text-white/45">Atrasadas</p>
          <p className="mt-4 text-5xl font-semibold">{totalOverdue}</p>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.25em] text-white/45">Membros ativos</p>
          <p className="mt-4 text-5xl font-semibold">{new Set(initialCards.flatMap((card) => card.members.map((member) => member.id))).size}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <BarChart accent="linear-gradient(180deg,#38bdf8,#06b6d4)" series={created} title="Cards criados" />
          <BarChart accent="linear-gradient(180deg,#34d399,#10b981)" series={completed} title="Cards concluidos" />
          <BarChart accent="linear-gradient(180deg,#fb7185,#ef4444)" series={overdue} title="Cards atrasados" />
        </div>
        <LinearChart series={backlog} />
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 text-white">
        <p className="text-sm uppercase tracking-[0.25em] text-white/45">Resumo de carga por membro</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from(
            initialCards.reduce((map, card) => {
              card.members.forEach((member) => {
                map.set(member.name, (map.get(member.name) ?? 0) + 1)
              })
              return map
            }, new Map<string, number>())
          ).map(([name, total]) => (
            <div key={name} className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 p-4">
              <p className="text-sm text-white/45">{name}</p>
              <p className="mt-3 text-3xl font-semibold">{total}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
