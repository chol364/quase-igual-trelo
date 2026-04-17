'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type UserMini = { id: string; name: string; username: string; avatarColor: string; role?: string; email?: string }
type LabelMini = { id: string; name: string; color: string }
type BoardCardMini = {
  id: string
  title: string
  description: string | null
  dueDate: string | Date | null
  startDate: string | Date | null
  priority: string
  status: string
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
type ArchiveSnapshot = {
  board: { id: string; title: string; isArchived: boolean }
  lists: Array<{ id: string; title: string; updatedAt: string | Date }>
  cards: Array<{ id: string; title: string; listId: string; listTitle: string; updatedAt: string | Date }>
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function SavedFiltersPanel({
  savedFilters,
  canMutate,
  onApply,
  onSave,
  onDelete,
}: {
  savedFilters: SavedFilter[]
  canMutate: boolean
  onApply: (filter: SavedFilter) => void
  onSave: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [name, setName] = useState('')

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,14,25,0.82))] text-white">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/42">Filtros salvos</p>
            <p className="mt-1 text-sm text-white/55">Guarde combinacoes frequentes por board.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">{savedFilters.length}</span>
        </div>
        {canMutate ? (
          <div className="flex gap-3">
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none"
              placeholder="Nome do filtro"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button
              onClick={() => {
                if (!name.trim()) return
                void onSave(name.trim()).then(() => setName(''))
              }}
            >
              Salvar
            </Button>
          </div>
        ) : null}
        <div className="space-y-3">
          {savedFilters.length ? (
            savedFilters.map((filter) => (
              <div key={filter.id} className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-3">
                <div>
                  <p className="font-medium">{filter.name}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {filter.filters.priorityFilter ? `Prioridade ${filter.filters.priorityFilter}` : 'Filtro amplo'}
                    {filter.filters.memberFilter ? ' • Membro definido' : ''}
                    {filter.filters.labelFilter ? ' • Etiqueta definida' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => onApply(filter)}>
                    Aplicar
                  </Button>
                  {canMutate ? (
                    <Button variant="secondary" onClick={() => void onDelete(filter.id)}>
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/48">
              Nenhum filtro salvo ainda.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function BoardMembersPanel({
  members,
  availableMembers,
  invitations,
  canManage,
  onInvite,
  onRoleChange,
  onRemove,
}: {
  members: UserMini[]
  availableMembers: UserMini[]
  invitations: Array<{ id: string; email: string; role: string; status: string; createdAt: string | Date }>
  canManage: boolean
  onInvite: (email: string, role: string) => Promise<void>
  onRoleChange: (userId: string, role: string) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')

  return (
    <Card className="glass-ring border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,14,25,0.82))] text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.24em] text-white/42">Membros do board</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">{members.length}</span>
      </div>

      {canManage ? (
        <div className="mt-4 space-y-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-3">
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none"
              placeholder="Email do membro"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <select className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
            <Button
              onClick={() => {
                if (!email.trim()) return
                void onInvite(email.trim(), role).then(() => setEmail(''))
              }}
            >
              Convidar ou adicionar
            </Button>
          </div>
          {availableMembers.length ? (
            <div className="rounded-[1.2rem] border border-white/10 bg-black/10 p-3 text-xs text-white/55">
              Disponiveis no workspace: {availableMembers.map((member) => member.name).join(', ')}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <div key={member.id} className="hover-lift rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: member.avatarColor }}>
                {member.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="truncate text-sm text-white/45">@{member.username}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {canManage ? (
                <select
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm"
                  value={member.role ?? 'MEMBER'}
                  onChange={(event) => void onRoleChange(member.id, event.target.value)}
                >
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/55">{member.role}</span>
              )}
              {canManage && member.role !== 'OWNER' ? (
                <Button variant="secondary" onClick={() => void onRemove(member.id)}>
                  Remover
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {invitations.length ? (
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-medium">Convites pendentes</p>
          <div className="mt-3 space-y-2">
            {invitations.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm">
                <div>
                  <p>{invite.email}</p>
                  <p className="text-xs text-white/45">{invite.role} • {formatDate(invite.createdAt)}</p>
                </div>
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">{invite.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

export function LabelsPanel({
  labels,
  canMutate,
  onCreate,
  onUpdate,
  onDelete,
}: {
  labels: LabelMini[]
  canMutate: boolean
  onCreate: (name: string, color: string) => Promise<void>
  onUpdate: (labelId: string, name: string, color: string) => Promise<void>
  onDelete: (labelId: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('#3b82f6')

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,14,25,0.82))] text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.24em] text-white/42">Etiquetas</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">{labels.length}</span>
      </div>

      {canMutate ? (
        <div className="mt-4 grid gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
          <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none" placeholder="Nome da etiqueta" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-2 py-2" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          <Button onClick={() => { if (!name.trim()) return; void onCreate(name.trim(), color).then(() => setName('')) }}>Criar etiqueta</Button>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {labels.length ? labels.map((label) => (
          <div key={label.id} className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-3">
            {editingId === label.id ? (
              <div className="space-y-3">
                <input className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                <input className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/70 px-2 py-2" type="color" value={editingColor} onChange={(event) => setEditingColor(event.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={() => void onUpdate(label.id, editingName, editingColor).then(() => setEditingId(''))}>Salvar</Button>
                  <Button variant="secondary" onClick={() => setEditingId('')}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full border border-white/15" style={{ backgroundColor: label.color }} />
                  <p className="font-medium">{label.name}</p>
                </div>
                {canMutate ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => { setEditingId(label.id); setEditingName(label.name); setEditingColor(label.color) }}>Editar</Button>
                    <Button variant="secondary" onClick={() => void onDelete(label.id)}>Excluir</Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/48">
            Nenhuma etiqueta personalizada ainda.
          </div>
        )}
      </div>
    </Card>
  )
}

export function ArchivePanel({
  snapshot,
  canMutate,
  onRefresh,
  onRestoreList,
  onRestoreCard,
  onToggleBoard,
}: {
  snapshot: ArchiveSnapshot | null
  canMutate: boolean
  onRefresh: () => Promise<void>
  onRestoreList: (listId: string) => Promise<void>
  onRestoreCard: (cardId: string) => Promise<void>
  onToggleBoard: (nextValue: boolean) => Promise<void>
}) {
  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,14,25,0.82))] text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/42">Arquivados</p>
          <p className="mt-1 text-sm text-white/55">Restaure listas, cards e o proprio board.</p>
        </div>
        <Button variant="secondary" onClick={() => void onRefresh()}>
          Atualizar
        </Button>
      </div>
      {snapshot ? (
        <div className="mt-4 space-y-4">
          {canMutate ? (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-medium">Estado do board</p>
              <p className="mt-2 text-sm text-white/55">{snapshot.board.isArchived ? 'Este board esta arquivado.' : 'Board ativo.'}</p>
              <div className="mt-3">
                <Button onClick={() => void onToggleBoard(!snapshot.board.isArchived)}>
                  {snapshot.board.isArchived ? 'Restaurar board' : 'Arquivar board'}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-medium">Listas arquivadas</p>
            <div className="mt-3 space-y-2">
              {snapshot.lists.length ? snapshot.lists.map((list) => (
                <div key={list.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm">
                  <div>
                    <p>{list.title}</p>
                    <p className="text-xs text-white/45">Atualizada em {formatDate(list.updatedAt)}</p>
                  </div>
                  {canMutate ? <Button variant="secondary" onClick={() => void onRestoreList(list.id)}>Restaurar</Button> : null}
                </div>
              )) : <p className="text-sm text-white/48">Nenhuma lista arquivada.</p>}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-medium">Cards arquivados</p>
            <div className="mt-3 space-y-2">
              {snapshot.cards.length ? snapshot.cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm">
                  <div>
                    <p>{card.title}</p>
                    <p className="text-xs text-white/45">{card.listTitle} • {formatDate(card.updatedAt)}</p>
                  </div>
                  {canMutate ? <Button variant="secondary" onClick={() => void onRestoreCard(card.id)}>Restaurar</Button> : null}
                </div>
              )) : <p className="text-sm text-white/48">Nenhum card arquivado.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/48">
          Nenhum snapshot de arquivados carregado ainda.
        </div>
      )}
    </Card>
  )
}

export function BoardCalendarView({
  cards,
  onOpenCard,
}: {
  cards: BoardCardMini[]
  onOpenCard: (cardId: string) => void
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const startWeekday = (monthStart.getDay() + 6) % 7
  const daysInMonth = monthEnd.getDate()
  const dayCells = Array.from({ length: startWeekday + daysInMonth }, (_, index) => {
    const dayNumber = index - startWeekday + 1
    if (dayNumber <= 0 || dayNumber > daysInMonth) return null
    const dayDate = new Date(cursor.getFullYear(), cursor.getMonth(), dayNumber)
    const items = cards.filter((card) => {
      if (!card.dueDate) return false
      const due = new Date(card.dueDate)
      return due.getFullYear() === dayDate.getFullYear() && due.getMonth() === dayDate.getMonth() && due.getDate() === dayDate.getDate()
    })
    return { dayNumber, items }
  })

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/42">Calendario mensal</p>
          <h3 className="mt-2 text-2xl font-semibold">
            {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(cursor)}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCursor((current) => addMonths(current, -1))}>Anterior</Button>
          <Button variant="secondary" onClick={() => setCursor(startOfMonth(new Date()))}>Hoje</Button>
          <Button variant="secondary" onClick={() => setCursor((current) => addMonths(current, 1))}>Proximo</Button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-3 text-xs uppercase tracking-[0.2em] text-white/38">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((item) => <div key={item} className="px-2">{item}</div>)}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-3">
        {dayCells.map((cell, index) => (
          <div key={`${cell?.dayNumber ?? 'blank'}-${index}`} className="min-h-[150px] rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
            {cell ? (
              <>
                <p className="text-sm font-medium text-white/75">{cell.dayNumber}</p>
                <div className="mt-3 space-y-2">
                  {cell.items.slice(0, 4).map((card) => (
                    <button key={card.id} className="block w-full rounded-xl border border-white/10 bg-cyan-500/10 px-3 py-2 text-left text-xs text-cyan-100 transition hover:bg-cyan-500/20" onClick={() => onOpenCard(card.id)}>
                      {card.title}
                    </button>
                  ))}
                  {cell.items.length > 4 ? <p className="text-xs text-white/45">+{cell.items.length - 4} cards</p> : null}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
}

export function BoardTimelineView({
  cards,
  onOpenCard,
}: {
  cards: BoardCardMini[]
  onOpenCard: (cardId: string) => void
}) {
  const rangedCards = useMemo(() => cards.filter((card) => card.startDate || card.dueDate), [cards])
  const timelineStart = useMemo(() => {
    if (!rangedCards.length) return new Date()
    return new Date(Math.min(...rangedCards.map((card) => new Date(card.startDate ?? card.dueDate ?? new Date()).getTime())))
  }, [rangedCards])
  const timelineEnd = useMemo(() => {
    if (!rangedCards.length) return new Date()
    return new Date(Math.max(...rangedCards.map((card) => new Date(card.dueDate ?? card.startDate ?? new Date()).getTime())))
  }, [rangedCards])
  const totalMs = Math.max(timelineEnd.getTime() - timelineStart.getTime(), 1000 * 60 * 60 * 24)

  const markers = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(timelineStart.getTime() + (totalMs / 5) * index)
    return {
      key: index,
      label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date),
    }
  })

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.9),rgba(8,14,25,0.82))] text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/42">Timeline real</p>
          <h3 className="mt-2 text-2xl font-semibold">Faixas por intervalo de execucao</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">{rangedCards.length} cards</span>
      </div>
      <div className="mt-5 grid grid-cols-[220px_1fr] gap-4 text-xs uppercase tracking-[0.2em] text-white/38">
        <div />
        <div className="grid grid-cols-6 gap-2">
          {markers.map((marker) => <div key={marker.key}>{marker.label}</div>)}
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {rangedCards.length ? rangedCards.map((card) => {
          const start = new Date(card.startDate ?? card.dueDate ?? timelineStart)
          const end = new Date(card.dueDate ?? card.startDate ?? timelineEnd)
          const left = ((start.getTime() - timelineStart.getTime()) / totalMs) * 100
          const width = Math.max(((end.getTime() - start.getTime()) / totalMs) * 100, 6)
          return (
            <div key={card.id} className="grid grid-cols-[220px_1fr] gap-4">
              <button className="text-left" onClick={() => onOpenCard(card.id)}>
                <p className="font-medium hover:text-cyan-200">{card.title}</p>
                <p className="mt-1 text-sm text-white/52">{card.startDate ? formatDate(card.startDate) : 'Sem inicio'} → {card.dueDate ? formatDate(card.dueDate) : 'Sem prazo'}</p>
              </button>
              <div className="relative rounded-full border border-white/10 bg-black/10 p-2">
                <div className="relative h-7 rounded-full bg-white/[0.03]">
                  <div className="absolute inset-y-0 rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6)] shadow-[0_10px_35px_rgba(59,130,246,0.28)]" style={{ left: `${Math.max(left, 0)}%`, width: `${Math.min(width, 100)}%` }} />
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/48">
            Nenhum card com intervalo de datas para exibir na timeline.
          </div>
        )}
      </div>
    </Card>
  )
}
