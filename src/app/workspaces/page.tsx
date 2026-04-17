import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { WorkspacesClient } from '@/features/workspaces/workspaces-client'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function WorkspacesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: true,
      boards: {
        where: { isArchived: false },
        select: {
          id: true,
          title: true,
          slug: true,
          isFavorite: true,
          background: true,
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const initialWorkspaces = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    visibility: workspace.visibility,
    membersCount: workspace.members.length,
    boards: workspace.boards,
  }))

  return (
    <AppShell user={session.user}>
      <div className="space-y-8">
        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(11,23,44,.94),rgba(16,28,54,.84))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Espacos</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Gerencie a estrutura inteira do produto</h1>
              <p className="mt-4 max-w-2xl text-white/62">
                Crie novas areas de trabalho, distribua boards por contexto e mantenha operacoes separadas sem perder velocidade.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-5 py-4">
                <p className="text-sm text-white/45">Total de espacos</p>
                <p className="mt-2 text-3xl font-semibold">{initialWorkspaces.length}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/15 px-5 py-4">
                <p className="text-sm text-white/45">Boards somados</p>
                <p className="mt-2 text-3xl font-semibold">
                  {initialWorkspaces.reduce((acc, workspace) => acc + workspace.boards.length, 0)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <WorkspacesClient initialWorkspaces={initialWorkspaces} />
      </div>
    </AppShell>
  )
}
