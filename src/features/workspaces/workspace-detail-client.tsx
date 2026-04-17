'use client'

import Link from 'next/link'
import { startTransition, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { boardTemplates, type BoardTemplateId } from '@/lib/domain/templates'
import { slugify } from '@/lib/utils/slug'

interface WorkspaceBoard {
  id: string
  title: string
  slug: string
  description: string | null
  background: string | null
  isFavorite: boolean
  updatedAt: string | Date
}

interface WorkspaceMember {
  id: string
  role: string
  name: string
  username: string
  email: string
  avatarColor: string
}

interface WorkspaceInvitation {
  id: string
  email: string
  role: string
  status: string
  createdAt: string | Date
}

interface WorkspaceDetail {
  id: string
  name: string
  slug: string
  description: string | null
  visibility: string
  boards: WorkspaceBoard[]
  members: WorkspaceMember[]
  invitations: WorkspaceInvitation[]
}

const boardPalettes = [
  '#15315c',
  'linear-gradient(135deg,#17325d,#0b5cab)',
  'linear-gradient(135deg,#1e293b,#0f766e)',
  'linear-gradient(135deg,#3b1f58,#9d174d)',
  'linear-gradient(135deg,#402116,#b45309)',
]

function formatUpdatedAt(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function WorkspaceDetailClient({ initialWorkspace, currentUserId }: { initialWorkspace: WorkspaceDetail; currentUserId: string }) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [inviteMessage, setInviteMessage] = useState('')
  const [form, setForm] = useState<{
    title: string
    slug: string
    description: string
    background: string
    templateId: BoardTemplateId
  }>({
    title: '',
    slug: '',
    description: '',
    background: boardPalettes[1],
    templateId: boardTemplates[0].id,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const generatedSlug = useMemo(() => slugify(form.slug || form.title), [form.slug, form.title])
  const favoriteBoardsCount = workspace.boards.filter((board) => board.isFavorite).length
  const currentUserRole = workspace.members.find((member) => member.id === currentUserId)?.role
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  async function refreshMembers() {
    const response = await fetch(`/api/workspaces/${workspace.id}/members`)
    if (!response.ok) return
    const data = await response.json()
    setWorkspace((current) => ({
      ...current,
      members: data.members,
      invitations: data.invitations,
    }))
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) {
      setInviteMessage('Informe um e-mail válido para convite.')
      return
    }

    setInviteMessage('')
    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      setInviteMessage(data?.error || 'Falha ao enviar convite.')
      return
    }

    if (data.member) {
      await refreshMembers()
      setInviteMessage('Membro adicionado com sucesso.')
    }

    if (data.invitation) {
      await refreshMembers()
      setInviteMessage('Convite enviado e pendente.')
    }

    setInviteEmail('')
  }

  async function updateMemberRole(userId: string, role: string) {
    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      setInviteMessage(data?.error || 'Nao foi possivel alterar o papel.')
      return
    }
    await refreshMembers()
    setInviteMessage('Papel atualizado com sucesso.')
  }

  async function createBoard() {
    if (!form.title.trim()) {
      setError('Informe um nome para o board.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const response = await fetch(`/api/workspaces/${workspace.id}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        slug: generatedSlug,
        description: form.description.trim(),
        background: form.background,
        templateId: form.templateId,
      }),
    })

    const data = await response.json().catch(() => null)
    setLoading(false)

    if (!response.ok) {
      setError(data?.error || 'Falha ao criar board.')
      return
    }

    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        boards: [
          {
            ...data.board,
            description: data.board.description ?? null,
            updatedAt: new Date().toISOString(),
          },
          ...current.boards,
        ],
      }))
      setForm({ title: '', slug: '', description: '', background: boardPalettes[1], templateId: boardTemplates[0].id })
      setSuccess('Board criado. Clique em abrir para entrar.')
    })
  }

  async function toggleFavorite(boardId: string, nextValue: boolean) {
    const response = await fetch(`/api/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: nextValue }),
    })

    if (!response.ok) return

    startTransition(() => {
      setWorkspace((current) => ({
        ...current,
        boards: current.boards.map((board) =>
          board.id === boardId ? { ...board, isFavorite: nextValue } : board
        ),
      }))
    })
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(11,18,32,0.94),rgba(13,24,42,0.8))] text-white">
          <div className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Workspace</p>
              <h2 className="mt-3 text-3xl font-semibold">{workspace.name}</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {workspace.description || 'Sem descricao configurada ainda.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Boards</p>
                <p className="mt-2 text-3xl font-semibold">{workspace.boards.length}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Favoritos</p>
                <p className="mt-2 text-3xl font-semibold">{favoriteBoardsCount}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Membros</p>
                <p className="mt-2 text-3xl font-semibold">{workspace.members.length}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,13,24,0.82))] text-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Membros</p>
                <p className="text-xs text-white/45">Convite por e-mail e troca de papel inline</p>
              </div>
              {canManage ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Administracao</span> : null}
            </div>
            {canManage ? (
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-white/45">Convidar membro</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none"
                    placeholder="Email do convidado"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 items-center">
                  <button className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-cyan-400" onClick={() => void inviteMember()}>
                    Enviar convite
                  </button>
                  {inviteMessage ? <span className="text-sm text-emerald-200">{inviteMessage}</span> : null}
                </div>
              </div>
            ) : null}

            {workspace.invitations.length ? (
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-white/45">Convites pendentes</p>
                <div className="mt-4 space-y-3">
                  {workspace.invitations.map((invite) => (
                    <div key={invite.id} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white/75">
                      <p>{invite.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">{invite.role} · {invite.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-2 space-y-3">
              {workspace.members.map((member) => (
                <div
                  key={member.id}
                  className="hover-lift flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{member.username}</p>
                      <p className="mt-1 text-xs text-white/55">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Papel</p>
                    <select
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm"
                      value={member.role}
                      disabled={!canManage}
                      onChange={(event) => void updateMemberRole(member.id, event.target.value)}
                    >
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,13,24,0.82))] text-white">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Criar board</p>
              <p className="mt-1 text-sm text-white/45">O slug e gerado automaticamente a partir do titulo.</p>
            </div>

            <input
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-cyan-300/60"
              placeholder="Nome do board"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white/65 outline-none"
              value={generatedSlug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="slug-do-board"
            />
            <textarea
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-cyan-300/60"
              placeholder="Descricao opcional"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-cyan-300/60"
              value={form.templateId}
              onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value as BoardTemplateId }))}
            >
              {boardTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-5 gap-2">
              {boardPalettes.map((palette) => (
                <button
                  key={palette}
                  type="button"
                  className={`h-11 rounded-2xl border transition ${
                    form.background === palette ? 'border-cyan-300 scale-[1.03]' : 'border-white/10'
                  }`}
                  style={{ background: palette }}
                  onClick={() => setForm((current) => ({ ...current, background: palette }))}
                />
              ))}
            </div>

            {error ? <p className="rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            {success ? <p className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}

            <Button className="w-full" disabled={loading} onClick={createBoard}>
              {loading ? 'Criando...' : 'Criar board'}
            </Button>
          </div>
        </Card>
      </aside>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Boards</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">Seu hub de quadros</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/55">
            {workspace.visibility}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {workspace.boards.map((board, index) => (
            <article
              key={board.id}
              className="fade-up hover-lift group rounded-[1.85rem] border border-white/10 p-5 text-white shadow-xl"
              style={{ background: board.background || '#17325d', animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/55">Board</p>
                  <h4 className="mt-3 text-3xl font-semibold leading-tight">{board.title}</h4>
                </div>
                <button
                  className="rounded-full border border-white/20 bg-black/15 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/75 transition hover:bg-black/25"
                  onClick={() => void toggleFavorite(board.id, !board.isFavorite)}
                >
                  {board.isFavorite ? 'Favorito' : 'Salvar'}
                </button>
              </div>

              <p className="mt-5 min-h-20 text-sm leading-7 text-white/78">
                {board.description || 'Organize entregas, prioridades e execucao neste quadro.'}
              </p>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.25em] text-white/55">
                  Atualizado {formatUpdatedAt(board.updatedAt)}
                </p>
                <Link
                  href={`/boards/${board.slug}`}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
                >
                  Abrir board
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
