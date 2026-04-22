'use client'

import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, rectSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, GripVertical, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { startTransition, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SavedFiltersPanel } from '@/features/boards/board-extras'
import { BOARD_VIEWS, CARD_PRIORITIES, CARD_STATUSES, type BoardView } from '@/lib/domain/constants'
import { subscribeToBoard } from '@/lib/realtime/client'

type UserMini = { id: string; name: string; username: string; avatarColor: string }
type BoardMember = UserMini & { role?: string }
type AttachmentItem = { id: string; fileName: string; fileUrl: string; mimeType: string | null; size: number | null }
type CardComment = { id: string; content: string; createdAt: string | Date; updatedAt?: string | Date; mentions?: unknown; author: UserMini }
type CardActivity = { id: string; action: string; message: string; createdAt: string | Date; entityType: string; user: UserMini }
type ChecklistItem = { id: string; title: string; isCompleted: boolean; sortOrder: number }
type Checklist = { id: string; title: string; sortOrder: number; items: ChecklistItem[] }
type BoardCard = {
  id: string
  title: string
  slug: string
  description: string | null
  priority: string
  status: string
  dueDate: string | Date | null
  startDate: string | Date | null
  completedAt: string | Date | null
  reminderAt: string | Date | null
  coverImage: string | null
  coverColor: string | null
  isWatching: boolean
  listId: string
  boardId: string
  sortOrder: number
  members: UserMini[]
  labels: Array<{ id: string; name: string; color: string }>
  checklist: Checklist[]
  checklistProgress: { total: number; completed: number }
  comments: CardComment[]
  attachments: AttachmentItem[]
  activity: CardActivity[]
}
type BoardList = { id: string; title: string; sortOrder: number; limit: number | null; color: string | null; cards: BoardCard[] }
type BoardData = {
  id: string
  title: string
  slug: string
  description: string | null
  background: string | null
  visibility: string
  isFavorite: boolean
  defaultView: string
  workspace: { id: string; name: string; slug: string }
  members: BoardMember[]
  labels: Array<{ id: string; name: string; color: string }>
  lists: BoardList[]
  activity: Array<{ id: string; action: string; message: string; createdAt: string | Date; entityType: string; user: UserMini }>
}
type SavedFilter = {
  id: string
  name: string
  filters: {
    search?: string
    memberFilter?: string
    priorityFilter?: string
    labelFilter?: string
    dueFilter?: string
  }
}
type SelectOption = { value: string; label: string; hint?: string }
type UndoAction = { id: string; label: string; onUndo: () => Promise<void> }

const viewOptions = [...BOARD_VIEWS]
const dueFilterOptions: SelectOption[] = [
  { value: 'ALL', label: 'Todos prazos', hint: 'Mostra todos os cards' },
  { value: 'WITH_DUE', label: 'Com prazo', hint: 'Somente cards com data' },
  { value: 'OVERDUE', label: 'Atrasados', hint: 'Priorize o que venceu' },
]
const weekDayLabels = [
  { key: 'sun', label: 'D' },
  { key: 'mon', label: 'S' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'Q' },
  { key: 'thu', label: 'Q' },
  { key: 'fri', label: 'S' },
  { key: 'sat', label: 'S' },
]

function formatDate(value: string | Date | null) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function toDateInput(value: string | Date | null) {
  if (!value) return ''
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
}

