"use client"

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { slugify } from '@/lib/utils/slug'

interface WorkspaceItem {
  id: string
  name: string
  slug: string
  description?: string | null
  visibility: string
  membersCount: number
  boards: Array<{
    id: string
    title: string
    slug: string
    isFavorite: boolean
    background: string | null
  }>
}

export function WorkspacesClient({ initialWorkspaces }: { initialWorkspaces: WorkspaceItem[] }) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    visibility: 'PRIVATE',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createWorkspace() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        slug: form.slug || slugify(form.name),
      }),
    })

    const data = await response.json()
    setLoading(false)

    if (!response.ok) {
      setError(data.error || 'Falha ao criar workspace.')
      return
    }

    setWorkspaces((current) => [data.workspace, ...current])
    setForm({ name: '', slug: '', description: '', visibility: 'PRIVATE' })
  }

  async function deleteWorkspace(id: string) {
    const response = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
    if (response.ok) {
      setWorkspaces((current) => current.filter((workspace) => workspace.id !== id))
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
      <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,13,24,0.84))] text-white">
        <div className="space-y-5">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/42">Novo espaco</p>
            <h2 className="mt-2 text-2xl font-semibold">Criar area de trabalho</h2>
            <p className="mt-3 text-sm leading-6 text-white/54">
              Defina um contexto novo para separar clientes, produtos, squads ou frentes operacionais.
            </p>
          </div>

          <input
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
                slug: current.slug ? current.slug : slugify(event.target.value),
              }))
            }
            placeholder="Nome do espaco"
          />

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Slug automatico</p>
            <div className="mt-2 flex items-center gap-3">
              <input
                className="w-full bg-transparent text-sm text-white/78 outline-none"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                placeholder="sera gerado automaticamente"
              />
              <button
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10"
                onClick={() => setForm((current) => ({ ...current, slug: slugify(current.name) }))}
                type="button"
              >
                Gerar
              </button>
            </div>
          </div>

          <textarea
            className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Descricao opcional"
          />

          <select
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            value={form.visibility}
            onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))}
          >
            <option value="PRIVATE">Privado</option>
            <option value="PUBLIC">Publico</option>
          </select>

          {error ? <p className="rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

          <Button className="w-full" disabled={loading} onClick={createWorkspace}>
            {loading ? 'Criando...' : 'Criar workspace'}
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        {workspaces.map((workspace, index) => (
          <Card
            key={workspace.id}
            className="stagger-rise border-white/10 bg-[linear-gradient(180deg,rgba(10,17,31,0.92),rgba(8,13,24,0.82))] text-white"
            style={{ animationDelay: `${index * 90 + 120}ms` }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold">{workspace.name}</h3>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/50">
                    {workspace.visibility}
                  </span>
                </div>
                <p className="max-w-xl text-white/60">{workspace.description || 'Sem descricao.'}</p>
                <div className="flex flex-wrap gap-3 text-sm text-white/42">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{workspace.membersCount} membros</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{workspace.boards.length} boards</span>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium shadow-[0_16px_30px_rgba(59,130,246,0.25)] transition hover:-translate-y-0.5" href={`/workspaces/${workspace.slug}`}>
                    Abrir workspace
                  </Link>
                  <Button variant="secondary" onClick={() => deleteWorkspace(workspace.id)}>
                    Excluir
                  </Button>
                </div>
              </div>

              <div className="grid min-w-[300px] gap-3 md:grid-cols-2">
                {workspace.boards.length ? (
                  workspace.boards.slice(0, 4).map((board) => (
                    <Link
                      key={board.id}
                      href={`/boards/${board.slug}`}
                      className="hover-lift rounded-[1.5rem] border border-white/10 p-4 transition"
                      style={{ background: board.background || '#14243c' }}
                    >
                      <p className="font-medium">{board.title}</p>
                      <p className="mt-2 text-sm text-white/75">{board.isFavorite ? 'Favorito' : 'Board ativo'}</p>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/48">
                    Nenhum board criado ainda neste espaco.
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </section>
    </div>
  )
}
