'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type CommandItem = {
  id: string
  label: string
  hint: string
  href: string
  section: string
}

export function CommandPalette({ items }: { items: CommandItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }

      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) =>
      item.label.toLowerCase().includes(normalized) ||
      item.hint.toLowerCase().includes(normalized) ||
      item.section.toLowerCase().includes(normalized)
    )
  }, [items, query])

  if (!open) {
    return (
      <button
        className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white xl:inline-flex"
        onClick={() => setOpen(true)}
        type="button"
      >
        Buscar acoes
        <span className="ml-3 rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[11px] text-white/35">Ctrl+Shift+K</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/60 p-4 pt-[12vh] backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#091425] p-5 text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/42">Command palette</p>
            <h3 className="mt-2 text-2xl font-semibold">Acoes e navegacao</h3>
          </div>
          <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm" onClick={() => setOpen(false)} type="button">
            Fechar
          </button>
        </div>
        <input
          autoFocus
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none"
          placeholder="Buscar pagina, board ou acao..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-5 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {filtered.length ? filtered.map((item) => (
            <button
              key={item.id}
              className="flex w-full items-center justify-between rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:bg-white/[0.08]"
              onClick={() => {
                setOpen(false)
                router.push(item.href)
              }}
              type="button"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-white/48">{item.hint}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/40">{item.section}</span>
            </button>
          )) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/48">
              Nenhuma acao encontrada para essa busca.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
