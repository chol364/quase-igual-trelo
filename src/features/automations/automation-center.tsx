'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type WorkspaceOption = {
  id: string
  name: string
  boards: Array<{ id: string; title: string; slug: string }>
}

type AutomationRule = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  workspace: { id: string; name: string }
  board: { id: string; title: string } | null
  triggers: Array<{ id: string; type: string; config: Record<string, unknown> | null }>
  actions: Array<{ id: string; type: string; config: Record<string, unknown> | null }>
}

const triggerOptions = [
  { value: 'card.created', label: 'Card criado' },
  { value: 'card.moved', label: 'Card movido' },
  { value: 'card.status.changed', label: 'Status alterado' },
] as const

const actionOptions = [
  { value: 'notify.assignee', label: 'Notificar responsavel' },
  { value: 'move.card', label: 'Mover card' },
] as const

const presets = [
  {
    id: 'done-notify',
    title: 'Quando concluir, notifique',
    description: 'Ao alterar status, avisa o responsavel imediatamente.',
    triggerType: 'card.status.changed',
    actionType: 'notify.assignee',
    actionValue: 'Card concluido',
  },
  {
    id: 'created-move',
    title: 'Novo card vai para triagem',
    description: 'Quando um card entrar, empurra para a lista de triagem.',
    triggerType: 'card.created',
    actionType: 'move.card',
    actionValue: 'Triagem',
  },
  {
    id: 'moved-notify',
    title: 'Mudou de etapa, avise',
    description: 'Qualquer movimento relevante gera aviso para a pessoa dona do card.',
    triggerType: 'card.moved',
    actionType: 'notify.assignee',
    actionValue: 'Card mudou de etapa',
  },
] as const

function humanizeRule(value: string) {
  return value
    .replace('card.', 'card ')
    .replace('.', ' ')
    .replace('status changed', 'status alterado')
    .replace('notify assignee', 'notificar responsavel')
    .replace('move card', 'mover card')
}