function fromDateInput(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDateDisplay(value: string) {
  const date = fromDateInput(value)
  if (!date) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
}

function createLocalId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`
}

function createCalendarDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const startDay = new Date(firstDay)
  startDay.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDay)
    date.setDate(startDay.getDate() + index)
    return date
  })
}

function statusLabel(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase())
}

function EmptyBoardState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Card className="empty-glow app-rise border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,13,24,0.82))] text-white">
      <div className="py-12 text-center">
        <div className="empty-orbit mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
          <Sparkles className="h-9 w-9 text-cyan-200/90" />
        </div>
        <p className="text-2xl font-semibold">{title}</p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/58">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            className="micro-bounce mt-6 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm text-white/78 transition hover:bg-white/[0.1] hover:text-white"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </Card>
  )
}

function findListByCard(lists: BoardList[], cardId: string) {
  return lists.find((list) => list.cards.some((card) => card.id === cardId))
}

function reorderSnapshot(lists: BoardList[]) {
  return { lists: lists.map((list) => ({ id: list.id, cards: list.cards.map((card) => card.id) })) }
}

function isOverdueCard(card: Pick<BoardCard, 'dueDate' | 'status'>, now = new Date()) {
  if (!card.dueDate) return false
  return new Date(card.dueDate).getTime() < now.getTime() && card.status !== 'DONE'
}

function AnimatedSelect({
  label,
  value,
  onChange,
  options,
  align = 'left',
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', handlePointer)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointer)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'app-panel micro-bounce group flex w-full items-center justify-between gap-3 rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-4 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm',
          open ? 'border-cyan-300/40 bg-[linear-gradient(180deg,rgba(45,112,255,0.2),rgba(255,255,255,0.05))] shadow-[0_16px_40px_rgba(15,23,42,0.35)]' : 'hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.07]'
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">{label}</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{selectedOption?.label}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/55 transition duration-300', open ? 'rotate-180 text-cyan-200' : 'group-hover:text-white/78')} />
      </button>

      <div
        className={cn(
          'pointer-events-none absolute top-[calc(100%+0.5rem)] z-[80] min-w-full overflow-hidden rounded-[1.35rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,14,24,0.985),rgba(7,11,20,0.985))] p-2 opacity-0 shadow-[0_22px_60px_rgba(2,8,23,0.52)] ring-1 ring-black/20 transition duration-220',
          align === 'right' ? 'right-0' : 'left-0',
          open ? 'pointer-events-auto dropdown-open visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-2 scale-[0.97]'
        )}
      >
        <div className="space-y-1">
          {options.map((option, index) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-[1.1rem] px-3.5 py-3 text-left transition duration-200',
                  selected ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(34,211,238,0.1))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-white/72 hover:bg-white/[0.05] hover:text-white'
                )}
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{option.label}</p>
                  {option.hint ? <p className="mt-1 text-xs text-white/42">{option.hint}</p> : null}
                </div>
                <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border transition', selected ? 'border-cyan-300/40 bg-cyan-400/18 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-transparent')}>
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DatePickerField({
  label,
  value,
  onChange,
  disabled,
  align = 'left',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectedDate = fromDateInput(value)
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date())
  const calendarDays = createCalendarDays(viewDate)

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', handlePointer)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointer)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'group flex w-full items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
          disabled ? 'opacity-60' : open ? 'border-cyan-300/35 shadow-[0_16px_36px_rgba(8,47,73,0.28)]' : 'hover:border-white/18 hover:bg-slate-950/82'
        )}
        onClick={() => {
          if (disabled) return
          setViewDate(selectedDate ?? new Date())
          setOpen((current) => !current)
        }}
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">{label}</p>
          <p className="mt-2 truncate text-sm text-white">{value ? formatDateDisplay(value) : 'Selecionar data'}</p>
        </div>
        <CalendarDays className={cn('h-4 w-4 shrink-0 text-white/52 transition', open ? 'text-cyan-200' : 'group-hover:text-white/80')} />
      </button>

      <div className={cn('pointer-events-none absolute top-[calc(100%+0.55rem)] z-[90] w-[320px] max-w-[calc(100vw-3rem)] rounded-[1.4rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,14,24,0.985),rgba(7,11,20,0.985))] p-3 opacity-0 shadow-[0_28px_80px_rgba(2,8,23,0.58)] ring-1 ring-black/25 transition duration-220', align === 'right' ? 'right-0' : 'left-0', open ? 'pointer-events-auto dropdown-open visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-2 scale-[0.97]')}>
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/72 hover:border-white/18 hover:bg-white/[0.06] hover:text-white" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium capitalize text-white">{formatMonthLabel(viewDate)}</p>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/72 hover:border-white/18 hover:bg-white/[0.06] hover:text-white" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 px-1 pb-2">
          {weekDayLabels.map((weekDay) => <div key={weekDay.key} className="grid h-8 place-items-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">{weekDay.label}</div>)}
          {calendarDays.map((day) => {
            const dayValue = toDateInput(day)
            const isSelected = value === dayValue
            const isOutsideMonth = day.getMonth() !== viewDate.getMonth()
            const isToday = dayValue === toDateInput(new Date())
            return (
              <button
                key={dayValue}
                type="button"
                className={cn(
                  'grid h-9 place-items-center rounded-xl text-sm transition',
                  isSelected ? 'bg-[linear-gradient(135deg,#60a5fa,#2563eb)] text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)]' : isOutsideMonth ? 'text-white/26 hover:bg-white/[0.04] hover:text-white/55' : 'text-white/82 hover:bg-white/[0.06] hover:text-white',
                  isToday && !isSelected ? 'ring-1 ring-cyan-300/28' : ''
                )}
                onClick={() => {
                  onChange(dayValue)
                  setOpen(false)
                }}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-white/8 px-1 pt-3">
          <button type="button" className="rounded-full px-3 py-2 text-xs text-white/62 hover:bg-white/[0.05] hover:text-white" onClick={() => { onChange(''); setOpen(false) }}>Limpar</button>
          <button type="button" className="rounded-full px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10" onClick={() => { const today = toDateInput(new Date()); onChange(today); setViewDate(new Date()); setOpen(false) }}>Hoje</button>
        </div>
      </div>
    </div>
  )
}

function SortableCard({
  card,
  onOpen,
  isFocused,
  cardIndex,
  isSelected,
  onToggleSelected,
}: {
  card: BoardCard
  onOpen: (card: BoardCard) => void
  isFocused: boolean
  cardIndex: number
  isSelected: boolean
  onToggleSelected: (cardId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: 'card', card } })
  const checklistTotal = card.checklistProgress.total || 0
  const checklistCompleted = card.checklistProgress.completed
  const checklistPercent = checklistTotal ? Math.round((checklistCompleted / checklistTotal) * 100) : 0
  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.65 : 1, animationDelay: `${cardIndex * 34}ms` }}
      suppressHydrationWarning
      className={`app-stagger hover-lift app-panel group relative w-full overflow-hidden rounded-[1.5rem] border p-4 text-left transition ${isFocused ? 'border-cyan-400/50 ring-2 ring-cyan-400/20 shadow-[0_24px_60px_rgba(8,145,178,0.18)]' : 'border-white/10'} bg-[linear-gradient(180deg,rgba(11,18,33,0.96),rgba(7,12,24,0.92))]`}
      onClick={() => onOpen(card)}
      {...attributes}
      {...listeners}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(circle_at_top_left, rgba(34,211,238,0.16), transparent 34%), radial-gradient(circle_at_bottom_right, rgba(59,130,246,0.14), transparent 30%)' }} />
      {card.coverColor ? <div className="mb-3 h-2 rounded-full" style={{ backgroundColor: card.coverColor }} /> : null}
      <div className="relative flex items-start justify-between gap-3">
        <p className="font-semibold text-white">{card.title}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              'grid h-7 w-7 place-items-center rounded-full border transition',
              isSelected ? 'border-cyan-300/35 bg-cyan-400/18 text-cyan-100' : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white'
            )}
            onClick={(event) => {
              event.stopPropagation()
              onToggleSelected(card.id)
            }}
          >
            {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50 transition group-hover:border-cyan-200/20 group-hover:bg-cyan-400/10 group-hover:text-cyan-100">{statusLabel(card.priority)}</span>
        </div>
      </div>
      {card.labels.length ? <div className="relative mt-3 flex flex-wrap gap-2">{card.labels.slice(0, 2).map((label) => <span key={label.id} className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white" style={{ backgroundColor: label.color }}>{label.name}</span>)}</div> : null}
      {card.description ? <p className="relative mt-3 text-sm leading-6 text-white/58">{card.description}</p> : null}
      {checklistTotal ? (
        <div className="relative mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
            <span>Checklist</span>
            <span>{checklistCompleted}/{checklistTotal}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6)]" style={{ width: `${checklistPercent}%` }} />
          </div>
        </div>
      ) : null}
      <div className="relative mt-4 flex items-center justify-between text-xs text-white/45">
        <span>{card.comments.length} comentarios</span>
        <span>{formatDate(card.dueDate)}</span>
      </div>
    </button>
  )
}

function ChecklistSortableItem({
  checklistId,
  item,
  canMutate,
  onToggle,
  onChangeTitle,
  onRemove,
  onAddBelow,
}: {
  checklistId: string
  item: ChecklistItem
  canMutate: boolean
  onToggle: (checklistId: string, itemId: string, checked: boolean) => void
  onChangeTitle: (checklistId: string, itemId: string, title: string) => void
  onRemove: (checklistId: string, itemId: string) => void
  onAddBelow: (checklistId: string, itemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canMutate,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1 }}
      className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-white/[0.03] px-3 py-3"
    >
      {canMutate ? (
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
          aria-label="Reordenar item"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <input
        type="checkbox"
        disabled={!canMutate}
        checked={item.isCompleted}
        onChange={(event) => onToggle(checklistId, item.id, event.target.checked)}
      />
      <input
        className={cn('min-w-0 flex-1 bg-transparent text-sm outline-none', item.isCompleted ? 'text-white/40 line-through' : 'text-white')}
        disabled={!canMutate}
        value={item.title}
        onChange={(event) => onChangeTitle(checklistId, item.id, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onAddBelow(checklistId, item.id)
          }
        }}
      />
      {canMutate ? (
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 hover:border-rose-300/20 hover:bg-rose-500/10 hover:text-rose-100"
          onClick={() => onRemove(checklistId, item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

function SortableList({
  list,
  canMutate,
  focusedCardId,
  onCreateCard,
  onRenameList,
  onDeleteList,
  onOpenCard,
  listIndex,
  selectedCardIds,
  onToggleSelectedCard,
}: {
  list: BoardList
  canMutate: boolean
  focusedCardId: string | null
  onCreateCard: (listId: string, title: string) => Promise<void>
  onRenameList: (listId: string, title: string) => Promise<void>
  onDeleteList: (listId: string) => Promise<void>
  onOpenCard: (card: BoardCard) => void
  listIndex: number
  selectedCardIds: string[]
  onToggleSelectedCard: (cardId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: list.id, data: { type: 'list' }, disabled: !canMutate })
  const [title, setTitle] = useState(list.title)
  const [newCardTitle, setNewCardTitle] = useState('')

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, animationDelay: `${listIndex * 54}ms` }} className="glass-ring app-rise app-panel w-[340px] shrink-0 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,33,0.96),rgba(8,14,26,0.9))] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <input className="w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-white outline-none" disabled={!canMutate} value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => { if (canMutate && title.trim() !== list.title) void onRenameList(list.id, title.trim()) }} />
          <p className="px-2 text-[11px] uppercase tracking-[0.28em] text-white/35">{list.cards.length} cards</p>
        </div>
        {canMutate ? (
          <div className="flex gap-2">
            <button className="rounded-full border border-rose-400/18 bg-rose-500/8 px-3 py-2 text-xs text-rose-100/70" onClick={() => void onDeleteList(list.id)}>Excluir</button>
            <button suppressHydrationWarning className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55" {...attributes} {...listeners}>Mover</button>
          </div>
        ) : null}
      </div>
      <SortableContext items={list.cards.map((card) => card.id)} strategy={rectSortingStrategy}>
        <div className="space-y-3">{list.cards.map((card, cardIndex) => <SortableCard key={card.id} card={card} cardIndex={cardIndex} isFocused={card.id === focusedCardId} isSelected={selectedCardIds.includes(card.id)} onToggleSelected={onToggleSelectedCard} onOpen={onOpenCard} />)}</div>
      </SortableContext>
      {canMutate ? (
        <div className="mt-4 space-y-3 rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-3">
          <input className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none" placeholder="Adicionar card" value={newCardTitle} onChange={(event) => setNewCardTitle(event.target.value)} />
          <Button className="w-full" onClick={() => { if (!newCardTitle.trim()) return; void onCreateCard(list.id, newCardTitle.trim()); setNewCardTitle('') }}>Criar card</Button>
        </div>
      ) : null}
    </div>
  )
}

function CardModal({
  card, boardMembers, boardLabels, canMutate, onClose, onSave, onDelete, onComment, onUpdateComment, onDeleteComment, onUploadAttachment, onDeleteAttachment,
}: {
  card: BoardCard
  boardMembers: BoardMember[]
  boardLabels: Array<{ id: string; name: string; color: string }>
  canMutate: boolean
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => Promise<void>
  onDelete: () => Promise<void>
  onComment: (content: string) => Promise<void>
  onUpdateComment: (commentId: string, content: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onUploadAttachment: (file: File) => Promise<void>
  onDeleteAttachment: (attachmentId: string) => Promise<void>
}) {
  const [comment, setComment] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [draft, setDraft] = useState({
    title: card.title,
    description: card.description ?? '',
    priority: card.priority,
    status: card.status,
    dueDate: toDateInput(card.dueDate),
    startDate: toDateInput(card.startDate),
    reminderAt: toDateInput(card.reminderAt),
    coverColor: card.coverColor ?? '#1d4ed8',
    memberIds: card.members.map((member) => member.id),
    labelIds: card.labels.map((label) => label.id),
    checklist: card.checklist,
  })
  const [editingCommentId, setEditingCommentId] = useState('')
  const [editingCommentContent, setEditingCommentContent] = useState('')
  const [isChecklistSaving, setIsChecklistSaving] = useState(false)
  const [isMetaSaving, setIsMetaSaving] = useState(false)
  const prioritySelectOptions = CARD_PRIORITIES.map((item) => ({ value: item, label: statusLabel(item), hint: `Prioridade ${statusLabel(item).toLowerCase()}` }))
  const statusSelectOptions = CARD_STATUSES.filter((item) => item !== 'ARCHIVED').map((item) => ({ value: item, label: statusLabel(item), hint: `Status ${statusLabel(item).toLowerCase()}` }))
  const checklistItems = draft.checklist.flatMap((checklist) => checklist.items)
  const completedChecklistItems = checklistItems.filter((item) => item.isCompleted).length
  const checklistProgress = checklistItems.length ? Math.round((completedChecklistItems / checklistItems.length) * 100) : 0
  const checklistSnapshot = JSON.stringify(draft.checklist)
  const lastSavedChecklistSnapshotRef = useRef(JSON.stringify(card.checklist))
  const checklistSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const metaSnapshot = JSON.stringify({
    title: draft.title,
    description: draft.description,
    priority: draft.priority,
    status: draft.status,
    dueDate: draft.dueDate,
    startDate: draft.startDate,
    reminderAt: draft.reminderAt,
    coverColor: draft.coverColor,
    memberIds: draft.memberIds,
    labelIds: draft.labelIds,
  })
  const lastSavedMetaSnapshotRef = useRef(JSON.stringify({
    title: card.title,
    description: card.description ?? '',
    priority: card.priority,
    status: card.status,
    dueDate: toDateInput(card.dueDate),
    startDate: toDateInput(card.startDate),
    reminderAt: toDateInput(card.reminderAt),
    coverColor: card.coverColor ?? '#1d4ed8',
    memberIds: card.members.map((member) => member.id),
    labelIds: card.labels.map((label) => label.id),
  }))

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  function updateChecklist(nextChecklist: Checklist[]) {
    setDraft((current) => ({ ...current, checklist: nextChecklist }))
  }

  function addChecklist() {
    updateChecklist([
      ...draft.checklist,
      {
        id: createLocalId('checklist'),
        title: `Checklist ${draft.checklist.length + 1}`,
        sortOrder: draft.checklist.length,
        items: [],
      },
    ])
  }

  function updateChecklistTitle(checklistId: string, title: string) {
    updateChecklist(draft.checklist.map((checklist) => checklist.id === checklistId ? { ...checklist, title } : checklist))
  }

  function removeChecklist(checklistId: string) {
    updateChecklist(
      draft.checklist
        .filter((checklist) => checklist.id !== checklistId)
        .map((checklist, index) => ({ ...checklist, sortOrder: index }))
    )
  }

  function addChecklistItem(checklistId: string, insertAt?: number) {
    updateChecklist(
      draft.checklist.map((checklist) => {
        if (checklist.id !== checklistId) return checklist
        const nextItem = {
          id: createLocalId('checkitem'),
          title: '',
          isCompleted: false,
          sortOrder: checklist.items.length,
        }
        const nextItems = [...checklist.items]
        nextItems.splice(insertAt ?? nextItems.length, 0, nextItem)
        return {
          ...checklist,
          items: nextItems.map((item, index) => ({ ...item, sortOrder: index })),
        }
      })
    )
  }

  function updateChecklistItem(checklistId: string, itemId: string, patch: Partial<ChecklistItem>) {
    updateChecklist(
      draft.checklist.map((checklist) => {
        if (checklist.id !== checklistId) return checklist
        return {
          ...checklist,
          items: checklist.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
        }
      })
    )
  }

  function removeChecklistItem(checklistId: string, itemId: string) {
    updateChecklist(
      draft.checklist.map((checklist) => {
        if (checklist.id !== checklistId) return checklist
        return {
          ...checklist,
          items: checklist.items.filter((item) => item.id !== itemId).map((item, index) => ({ ...item, sortOrder: index })),
        }
      })
    )
  }

  function moveChecklistItem(checklistId: string, activeId: string, overId: string) {
    updateChecklist(
      draft.checklist.map((checklist) => {
        if (checklist.id !== checklistId) return checklist
        const oldIndex = checklist.items.findIndex((item) => item.id === activeId)
        const newIndex = checklist.items.findIndex((item) => item.id === overId)
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return checklist
        return {
          ...checklist,
          items: arrayMove(checklist.items, oldIndex, newIndex).map((item, index) => ({ ...item, sortOrder: index })),
        }
      })
    )
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return
    setIsUploading(true)
    try {
      for (const file of files) {
        await onUploadAttachment(file)
      }
    } finally {
      setIsUploading(false)
      setIsDragActive(false)
    }
  }

  useEffect(() => {
    if (!canMutate) return
    if (checklistSnapshot === lastSavedChecklistSnapshotRef.current) return

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      setIsChecklistSaving(true)
      try {
        await onSave({ checklist: draft.checklist })
        if (!cancelled) {
          lastSavedChecklistSnapshotRef.current = checklistSnapshot
        }
      } finally {
        if (!cancelled) setIsChecklistSaving(false)
      }
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [canMutate, checklistSnapshot, draft.checklist, onSave])

  useEffect(() => {
    if (!canMutate) return
    if (metaSnapshot === lastSavedMetaSnapshotRef.current) return

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      setIsMetaSaving(true)
      try {
        await onSave({
          title: draft.title,
          description: draft.description || null,
          priority: draft.priority,
          status: draft.status,
          dueDate: draft.dueDate || null,
          startDate: draft.startDate || null,
          reminderAt: draft.reminderAt || null,
          coverColor: draft.coverColor,
          memberIds: draft.memberIds,
          labelIds: draft.labelIds,
        })
        if (!cancelled) {
          lastSavedMetaSnapshotRef.current = metaSnapshot
        }
      } finally {
        if (!cancelled) setIsMetaSaving(false)
      }
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [canMutate, draft.coverColor, draft.description, draft.dueDate, draft.labelIds, draft.memberIds, draft.priority, draft.reminderAt, draft.startDate, draft.status, draft.title, metaSnapshot, onSave])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/78 p-4 backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-7xl items-start py-2 lg:items-center lg:py-6">
        <div className="grid w-full gap-4 rounded-[2rem] border border-white/10 bg-[#091425] text-white shadow-[0_32px_120px_rgba(2,8,23,0.58)] lg:max-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="min-h-0 overflow-y-auto p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="w-full">
              <input className="w-full rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-5 py-4 text-2xl font-semibold outline-none lg:text-3xl" disabled={!canMutate} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              {canMutate ? <p className="mt-2 px-1 text-xs text-white/40">{isMetaSaving ? 'Salvando alteracoes do card...' : 'Alteracoes principais salvas automaticamente'}</p> : null}
            </div>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:border-white/20 hover:bg-white/8" onClick={onClose}>Fechar</button>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <h3 className="font-medium">Descricao</h3>
                <textarea className="mt-4 min-h-44 w-full rounded-[1.35rem] border border-white/10 bg-slate-950/72 px-4 py-3 outline-none" disabled={!canMutate} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Checklist</h3>
                    <p className="mt-1 text-sm text-white/45">{completedChecklistItems}/{checklistItems.length} itens concluidos{canMutate ? isChecklistSaving ? ' • salvando...' : ' • salvo automaticamente' : ''}</p>
                  </div>
                  {canMutate ? <Button variant="secondary" className="gap-2" onClick={addChecklist}><Plus className="h-4 w-4" />Nova checklist</Button> : null}
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6)] transition-all duration-300" style={{ width: `${checklistProgress}%` }} />
                </div>

                <div className="mt-5 space-y-4">
                  {draft.checklist.length ? draft.checklist.map((checklist) => (
                    <div key={checklist.id} className="rounded-[1.3rem] border border-white/10 bg-slate-950/52 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <div className="flex items-center gap-3">
                        <input
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium outline-none"
                          disabled={!canMutate}
                          value={checklist.title}
                          onChange={(event) => updateChecklistTitle(checklist.id, event.target.value)}
                        />
                        {canMutate ? <button className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-400/18 bg-rose-500/8 text-rose-100/70 hover:bg-rose-500/14" onClick={() => removeChecklist(checklist.id)}><Trash2 className="h-4 w-4" /></button> : null}
                      </div>

                      <div className="mt-4 space-y-2">
                        {checklist.items.length ? (
                          <DndContext
                            sensors={checklistSensors}
                            collisionDetection={closestCorners}
                            onDragEnd={(event) => {
                              const { active, over } = event
                              if (!over || active.id === over.id) return
                              moveChecklistItem(checklist.id, String(active.id), String(over.id))
                            }}
                          >
                            <SortableContext items={checklist.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-2">
                                {checklist.items.map((item) => (
                                  <ChecklistSortableItem
                                    key={item.id}
                                    checklistId={checklist.id}
                                    item={item}
                                    canMutate={canMutate}
                                    onToggle={(nextChecklistId, itemId, checked) => updateChecklistItem(nextChecklistId, itemId, { isCompleted: checked })}
                                    onChangeTitle={(nextChecklistId, itemId, title) => updateChecklistItem(nextChecklistId, itemId, { title })}
                                    onRemove={removeChecklistItem}
                                    onAddBelow={(nextChecklistId, itemId) => {
                                      const currentIndex = checklist.items.findIndex((checklistItem) => checklistItem.id === itemId)
                                      addChecklistItem(nextChecklistId, currentIndex + 1)
                                    }}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        ) : <div className="rounded-[1rem] border border-dashed border-white/10 px-4 py-4 text-sm text-white/38">Nenhum item ainda.</div>}
                      </div>

                      {canMutate ? <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/72 hover:border-white/18 hover:bg-white/[0.08] hover:text-white" onClick={() => addChecklistItem(checklist.id)}><Plus className="h-3.5 w-3.5" />Adicionar item</button> : null}
                    </div>
                  )) : <div className="rounded-[1.25rem] border border-dashed border-white/10 px-4 py-5 text-sm text-white/40">Ainda nao existe checklist neste card.</div>}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">Comentarios</h3>
                  <span className="text-sm text-white/45">{card.comments.length} itens</span>
                </div>
                <div className="mt-4 space-y-3">
                  {card.comments.map((item) => (
                    <div key={item.id} className="rounded-[1.2rem] border border-white/10 bg-slate-950/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{item.author.name}</p>
                        {canMutate ? <div className="flex gap-2"><button className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs" onClick={() => { setEditingCommentId(item.id); setEditingCommentContent(item.content) }}>Editar</button><button className="rounded-full border border-rose-400/18 bg-rose-500/8 px-3 py-1.5 text-xs" onClick={() => void onDeleteComment(item.id)}>Excluir</button></div> : null}
                      </div>
                      {editingCommentId === item.id ? <div className="mt-3 space-y-3"><textarea className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none" value={editingCommentContent} onChange={(event) => setEditingCommentContent(event.target.value)} /><div className="flex gap-2"><Button onClick={() => void onUpdateComment(item.id, editingCommentContent).then(() => { setEditingCommentId(''); setEditingCommentContent('') })}>Salvar</Button><Button variant="secondary" onClick={() => setEditingCommentId('')}>Cancelar</Button></div></div> : <><p className="mt-2 text-sm leading-6 text-white/65">{item.content}</p>{Array.isArray((item.mentions as { users?: string[] } | null)?.users) ? <div className="mt-3 flex flex-wrap gap-2">{((item.mentions as { users?: string[] }).users ?? []).map((mention) => <span key={mention} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200">@{mention}</span>)}</div> : null}</>}
                    </div>
                  ))}
                </div>
                {canMutate ? <div className="mt-4 space-y-3"><textarea className="min-h-24 w-full rounded-[1.35rem] border border-white/10 bg-slate-950/70 px-4 py-3 outline-none" placeholder="Adicionar comentario. Use @username para mencoes." value={comment} onChange={(event) => setComment(event.target.value)} /><Button onClick={() => { if (!comment.trim()) return; void onComment(comment.trim()); setComment('') }}>Comentar</Button></div> : null}
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">Historico do card</h3>
                  <span className="text-sm text-white/45">{card.activity.length} eventos</span>
                </div>
                <div className="mt-4 space-y-3">
                  {card.activity.length ? card.activity.map((item) => (
                    <div key={item.id} className="rounded-[1.2rem] border border-white/10 bg-slate-950/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{item.user.name}</p>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-white/35">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/62">{item.message}</p>
                    </div>
                  )) : <div className="rounded-[1.2rem] border border-dashed border-white/10 px-4 py-5 text-sm text-white/40">Nenhum evento deste card ainda.</div>}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <h3 className="font-medium">Atributos</h3>
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AnimatedSelect label="Prioridade" value={draft.priority} onChange={(value) => setDraft((current) => ({ ...current, priority: value }))} options={prioritySelectOptions} />
                    <AnimatedSelect label="Status" value={draft.status} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={statusSelectOptions} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DatePickerField label="Inicio" value={draft.startDate} disabled={!canMutate} onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))} />
                    <DatePickerField label="Prazo" value={draft.dueDate} align="right" disabled={!canMutate} onChange={(value) => setDraft((current) => ({ ...current, dueDate: value }))} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_88px]">
                    <DatePickerField label="Lembrete" value={draft.reminderAt} disabled={!canMutate} onChange={(value) => setDraft((current) => ({ ...current, reminderAt: value }))} />
                    <label className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 px-3 py-3">
                      <span className="text-[10px] uppercase tracking-[0.26em] text-white/42">Cor</span>
                      <input className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-transparent" type="color" disabled={!canMutate} value={draft.coverColor} onChange={(event) => setDraft((current) => ({ ...current, coverColor: event.target.value }))} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <h3 className="font-medium">Responsaveis</h3>
                <div className="mt-4 space-y-2">{boardMembers.map((member) => <label key={member.id} className="flex items-center gap-3 rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-3 py-3 hover:border-white/18"><input type="checkbox" disabled={!canMutate} checked={draft.memberIds.includes(member.id)} onChange={() => setDraft((current) => ({ ...current, memberIds: toggleId(current.memberIds, member.id) }))} /><span>{member.name}</span></label>)}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <h3 className="font-medium">Etiquetas</h3>
                <div className="mt-4 flex flex-wrap gap-2">{boardLabels.map((label) => <button key={label.id} type="button" disabled={!canMutate} className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white ${draft.labelIds.includes(label.id) ? 'opacity-100' : 'opacity-50'}`} style={{ backgroundColor: label.color, borderColor: 'rgba(255,255,255,0.15)' }} onClick={() => setDraft((current) => ({ ...current, labelIds: toggleId(current.labelIds, label.id) }))}>{label.name}</button>)}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">Anexos</h3>
                  {canMutate ? <label className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:border-white/20 hover:bg-white/8">Enviar<input className="hidden" multiple type="file" onChange={(event) => { const files = Array.from(event.target.files ?? []); void uploadFiles(files); event.currentTarget.value = '' }} /></label> : null}
                </div>
                {canMutate ? (
                  <div
                    className={`mt-4 rounded-[1.2rem] border border-dashed px-4 py-5 text-center text-sm transition ${isDragActive ? 'border-cyan-300 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-slate-950/45 text-white/50'}`}
                    onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true) }}
                    onDragOver={(event) => { event.preventDefault(); setIsDragActive(true) }}
                    onDragLeave={(event) => { event.preventDefault(); setIsDragActive(false) }}
                    onDrop={(event) => {
                      event.preventDefault()
                      const files = Array.from(event.dataTransfer.files ?? [])
                      void uploadFiles(files)
                    }}
                  >
                    {isUploading ? 'Enviando anexos...' : 'Arraste arquivos aqui ou use o botao enviar. Imagens e PDF ganham preview.'}
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  {card.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-[1.2rem] border border-white/10 bg-slate-950/60 p-4">
                      {attachment.mimeType?.startsWith('image/') ? (
                        <Image
                          alt={attachment.fileName}
                          className="mb-3 h-32 w-full rounded-xl object-cover"
                          height={128}
                          src={attachment.fileUrl}
                          unoptimized
                          width={480}
                        />
                      ) : null}
                      {attachment.mimeType === 'application/pdf' ? (
                        <iframe className="mb-3 h-56 w-full rounded-xl border border-white/10 bg-white" src={`${attachment.fileUrl}#view=FitH`} title={attachment.fileName} />
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <a className="text-sm font-medium text-cyan-200" href={attachment.fileUrl} target="_blank">{attachment.fileName}</a>
                        {canMutate ? <button className="rounded-full border border-rose-400/18 bg-rose-500/8 px-3 py-1.5 text-xs" onClick={() => void onDeleteAttachment(attachment.id)}>Remover</button> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {canMutate ? <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5"><div className="grid gap-3"><Button onClick={() => void onSave({ title: draft.title, description: draft.description || null, priority: draft.priority, status: draft.status, dueDate: draft.dueDate || null, startDate: draft.startDate || null, reminderAt: draft.reminderAt || null, coverColor: draft.coverColor, memberIds: draft.memberIds, labelIds: draft.labelIds, checklist: draft.checklist }).then(() => { lastSavedChecklistSnapshotRef.current = JSON.stringify(draft.checklist); lastSavedMetaSnapshotRef.current = metaSnapshot })}>Salvar alteracoes</Button><Button variant="secondary" onClick={() => void onDelete()}>Arquivar card</Button></div></div> : null}
            </aside>
          </div>
        </div>
        <aside className="min-h-0 overflow-y-auto border-t border-white/10 bg-[linear-gradient(180deg,rgba(5,10,20,0.62),rgba(5,10,20,0.76))] p-6 lg:border-t-0 lg:border-l">
          <h3 className="text-lg font-semibold">Resumo rapido</h3>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">Checklist</p>
              <p className="mt-2 text-sm text-white/72">{completedChecklistItems}/{checklistItems.length || 0}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">Comentarios</p>
              <p className="mt-2 text-sm text-white/72">{card.comments.length}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">Anexos</p>
              <p className="mt-2 text-sm text-white/72">{card.attachments.length}</p>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </div>
  )
}

export function BoardScreen({ initialBoard, currentUserId, initialSelectedCardId = null }: { initialBoard: BoardData; currentUserId: string; initialSelectedCardId?: string | null }) {
  const [board, setBoard] = useState(initialBoard)
  const [search, setSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [labelFilter, setLabelFilter] = useState('')
  const [dueFilter, setDueFilter] = useState('ALL')
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [newListTitle, setNewListTitle] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(initialSelectedCardId)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [activeDragCard, setActiveDragCard] = useState<BoardCard | null>(null)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const [focusedCardIndex, setFocusedCardIndex] = useState(0)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickListId, setQuickListId] = useState('')
  const deferredSearch = useDeferredValue(search)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const currentMember = board.members.find((member) => member.id === currentUserId)
  const canMutate = currentMember?.role !== 'VIEWER'

  const refreshBoard = async () => {
    const response = await fetch(`/api/boards/${board.id}`)
    if (!response.ok) return
    const data = await response.json()
    startTransition(() => setBoard(data.board))
  }
  const handleBoardUpdated = useEffectEvent((payload: { boardId: string }) => {
    if (payload.boardId === board.id) void refreshBoard()
  })

  useEffect(() => {
    return subscribeToBoard(board.id, handleBoardUpdated)
  }, [board.id])

  useEffect(() => {
    let active = true

    async function loadSavedFilters() {
      const response = await fetch(`/api/boards/${board.id}/filters`)
      const data = await response.json().catch(() => null)
      if (!response.ok || !active) return
      setSavedFilters(Array.isArray(data?.filters) ? data.filters : [])
    }

    void loadSavedFilters()
    return () => {
      active = false
    }
  }, [board.id])

  useEffect(() => {
    if (!undoAction) return
    const timeoutId = window.setTimeout(() => setUndoAction(null), 6000)
    return () => window.clearTimeout(timeoutId)
  }, [undoAction])

  const selectedCard = useMemo(() => board.lists.flatMap((list) => list.cards).find((card) => card.id === selectedCardId) ?? null, [board.lists, selectedCardId])
  const filteredLists = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const now = new Date()
    return board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => {
        const matchesQuery = !query || card.title.toLowerCase().includes(query) || (card.description ?? '').toLowerCase().includes(query)
        const matchesMember = !memberFilter || card.members.some((member) => member.id === memberFilter)
        const matchesPriority = !priorityFilter || card.priority === priorityFilter
        const matchesLabel = !labelFilter || card.labels.some((label) => label.id === labelFilter)
        const matchesDue = dueFilter === 'ALL' ? true : dueFilter === 'WITH_DUE' ? Boolean(card.dueDate) : isOverdueCard(card, now)
        return matchesQuery && matchesMember && matchesPriority && matchesLabel && matchesDue
      }),
    }))
  }, [board.lists, deferredSearch, memberFilter, priorityFilter, labelFilter, dueFilter])
  const filteredCards = filteredLists.flatMap((list) => list.cards)
  const visibleCardIds = filteredCards.map((card) => card.id)
  const allCardIds = useMemo(() => new Set(board.lists.flatMap((list) => list.cards.map((card) => card.id))), [board.lists])
  const effectiveSelectedCardIds = selectedCardIds.filter((id) => allCardIds.has(id))
  const hasBoardContent = board.lists.length > 0
  const hasFilteredResults = filteredCards.length > 0
  const clampedFocusedIndex = filteredCards.length ? Math.min(focusedCardIndex, filteredCards.length - 1) : 0
  const effectiveFocusedCardId = filteredCards.length ? filteredCards[clampedFocusedIndex]?.id ?? null : null
  const memberOptions = [{ value: '', label: 'Todos membros', hint: 'Sem filtro por responsavel' }, ...board.members.map((member) => ({ value: member.id, label: member.name, hint: `@${member.username}` }))]
  const priorityOptions = [{ value: '', label: 'Todas prioridades', hint: 'Mostra qualquer nivel' }, ...CARD_PRIORITIES.map((item) => ({ value: item, label: statusLabel(item), hint: `Prioridade ${statusLabel(item).toLowerCase()}` }))]
  const labelOptions = [{ value: '', label: 'Todas etiquetas', hint: 'Sem restricao por etiqueta' }, ...board.labels.map((label) => ({ value: label.id, label: label.name, hint: 'Filtrar por etiqueta' }))]
  const activeFilterCount = [Boolean(search.trim()), Boolean(memberFilter), Boolean(priorityFilter), Boolean(labelFilter), dueFilter !== 'ALL'].filter(Boolean).length

  async function persistView(nextView: BoardView) {
    startTransition(() => setBoard((current) => ({ ...current, defaultView: nextView })))
    await fetch(`/api/boards/${board.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultView: nextView }) }).catch(() => null)
  }

  function resetFilters() {
    setSearch('')
    setMemberFilter('')
    setPriorityFilter('')
    setLabelFilter('')
    setDueFilter('ALL')
  }

  function applySavedFilter(filter: SavedFilter) {
    setSearch(filter.filters.search ?? '')
    setMemberFilter(filter.filters.memberFilter ?? '')
    setPriorityFilter(filter.filters.priorityFilter ?? '')
    setLabelFilter(filter.filters.labelFilter ?? '')
    setDueFilter(filter.filters.dueFilter ?? 'ALL')
  }

  async function saveCurrentFilter(name: string) {
    const response = await fetch(`/api/boards/${board.id}/filters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        filters: {
          search,
          memberFilter,
          priorityFilter,
          labelFilter,
          dueFilter,
        },
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) return
    setSavedFilters((current) => [data.filter, ...current])
  }

  async function deleteSavedFilter(filterId: string) {
    const response = await fetch(`/api/boards/${board.id}/filters`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferenceId: filterId }),
    })
    if (!response.ok) return
    setSavedFilters((current) => current.filter((item) => item.id !== filterId))
  }

  function toggleSelectedCard(cardId: string) {
    setSelectedCardIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId])
  }

  function setUndo(label: string, onUndo: () => Promise<void>) {
    setUndoAction({ id: createLocalId('undo'), label, onUndo })
  }

  async function moveSelectedCard(direction: 'left' | 'right') {
    if (!effectiveFocusedCardId) return
    const sourceList = findListByCard(board.lists, effectiveFocusedCardId)
    if (!sourceList) return
    const currentIndex = board.lists.findIndex((list) => list.id === sourceList.id)
    const destinationIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1
    if (destinationIndex < 0 || destinationIndex >= board.lists.length) return

    const destinationList = board.lists[destinationIndex]
    const sourceCard = sourceList.cards.find((card) => card.id === effectiveFocusedCardId)
    if (!sourceCard) return

    const nextLists = board.lists.map((list) => ({ ...list, cards: [...list.cards] }))
    const sourceClone = nextLists.find((list) => list.id === sourceList.id)
    const destinationClone = nextLists.find((list) => list.id === destinationList.id)
    if (!sourceClone || !destinationClone) return

    sourceClone.cards = sourceClone.cards.filter((card) => card.id !== effectiveFocusedCardId)
    destinationClone.cards = [...destinationClone.cards, { ...sourceCard, listId: destinationClone.id }]

    const normalized = nextLists.map((list, listIndex) => ({
      ...list,
      sortOrder: listIndex,
      cards: list.cards.map((card, cardIndex) => ({ ...card, listId: list.id, sortOrder: cardIndex })),
    }))

    startTransition(() => setBoard((current) => ({ ...current, lists: normalized })))
    await persistReorder(normalized)
  }

  async function createList(title: string) {
    if (!title.trim()) return
    const response = await fetch(`/api/boards/${board.id}/lists`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    if (response.ok) { setNewListTitle(''); await refreshBoard() }
  }

  async function createCard(listId: string, title: string) {
    const response = await fetch(`/api/lists/${listId}/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    if (response.ok) await refreshBoard()
  }

  async function renameList(listId: string, title: string) {
    const response = await fetch(`/api/lists/${listId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
    if (response.ok) await refreshBoard()
  }

  async function deleteList(listId: string) {
    const response = await fetch(`/api/lists/${listId}`, { method: 'DELETE' })
    if (response.ok) await refreshBoard()
  }

  async function saveCard(cardId: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/cards/${cardId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (response.ok) await refreshBoard()
  }

  async function deleteCard(cardId: string) {
    const response = await fetch(`/api/cards/${cardId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isArchived: true }) })
    if (response.ok) {
      setSelectedCardId(null)
      setSelectedCardIds((current) => current.filter((id) => id !== cardId))
      setUndo('Card arquivado.', async () => {
        await saveCard(cardId, { isArchived: false })
      })
      await refreshBoard()
    }
  }

  async function addComment(cardId: string, content: string) {
    const response = await fetch(`/api/cards/${cardId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
    if (response.ok) await refreshBoard()
  }

  async function updateComment(commentId: string, content: string) {
    const response = await fetch(`/api/comments/${commentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
    if (response.ok) await refreshBoard()
  }

  async function deleteComment(commentId: string) {
    const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
    if (response.ok) await refreshBoard()
  }

  async function uploadAttachment(cardId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`/api/cards/${cardId}/attachments`, { method: 'POST', body: formData })
    if (response.ok) await refreshBoard()
  }

  async function deleteAttachment(attachmentId: string) {
    const response = await fetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' })
    if (response.ok) await refreshBoard()
  }

  async function toggleFavorite() {
    const response = await fetch(`/api/boards/${board.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isFavorite: !board.isFavorite }) })
    if (response.ok) startTransition(() => setBoard((current) => ({ ...current, isFavorite: !current.isFavorite })))
  }

  async function persistReorder(nextLists: BoardList[]) {
    const response = await fetch(`/api/boards/${board.id}/reorder`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reorderSnapshot(nextLists)) })
    if (response.ok) {
      const data = await response.json()
      startTransition(() => setBoard(data.board))
    } else {
      await refreshBoard()
    }
  }

  async function applyBulkPriority(nextPriority: string) {
    if (!effectiveSelectedCardIds.length) return
    await Promise.all(effectiveSelectedCardIds.map((cardId) => saveCard(cardId, { priority: nextPriority })))
    await refreshBoard()
  }

  async function archiveSelectedCards() {
    if (!effectiveSelectedCardIds.length) return
    const archivedIds = [...effectiveSelectedCardIds]
    await Promise.all(archivedIds.map((cardId) => saveCard(cardId, { isArchived: true })))
    setSelectedCardIds([])
    setUndo(`${archivedIds.length} card${archivedIds.length > 1 ? 's arquivados.' : ' arquivado.'}`, async () => {
      await Promise.all(archivedIds.map((cardId) => saveCard(cardId, { isArchived: false })))
    })
    await refreshBoard()
  }

  function handleDragStart(event: DragStartEvent) {
    const activeType = event.active.data.current?.type as 'list' | 'card' | undefined
    if (activeType === 'card') {
      const card = event.active.data.current?.card as BoardCard | undefined
      setActiveDragCard(card ?? null)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragCard(null)
    if (!canMutate) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeType = active.data.current?.type as 'list' | 'card' | undefined
    if (activeType === 'list') {
      const oldIndex = board.lists.findIndex((list) => list.id === active.id)
      const newIndex = board.lists.findIndex((list) => list.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const nextLists = arrayMove(board.lists, oldIndex, newIndex).map((list, index) => ({ ...list, sortOrder: index }))
      startTransition(() => setBoard((current) => ({ ...current, lists: nextLists })))
      await persistReorder(nextLists)
      return
    }
    const sourceList = findListByCard(board.lists, String(active.id))
    const destinationList = over.data.current?.type === 'list' ? board.lists.find((list) => list.id === over.id) : findListByCard(board.lists, String(over.id))
    if (!sourceList || !destinationList) return
    const nextLists = board.lists.map((list) => ({ ...list, cards: [...list.cards] }))
    const sourceClone = nextLists.find((list) => list.id === sourceList.id)
    const destinationClone = nextLists.find((list) => list.id === destinationList.id)
    const sourceCardIndex = sourceClone?.cards.findIndex((card) => card.id === active.id) ?? -1
    if (!sourceClone || !destinationClone || sourceCardIndex < 0) return
    const [sourceCard] = sourceClone.cards.splice(sourceCardIndex, 1)
    const insertIndex = over.data.current?.type === 'card' ? destinationClone.cards.findIndex((card) => card.id === over.id) : destinationClone.cards.length
    destinationClone.cards.splice(insertIndex < 0 ? destinationClone.cards.length : insertIndex, 0, { ...sourceCard, listId: destinationClone.id })
    const normalized = nextLists.map((list, listIndex) => ({ ...list, sortOrder: listIndex, cards: list.cards.map((card, cardIndex) => ({ ...card, listId: list.id, sortOrder: cardIndex })) }))
    startTransition(() => setBoard((current) => ({ ...current, lists: normalized })))
    await persistReorder(normalized)
  }

  const handleShortcutCreateList = useEffectEvent((title: string) => {
    void createList(title)
  })

  const handleShortcutMoveCard = useEffectEvent((direction: 'left' | 'right') => {
    void moveSelectedCard(direction)
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName
      const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true'

      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        searchRef.current?.focus()
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && canMutate) {
        event.preventDefault()
        setQuickOpen(true)
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l' && !isTyping && canMutate) {
        event.preventDefault()
        const title = window.prompt('Nome da nova lista')
        if (title) handleShortcutCreateList(title.trim())
      }

      if (event.key.toLowerCase() === 'c' && !isTyping && canMutate) {
        event.preventDefault()
        const focusedListId = effectiveFocusedCardId ? findListByCard(board.lists, effectiveFocusedCardId)?.id ?? '' : board.lists[0]?.id ?? ''
        setQuickListId(focusedListId)
        setQuickOpen(true)
      }

      if (event.shiftKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft') && effectiveFocusedCardId && canMutate) {
        event.preventDefault()
        handleShortcutMoveCard(event.key === 'ArrowRight' ? 'right' : 'left')
      }

      if (event.key === 'ArrowDown' && !isTyping) {
        event.preventDefault()
        setFocusedCardIndex((current) => Math.min(current + 1, filteredCards.length - 1))
      }

      if (event.key === 'ArrowUp' && !isTyping) {
        event.preventDefault()
        setFocusedCardIndex((current) => Math.max(current - 1, 0))
      }

      if (event.key === 'Enter' && !isTyping && effectiveFocusedCardId) {
        event.preventDefault()
        setSelectedCardId(effectiveFocusedCardId)
      }

      if (event.key === 'Escape') {
        setSelectedCardId(null)
        setQuickOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [board.lists, canMutate, effectiveFocusedCardId, filteredCards.length])

  return (
    <>
      <div className="glass-ring relative overflow-hidden rounded-[2.3rem] border border-white/10 px-7 py-8 text-white" style={{ background: board.background || 'linear-gradient(145deg,#0c1b33,#16335f)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_85%_80%,rgba(96,165,250,0.18),transparent_20%)] opacity-90" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-emerald-300" /><p className="text-[11px] uppercase tracking-[0.35em] text-cyan-100/85">{board.workspace.name}</p></div>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-6xl">{board.title}</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-white/78">{board.description || 'Quadro pronto para organizar listas, prioridades e comentarios.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">{canMutate ? <Button variant="secondary" onClick={() => setQuickOpen(true)}>Quick actions</Button> : null}<Button onClick={toggleFavorite}>{board.isFavorite ? 'Remover favorito' : 'Favoritar board'}</Button></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="glass-ring fade-up relative z-30 isolate border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(7,13,25,0.86))] text-white">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-3">{viewOptions.map((option) => <button key={option} className={cn('micro-bounce rounded-full border px-4 py-2.5 text-sm transition duration-200', board.defaultView === option ? 'border-cyan-300/20 bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-white shadow-[0_16px_35px_rgba(37,99,235,0.34)]' : 'border-white/10 bg-white/[0.04] text-white/65 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.07] hover:text-white')} onClick={() => void persistView(option)}>{statusLabel(option)}</button>)}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                  <span className="rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-1.5 text-cyan-100/88">{filteredCards.length} cards visiveis</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{activeFilterCount} filtros ativos</span>
                  {activeFilterCount ? <button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/72 hover:border-white/20 hover:text-white" onClick={resetFilters}>Limpar filtros</button> : null}
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,0.78fr))]">
                <div className="app-panel micro-bounce rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/62">
                      <Search className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Buscar</p>
                      <input ref={searchRef} className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25" placeholder="Titulo ou descricao" value={search} onChange={(event) => setSearch(event.target.value)} />
                    </div>
                  </div>
                </div>
                <AnimatedSelect label="Membros" value={memberFilter} onChange={setMemberFilter} options={memberOptions} />
                <AnimatedSelect label="Prioridade" value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions} />
                <AnimatedSelect label="Etiquetas" value={labelFilter} onChange={setLabelFilter} options={labelOptions} />
                <AnimatedSelect label="Prazos" value={dueFilter} onChange={setDueFilter} options={dueFilterOptions} align="right" />
              </div>
              <div className="flex flex-col gap-3 border-t border-white/8 pt-1 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-xs text-white/42">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-1.5 text-cyan-100/88">
                    <Sparkles className="h-3.5 w-3.5" />
                    Atalhos
                  </span>
                  <p>/ busca, Ctrl/Cmd + K acoes rapidas, Ctrl/Cmd + L nova lista, Shift + setas move card, Enter abre.</p>
                </div>
                {canMutate ? <div className="flex w-full gap-3 md:w-auto md:min-w-[360px]"><input className="micro-bounce w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none" placeholder="Nova lista" value={newListTitle} onChange={(event) => setNewListTitle(event.target.value)} /><Button onClick={() => void createList(newListTitle.trim())}>Criar lista</Button></div> : null}
              </div>
              {canMutate ? <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-white/60">{effectiveSelectedCardIds.length} selecionados</span><button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/72 hover:bg-white/[0.08] hover:text-white" onClick={() => setSelectedCardIds(visibleCardIds)}>Selecionar visiveis</button><button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/72 hover:bg-white/[0.08] hover:text-white" onClick={() => setSelectedCardIds([])}>Limpar selecao</button></div>{effectiveSelectedCardIds.length ? <div className="flex flex-wrap items-center gap-2"><button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/72 hover:bg-white/[0.08] hover:text-white" onClick={() => void applyBulkPriority('HIGH')}>Alta</button><button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/72 hover:bg-white/[0.08] hover:text-white" onClick={() => void applyBulkPriority('MEDIUM')}>Media</button><button className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/72 hover:bg-white/[0.08] hover:text-white" onClick={() => void applyBulkPriority('LOW')}>Baixa</button><button className="rounded-full border border-rose-400/18 bg-rose-500/8 px-3 py-1.5 text-xs text-rose-100/80 hover:bg-rose-500/15" onClick={() => void archiveSelectedCards()}>Arquivar selecionados</button></div> : <p className="text-xs text-white/42">Use o seletor de cada card para aplicar prioridade em lote ou arquivar com desfazer.</p>}</div> : null}
            </div>
          </Card>
          {board.defaultView === 'KANBAN' ? (
            !hasBoardContent ? (
              <EmptyBoardState
                title="Este board ainda nao tem listas"
                description="Crie a primeira lista para começar a distribuir cards, prioridades e fluxo de trabalho aqui dentro."
                actionLabel={canMutate ? 'Criar primeira lista' : undefined}
                onAction={canMutate ? () => void createList('Primeira lista') : undefined}
              />
            ) : !hasFilteredResults ? (
              <EmptyBoardState
                title="Nenhum card bate com os filtros atuais"
                description="A busca e os filtros zeraram o resultado. Ajuste os critérios ou limpe os filtros para recuperar o quadro."
                actionLabel={activeFilterCount ? 'Limpar filtros' : undefined}
                onAction={activeFilterCount ? resetFilters : undefined}
              />
            ) : (
              <div className="overflow-x-auto pb-5">
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragCancel={() => setActiveDragCard(null)} onDragEnd={(event) => void handleDragEnd(event)}>
                  <SortableContext items={board.lists.map((list) => list.id)} strategy={horizontalListSortingStrategy}>
                    <div className="flex min-h-[640px] items-start gap-5 pt-1">
                      {filteredLists.map((list, index) => (
                        <div key={list.id}>
                          <SortableList list={list} listIndex={index} canMutate={Boolean(canMutate)} focusedCardId={effectiveFocusedCardId} selectedCardIds={selectedCardIds} onToggleSelectedCard={toggleSelectedCard} onCreateCard={createCard} onRenameList={renameList} onDeleteList={deleteList} onOpenCard={(card) => { const nextIndex = filteredCards.findIndex((item) => item.id === card.id); if (nextIndex >= 0) setFocusedCardIndex(nextIndex); setSelectedCardId(card.id) }} />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay adjustScale={false}>
                    {activeDragCard ? <DraggingCardOverlay card={activeDragCard} /> : null}
                  </DragOverlay>
                </DndContext>
              </div>
            )
          ) : null}
          {board.defaultView === 'LIST' ? <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="text-white/42"><tr><th className="pb-3">Card</th><th className="pb-3">Lista</th><th className="pb-3">Prioridade</th><th className="pb-3">Prazo</th></tr></thead><tbody>{filteredLists.flatMap((list) => list.cards.map((card) => <tr key={card.id} className="border-t border-white/10"><td className="py-4"><button className="font-medium hover:text-cyan-200" onClick={() => setSelectedCardId(card.id)}>{card.title}</button></td><td className="py-4 text-white/58">{list.title}</td><td className="py-4 text-white/58">{statusLabel(card.priority)}</td><td className="py-4 text-white/58">{formatDate(card.dueDate)}</td></tr>))}</tbody></table></div></Card> : null}
          {board.defaultView === 'CALENDAR' ? <div className="grid gap-4 md:grid-cols-3">{filteredCards.filter((card) => card.dueDate).map((card) => <Card key={card.id} className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white"><button className="w-full text-left" onClick={() => setSelectedCardId(card.id)}><p className="text-xs uppercase tracking-[0.22em] text-white/40">{formatDate(card.dueDate)}</p><p className="mt-3 text-lg font-semibold">{card.title}</p><p className="mt-2 text-sm text-white/55">{card.description || 'Sem descricao.'}</p></button></Card>)}</div> : null}
          {board.defaultView === 'TIMELINE' ? <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white"><div className="space-y-4">{filteredCards.filter((card) => card.startDate || card.dueDate).map((card, index) => <div key={card.id} className="grid gap-4 md:grid-cols-[220px_1fr]"><button className="text-left font-medium hover:text-cyan-200" onClick={() => setSelectedCardId(card.id)}>{card.title}</button><div className="rounded-full border border-white/10 bg-black/10 p-2"><div className="h-6 rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6)]" style={{ width: `${28 + (index % 6) * 10}%` }} /></div></div>)}</div></Card> : null}
          {board.defaultView === 'DASHBOARD' ? (
            hasFilteredResults ? (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="app-rise app-panel border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white"><p className="text-sm uppercase tracking-[0.22em] text-white/42">Cards filtrados</p><p className="mt-4 text-5xl font-semibold">{filteredCards.length}</p></Card>
                <Card className="app-rise app-panel border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white" style={{ animationDelay: '40ms' }}><p className="text-sm uppercase tracking-[0.22em] text-white/42">Atrasados</p><p className="mt-4 text-5xl font-semibold">{filteredCards.filter((card) => isOverdueCard(card)).length}</p></Card>
                <Card className="app-rise app-panel border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white" style={{ animationDelay: '80ms' }}><p className="text-sm uppercase tracking-[0.22em] text-white/42">Concluidos</p><p className="mt-4 text-5xl font-semibold">{filteredCards.filter((card) => card.status === 'DONE').length}</p></Card>
              </div>
            ) : (
              <EmptyBoardState
                title="O dashboard ainda nao tem sinal suficiente"
                description="Assim que esse board tiver cards ativos, prazos ou progresso, o resumo executivo aparece aqui com mais valor."
                actionLabel={activeFilterCount ? 'Limpar filtros' : undefined}
                onAction={activeFilterCount ? resetFilters : undefined}
              />
            )
          ) : null}
        </div>
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <SavedFiltersPanel savedFilters={savedFilters} canMutate={Boolean(canMutate)} onApply={applySavedFilter} onSave={saveCurrentFilter} onDelete={deleteSavedFilter} />
          <Card className="glass-ring fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,14,25,0.82))] text-white"><div className="flex items-center justify-between gap-3"><p className="text-sm uppercase tracking-[0.24em] text-white/42">Membros do board</p><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">{board.members.length}</span></div><div className="mt-4 space-y-3">{board.members.map((member) => <div key={member.id} className="hover-lift rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.28)]" style={{ backgroundColor: member.avatarColor }}>{member.name.slice(0, 2).toUpperCase()}</span><div><p className="font-medium">{member.name}</p><p className="text-sm text-white/45">@{member.username} {member.role ? `• ${member.role}` : ''}</p></div></div></div>)}</div></Card>
          <Card className="glass-ring fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,14,25,0.82))] text-white"><div className="flex items-center justify-between gap-3"><p className="text-sm uppercase tracking-[0.24em] text-white/42">Atividade recente</p><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">{board.activity.length}</span></div><div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">{board.activity.map((item) => <div key={item.id} className="hover-lift rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4"><p className="text-sm font-semibold">{item.user.name}</p><p className="mt-2 text-sm leading-6 text-white/58">{item.message}</p><p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/32">{formatDate(item.createdAt)}</p></div>)}</div></Card>
        </aside>
      </div>

      {quickOpen && canMutate ? <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0b1528] p-6 text-white"><div className="flex items-center justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.24em] text-white/40">Acoes rapidas</p><h3 className="mt-2 text-2xl font-semibold">Criar sem perder contexto</h3></div><button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm" onClick={() => setQuickOpen(false)}>Fechar</button></div><div className="mt-5 space-y-4"><input className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3" placeholder="Titulo do card" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} /><select className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3" value={quickListId} onChange={(event) => setQuickListId(event.target.value)}><option value="">Escolha a lista</option>{board.lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</select><Button className="w-full" onClick={() => { if (!quickListId || !quickTitle.trim()) return; void createCard(quickListId, quickTitle.trim()).then(() => { setQuickOpen(false); setQuickTitle(''); setQuickListId('') }) }}>Criar agora</Button></div></div></div> : null}
      {selectedCard ? <CardModal key={selectedCard.id} card={selectedCard} boardMembers={board.members} boardLabels={board.labels} canMutate={Boolean(canMutate)} onClose={() => setSelectedCardId(null)} onSave={async (payload) => { await saveCard(selectedCard.id, payload) }} onDelete={async () => { await deleteCard(selectedCard.id) }} onComment={async (content) => { await addComment(selectedCard.id, content) }} onUpdateComment={async (commentId, content) => { await updateComment(commentId, content) }} onDeleteComment={async (commentId) => { await deleteComment(commentId) }} onUploadAttachment={async (file) => { await uploadAttachment(selectedCard.id, file) }} onDeleteAttachment={async (attachmentId) => { await deleteAttachment(attachmentId) }} /> : null}
      {undoAction ? <div className="app-fade fixed bottom-5 right-5 z-[75] max-w-md rounded-[1.4rem] border border-white/10 bg-[#091425] p-4 text-white shadow-[0_26px_90px_rgba(0,0,0,0.42)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">{undoAction.label}</p><p className="mt-1 text-xs text-white/45">Voce pode desfazer esta acao por alguns segundos.</p></div><button className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/55 hover:bg-white/[0.08] hover:text-white" onClick={() => setUndoAction(null)}><X className="h-4 w-4" /></button></div><div className="mt-4 flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setUndoAction(null)}>Fechar</Button><Button onClick={() => void undoAction.onUndo().then(() => setUndoAction(null))}>Desfazer</Button></div></div> : null}
    </>
  )
}

function DraggingCardOverlay({ card }: { card: BoardCard }) {
  const checklistTotal = card.checklistProgress.total || 0
  const checklistCompleted = card.checklistProgress.completed
  const checklistPercent = checklistTotal ? Math.round((checklistCompleted / checklistTotal) * 100) : 0

  return (
    <div className="w-[320px] rotate-[1.2deg] overflow-hidden rounded-[1.5rem] border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(11,18,33,0.98),rgba(7,12,24,0.96))] p-4 text-left text-white shadow-[0_28px_90px_rgba(8,145,178,0.22)]">
      {card.coverColor ? <div className="mb-3 h-2 rounded-full" style={{ backgroundColor: card.coverColor }} /> : null}
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-white">{card.title}</p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50">{statusLabel(card.priority)}</span>
      </div>
      {card.labels.length ? <div className="mt-3 flex flex-wrap gap-2">{card.labels.slice(0, 2).map((label) => <span key={label.id} className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white" style={{ backgroundColor: label.color }}>{label.name}</span>)}</div> : null}
      {card.description ? <p className="mt-3 text-sm leading-6 text-white/58">{card.description}</p> : null}
      {checklistTotal ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
            <span>Checklist</span>
            <span>{checklistCompleted}/{checklistTotal}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6)]" style={{ width: `${checklistPercent}%` }} />
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between text-xs text-white/45">
        <span>{card.comments.length} comentarios</span>
        <span>{formatDate(card.dueDate)}</span>
      </div>
    </div>
  )
}
