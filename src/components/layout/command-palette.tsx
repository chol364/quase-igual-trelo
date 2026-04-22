'use client'

import { Search } from 'lucide-react'
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
  const [activeIndex, setActiveIndex] = useState(0)

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

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)))
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => Math.max(current - 1, 0))
      }

      if (event.key === 'Enter' && filtered[activeIndex]) {
        event.preventDefault()
        setOpen(false)
        router.push(filtered[activeIndex].href)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, filtered, open, router])

  if (!open) {
    return (
      <button
        className="micro-bounce hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white xl:inline-flex"
        onClick={() => {
          setQuery('')
          setActiveIndex(0)
          setOpen(true)
        }}
        type="button"
      >
        Buscar acoes
        <span className="ml-3 rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[11px] text-white/35">Ctrl+Shift+K</span>
      </button>
    )
  }

  return (
    <div className="app-fade fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/68 p-4 pt-[10vh] backdrop-blur-md">
      <div className="app-panel app-rise w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#091425] p-5 text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/42">Command palette</p>
            <h3 className="mt-2 text-2xl font-semibold">Acoes e navegacao</h3>
          </div>
          <button className="micro-bounce rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm" onClick={() => setOpen(false)} type="button">
            Fechar
          </button>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/55">
              <Search className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.26em] text-white/38">Busca rapida</p>
              <input
                autoFocus
                className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                placeholder="Buscar pagina, board ou acao..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
              />
            </div>
            <span className="rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">
              {filtered.length} itens
            </span>
          </div>
        </div>

        <div className="mt-5 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {filtered.length ? (
            filtered.map((item, index) => {
              const active = index === activeIndex
              return (
                <button
                  key={item.id}
                  className={`app-stagger app-panel micro-bounce flex w-full items-center justify-between rounded-[1.2rem] border px-4 py-4 text-left transition ${
                    active
                      ? 'border-cyan-300/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(34,211,238,0.08))] shadow-[0_16px_36px_rgba(8,47,73,0.22)]'
                      : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    setOpen(false)
                    router.push(item.href)
                  }}
                  type="button"
                  style={{ animationDelay: `${index * 24}ms` }}
                >
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-sm text-white/48">{item.hint}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/40">
                    {item.section}
                  </span>
                </button>
              )
            })
          ) : (
            <div className="empty-glow app-rise rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
              <div className="empty-orbit mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                <Search className="h-8 w-8 text-cyan-200/85" />
              </div>
              <p className="font-medium text-white/78">Nenhuma acao encontrada</p>
              <p className="mt-2 leading-6">Tente buscar pelo nome do board, secao ou parte do contexto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
