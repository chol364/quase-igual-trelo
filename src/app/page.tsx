import Link from 'next/link'

const highlights = [
  { value: 'Fluxo real', label: 'quadros com listas, drag and drop e historico' },
  { value: 'Operacao clara', label: 'prioridades, membros, datas e progresso' },
  { value: 'Base pronta', label: 'autenticacao, espacos e persistencia local' },
]

const featureGrid = [
  {
    title: 'Espacos de trabalho vivos',
    description: 'Agrupe boards por contexto, equipe ou iniciativa com um hub visual mais organizado.',
  },
  {
    title: 'Cards com mais contexto',
    description: 'Checklist, comentarios, membros, prioridade, prazo e edicao sem trocar de tela.',
  },
  {
    title: 'Painel com ritmo',
    description: 'Uma interface pensada para trabalho diario, com foco em leitura rapida e movimento natural.',
  },
  {
    title: 'Pronto para evoluir',
    description: 'Estrutura organizada para analytics, automacoes, notificacoes e views extras.',
  },
]

const steps = [
  'Crie um espaco para separar operacoes, clientes ou produtos.',
  'Abra boards com listas horizontais e cards acionaveis.',
  'Distribua tarefas, acompanhe prazos e mova entregas no fluxo.',
]

const boardPreview = [
  {
    title: 'Entrada',
    tone: 'from-sky-500/20 to-cyan-500/5',
    cards: [
      { title: 'Briefing de campanha', meta: '2 anexos • urgente' },
      { title: 'Novo portal institucional', meta: '3 membros • prazo sexta' },
    ],
  },
  {
    title: 'Em progresso',
    tone: 'from-fuchsia-500/18 to-pink-500/5',
    cards: [
      { title: 'Refino da home comercial', meta: '5/8 checklist' },
      { title: 'Automacao de onboarding', meta: 'comentarios ativos' },
    ],
  },
  {
    title: 'Concluido',
    tone: 'from-emerald-500/20 to-teal-500/5',
    cards: [
      { title: 'Calendario editorial', meta: 'aprovado hoje' },
      { title: 'Setup do workspace base', meta: 'finalizado' },
    ],
  },
]

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden section-glow">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-orb absolute left-[8%] top-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="hero-orb-delayed absolute right-[12%] top-40 h-72 w-72 rounded-full bg-fuchsia-500/18 blur-3xl" />
        <div className="hero-orb-slow absolute left-[42%] top-[14%] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="hero-grid grid-float absolute inset-x-0 top-0 h-[820px] opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1520px] flex-col px-6 py-8 text-white">
        <header className="fade-up ambient-panel mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,27,44,0.82),rgba(14,20,34,0.72))] px-5 py-4 shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <div className="orbital-ring soft-pulse grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] text-sm font-bold shadow-[0_20px_40px_rgba(37,99,235,0.35)]">
              AT
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/35">Organizacao de trabalho</p>
              <h1 className="text-xl font-semibold tracking-tight">Alquimia Tarefas</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link className="nav-item-glow rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-white/78 transition hover:bg-white/[0.08] hover:text-white" href="/login">
              Entrar
            </Link>
            <Link className="nav-item-glow rounded-full bg-[linear-gradient(135deg,#3690ff,#2468ff)] px-5 py-2.5 text-sm font-semibold shadow-[0_16px_32px_rgba(36,104,255,0.35)] transition hover:-translate-y-0.5 hover:brightness-110" href="/register">
              Criar conta
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.12fr_0.88fr] lg:py-20">
          <div className="fade-up max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.9)]" />
              Alquimia Tarefas
            </div>

            <h2 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl xl:text-[4.7rem]">
              Organize operacoes, projetos e entregas com uma experiencia{' '}
              <span className="bg-[linear-gradient(135deg,#ffffff,#8fe7ff_55%,#73a7ff)] bg-clip-text text-transparent">
                Kanban mais viva
              </span>
              .
            </h2>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/66">
              Uma plataforma visual para acompanhar prioridades, mover tarefas com clareza e manter seu time no mesmo ritmo,
              sem parecer um painel cru ou improvisado.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="rounded-full bg-[linear-gradient(135deg,#3690ff,#2468ff)] px-7 py-3.5 text-base font-semibold shadow-[0_18px_36px_rgba(36,104,255,0.35)] transition hover:-translate-y-0.5 hover:brightness-110" href="/app">
                Abrir painel
              </Link>
              <Link className="rounded-full border border-white/10 bg-white/[0.03] px-7 py-3.5 text-base text-white/78 transition hover:bg-white/[0.08] hover:text-white" href="/workspaces">
                Ver espacos
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {highlights.map((item, index) => (
                <div
                  key={item.value}
                  className="stagger-rise spotlight-card rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 backdrop-blur-xl"
                  style={{ animationDelay: `${index * 120 + 120}ms` }}
                >
                  <p className="text-lg font-semibold">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="fade-up relative" style={{ animationDelay: '120ms' }}>
            <div className="ambient-panel relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,22,37,0.92),rgba(10,15,28,0.88))] p-5 shadow-[0_40px_90px_rgba(0,0,0,0.32)]">
              <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">Preview do fluxo</p>
                  <h3 className="mt-2 text-2xl font-semibold">Board ativo em movimento</h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/45">
                  Live workspace
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {boardPreview.map((column, index) => (
                  <div
                    key={column.title}
                    className={`stagger-rise ${index % 2 === 0 ? 'floating-card' : 'floating-card-delayed'} rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,24,0.96),rgba(8,13,24,0.8))] p-4`}
                    style={{ animationDelay: `${index * 140 + 220}ms` }}
                  >
                    <div className={`rounded-[1.2rem] bg-gradient-to-br ${column.tone} px-4 py-3`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{column.title}</p>
                        <span className="text-xs uppercase tracking-[0.22em] text-white/45">{column.cards.length} cards</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {column.cards.map((card, cardIndex) => (
                        <div
                          key={card.title}
                          className="hover-lift spotlight-card rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4"
                          style={{ animationDelay: `${cardIndex * 120}ms` }}
                        >
                          <div className="mb-3 h-1.5 rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8,#818cf8)]" />
                          <p className="font-medium">{card.title}</p>
                          <p className="mt-3 text-sm text-white/52">{card.meta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/38">Busca e foco</p>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white/42">
                    Buscar por prioridade, prazo, membro ou texto do card
                  </div>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/38">Atividade recente</p>
                  <div className="mt-3 space-y-2 text-sm text-white/55">
                    <p>Marina concluiu o card Onboarding de clientes.</p>
                    <p>Caio comentou no card Refino da home comercial.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 pb-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="fade-up ambient-panel rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,34,0.9),rgba(11,17,30,0.82))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.22)]" style={{ animationDelay: '180ms' }}>
            <p className="text-sm uppercase tracking-[0.3em] text-white/38">Capacidades</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {featureGrid.map((feature, index) => (
                <div
                  key={feature.title}
                  className="stagger-rise spotlight-card rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
                  style={{ animationDelay: `${index * 100 + 200}ms` }}
                >
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/56">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="fade-up ambient-panel rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,19,31,0.92),rgba(10,15,25,0.82))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.22)]" style={{ animationDelay: '260ms' }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/38">Como funciona</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">Entre, monte o espaco e rode o fluxo</h3>
              </div>
              <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/40 md:block">
                onboarding direto
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="stagger-rise spotlight-card flex gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                  style={{ animationDelay: `${index * 120 + 320}ms` }}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e40af,#06b6d4)] text-sm font-semibold shadow-[0_16px_32px_rgba(29,78,216,0.28)]">
                    0{index + 1}
                  </div>
                  <div>
                    <p className="text-base font-medium">Etapa {index + 1}</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">{step}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-full bg-[linear-gradient(135deg,#22c55e,#14b8a6)] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_32px_rgba(20,184,166,0.28)] transition hover:-translate-y-0.5 hover:brightness-110" href="/register">
                Criar espaco agora
              </Link>
              <Link className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-white/78 transition hover:bg-white/[0.08] hover:text-white" href="/login">
                Explorar com login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
