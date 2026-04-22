import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Card } from '@/components/ui/card'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function AppDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          boards: {
            where: { isArchived: false },
            orderBy: { updatedAt: 'desc' },
            take: 4,
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const recentBoards = await prisma.board.findMany({
    where: {
      workspace: {
        members: {
          some: { userId: session.user.id },
        },
      },
      isArchived: false,
    },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  })

  const favoriteBoards = recentBoards.filter((board) => board.isFavorite)
  const dueSoonCards = await prisma.card.findMany({
    where: {
      dueDate: { not: null },
      isArchived: false,
      members: {
        some: { userId: session.user.id },
      },
    },
    include: { board: true },
    orderBy: { dueDate: 'asc' },
    take: 5,
  })

  const totalBoards = memberships.reduce((acc, item) => acc + item.workspace.boards.length, 0)
  const highlightedBoards = favoriteBoards.length ? favoriteBoards : recentBoards.slice(0, 4)

  return (
    <AppShell user={session.user}>
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Card className="fade-up ambient-panel relative overflow-hidden border-white/10 bg-[linear-gradient(145deg,rgba(10,22,42,.96),rgba(22,34,67,.88))] text-white">
            <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-48 rounded-full bg-fuchsia-500/12 blur-3xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/75">Painel central</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                  Sua operacao esta pronta para rodar em espacos, boards e cards.
                </h1>
                <p className="mt-4 max-w-xl text-white/62">
                  Entre direto no fluxo, acompanhe o que esta vencendo e abra seus contextos mais importantes sem navegar em excesso.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/workspaces"
                    className="rounded-full bg-[linear-gradient(135deg,#3690ff,#2468ff)] px-5 py-3 text-sm font-semibold shadow-[0_18px_34px_rgba(36,104,255,0.32)] transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    Abrir espacos
                  </Link>
                  <Link
                    href="/notifications"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Ver atividade
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="app-panel app-rise rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-5 py-4">
                  <p className="text-sm text-white/50">Espacos ativos</p>
                  <p className="mt-2 text-3xl font-semibold">{memberships.length}</p>
                </div>
                <div className="app-panel app-rise rounded-[1.35rem] border border-white/10 bg-black/15 px-5 py-4">
                  <p className="text-sm text-white/50">Boards no radar</p>
                  <p className="mt-2 text-3xl font-semibold">{totalBoards}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="fade-up app-panel border-white/10 bg-[linear-gradient(180deg,rgba(11,18,31,0.92),rgba(8,13,24,0.82))] text-white" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/75">Prazos proximos</p>
                <h2 className="mt-3 text-2xl font-semibold">O que pede atencao agora</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
                {dueSoonCards.length} itens
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {dueSoonCards.length ? (
                dueSoonCards.map((card, index) => (
                  <Link
                    key={card.id}
                    href={`/boards/${card.board.slug}`}
                    className="stagger-rise block rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4 transition hover:bg-white/[0.08]"
                    style={{ animationDelay: `${index * 80 + 160}ms` }}
                  >
                    <p className="font-medium">{card.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/52">
                      <span>{card.board.title}</span>
                      <span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(card.dueDate!))}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-glow app-rise rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/52">
                  <div className="empty-orbit mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                    <span className="text-2xl">+</span>
                  </div>
                  <p className="font-medium text-white/78">Nenhum prazo proximo por aqui</p>
                  <p className="mt-2 leading-6">Quando voce assumir cards com data, eles entram neste radar automaticamente.</p>
                </div>
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="fade-up app-panel border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white" style={{ animationDelay: '140ms' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/45">Boards destacados</p>
                <h2 className="mt-1 text-2xl font-semibold">Favoritos e recentes</h2>
              </div>
              <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/workspaces">
                Ver todos
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {highlightedBoards.length ? (
                highlightedBoards.map((board, index) => (
                  <Link
                    key={board.id}
                    href={`/boards/${board.slug}`}
                    className="app-stagger hover-lift spotlight-card rounded-[1.5rem] border border-white/10 p-5"
                    style={{ background: board.background ?? '#17325d', animationDelay: `${index * 70 + 180}ms` }}
                  >
                    <p className="text-sm uppercase tracking-[0.25em] text-white/60">Board</p>
                    <p className="mt-3 text-2xl font-semibold">{board.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/76">{board.description ?? 'Sem descricao.'}</p>
                  </Link>
                ))
              ) : (
                <div className="empty-glow app-rise md:col-span-2 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
                  <div className="empty-orbit mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                    <span className="text-3xl">▦</span>
                  </div>
                  <p className="font-medium text-white/78">Nenhum board ativo ainda</p>
                  <p className="mt-2 leading-6">Crie o primeiro board em um workspace para começar a preencher seu painel.</p>
                  <Link href="/workspaces" className="micro-bounce mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-white/78 transition hover:bg-white/[0.1] hover:text-white">
                    Ir para workspaces
                  </Link>
                </div>
              )}
            </div>
          </Card>

          <Card className="fade-up app-panel border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white" style={{ animationDelay: '220ms' }}>
            <p className="text-sm text-white/45">Estrutura</p>
            <h2 className="mt-1 text-2xl font-semibold">Seus espacos</h2>
            <div className="mt-5 space-y-3">
              {memberships.length ? (
                memberships.map(({ workspace }, index) => (
                  <Link
                    key={workspace.id}
                    href={`/workspaces/${workspace.slug}`}
                    className="app-stagger micro-bounce flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4 transition hover:bg-white/[0.08]"
                    style={{ animationDelay: `${index * 60 + 200}ms` }}
                  >
                    <div>
                      <p className="font-medium">{workspace.name}</p>
                      <p className="mt-1 text-sm text-white/55">{workspace.boards.length} boards ativos</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/45">
                      {workspace.visibility}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="empty-glow app-rise rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
                  <div className="empty-orbit mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                    <span className="text-2xl">◌</span>
                  </div>
                  <p className="font-medium text-white/78">Seu painel ainda nao tem espacos</p>
                  <p className="mt-2 leading-6">Crie um workspace para separar operacoes, clientes ou frentes de produto.</p>
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