export function AutomationCenter() {
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState({
    workspaceId: '',
    boardId: '',
    name: '',
    description: '',
    triggerType: 'card.created',
    actionType: 'notify.assignee',
    actionValue: '',
  })

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === draft.workspaceId) ?? workspaces[0] ?? null,
    [draft.workspaceId, workspaces]
  )

  useEffect(() => {
    async function load() {
      const [workspacesResponse, rulesResponse] = await Promise.all([
        fetch('/api/workspaces'),
        fetch('/api/automations'),
      ])

      if (workspacesResponse.ok) {
        const data = await workspacesResponse.json()
        setWorkspaces(data.workspaces)
        if (!draft.workspaceId && data.workspaces.length) {
          setDraft((current) => ({ ...current, workspaceId: data.workspaces[0].id }))
        }
      }

      if (rulesResponse.ok) {
        const data = await rulesResponse.json()
        setRules(data.rules)
      }
    }

    void load()
  }, [draft.workspaceId])

  async function createRule() {
    if (!draft.workspaceId || draft.name.trim().length < 3) return
    setLoading(true)
    const response = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: draft.workspaceId,
        boardId: draft.boardId || null,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        triggerType: draft.triggerType,
        triggerConfig: { field: draft.actionValue || null },
        actionType: draft.actionType,
        actionConfig: {
          targetList: draft.actionType === 'move.card' ? draft.actionValue || null : null,
          message: draft.actionType === 'notify.assignee' ? draft.actionValue || null : null,
        },
      }),
    })

    setLoading(false)
    if (!response.ok) return
    const data = await response.json()
    setRules((current) => [data.rule, ...current])
    setDraft((current) => ({ ...current, name: '', description: '', actionValue: '' }))
  }

  async function toggleRule(ruleId: string, nextValue: boolean) {
    const response = await fetch(`/api/automations/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: nextValue }),
    })
    if (!response.ok) return
    const data = await response.json()
    setRules((current) => current.map((rule) => (rule.id === ruleId ? data.rule : rule)))
  }

  async function removeRule(ruleId: string) {
    const response = await fetch(`/api/automations/${ruleId}`, { method: 'DELETE' })
    if (!response.ok) return
    setRules((current) => current.filter((rule) => rule.id !== ruleId))
  }

  return (
    <div className="space-y-6">
      <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,23,42,.94),rgba(21,37,68,.82))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Automacoes</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Regras visuais para o fluxo</h1>
            <p className="mt-4 max-w-3xl text-white/62">Monte automacoes em formato de gatilho e acao, com escopo por workspace ou board.</p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70">
            <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white">No-code</span>
            {rules.length} regras
          </div>
        </div>
      </section>

      <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/45">Criar nova regra</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                value={draft.workspaceId}
                onChange={(event) => setDraft((current) => ({ ...current, workspaceId: event.target.value, boardId: '' }))}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                value={draft.boardId}
                onChange={(event) => setDraft((current) => ({ ...current, boardId: event.target.value }))}
              >
                <option value="">Todas as boards</option>
                {selectedWorkspace?.boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/35 hover:bg-cyan-500/8"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      name: preset.title,
                      description: preset.description,
                      triggerType: preset.triggerType,
                      actionType: preset.actionType,
                      actionValue: preset.actionValue,
                    }))
                  }
                >
                  <p className="text-sm font-semibold text-white">{preset.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{preset.description}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                value={draft.triggerType}
                onChange={(event) => setDraft((current) => ({ ...current, triggerType: event.target.value }))}
              >
                {triggerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                value={draft.actionType}
                onChange={(event) => setDraft((current) => ({ ...current, actionType: event.target.value }))}
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                placeholder="Nome da regra"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                placeholder={draft.actionType === 'move.card' ? 'Lista alvo' : 'Mensagem da notificacao'}
                value={draft.actionValue}
                onChange={(event) => setDraft((current) => ({ ...current, actionValue: event.target.value }))}
              />
            </div>

            <textarea
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none"
              placeholder="Descricao opcional"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/45">Visao da regra</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-3xl border border-cyan-400/15 bg-cyan-500/8 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Escopo</p>
                  <p className="mt-2 text-sm font-medium text-white">{selectedWorkspace?.name ?? 'Sem workspace'}</p>
                  <p className="mt-1 text-sm text-white/60">{selectedWorkspace?.boards.find((board) => board.id === draft.boardId)?.title ?? 'Todas as boards do workspace'}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Gatilho</p>
                  <p className="mt-2 text-sm font-medium text-white">{triggerOptions.find((item) => item.value === draft.triggerType)?.label}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Acao</p>
                  <p className="mt-2 text-sm font-medium text-white">{actionOptions.find((item) => item.value === draft.actionType)?.label}</p>
                  {draft.actionValue ? <p className="mt-2 text-sm text-white/60">{draft.actionValue}</p> : null}
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Fluxo visual</p>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white/80">
                  {triggerOptions.find((item) => item.value === draft.triggerType)?.label}
                </div>
                <div className="text-cyan-300">→</div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-cyan-100">
                  {actionOptions.find((item) => item.value === draft.actionType)?.label}
                </div>
              </div>
            </div>

            <Button className="w-full" disabled={loading} onClick={createRule}>
              {loading ? 'Salvando...' : 'Salvar regra'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.24em] text-white/35">
                  <span>{rule.workspace.name}</span>
                  {rule.board ? <span>• {rule.board.title}</span> : null}
                </div>
                <h2 className="text-xl font-semibold">{rule.name}</h2>
                {rule.description ? <p className="text-sm text-white/60">{rule.description}</p> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-full px-4 py-2 text-sm ${rule.isActive ? 'bg-cyan-500 text-white' : 'border border-white/10 bg-white/[0.04] text-white/60'}`}
                  onClick={() => void toggleRule(rule.id, !rule.isActive)}
                >
                  {rule.isActive ? 'Ativa' : 'Inativa'}
                </button>
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70" onClick={() => void removeRule(rule.id)}>
                  Excluir
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {rule.triggers.map((trigger) => (
                <div key={trigger.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Gatilho</p>
                  <p className="mt-2 text-sm font-medium text-white">{humanizeRule(trigger.type)}</p>
                  {trigger.config?.field ? <p className="mt-2 text-sm text-white/60">{String(trigger.config.field)}</p> : null}
                </div>
              ))}
              {rule.actions.map((action) => (
                <div key={action.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Acao</p>
                  <p className="mt-2 text-sm font-medium text-white">{humanizeRule(action.type)}</p>
                  {action.config?.targetList ? <p className="mt-2 text-sm text-white/60">Lista: {String(action.config.targetList)}</p> : null}
                  {action.config?.message ? <p className="mt-2 text-sm text-white/60">Mensagem: {String(action.config.message)}</p> : null}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
