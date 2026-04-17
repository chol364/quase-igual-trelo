import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { WorkspaceDetailClient } from '@/features/workspaces/workspace-detail-client'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

interface WorkspacePageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function WorkspaceDetailPage({ params }: WorkspacePageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { workspaceSlug } = await params
  const workspace = await prisma.workspace.findFirst({
    where: {
      slug: workspaceSlug,
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
      boards: {
        where: { isArchived: false },
        orderBy: { updatedAt: 'desc' },
      },
      invitations: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!workspace) notFound()

  const initialWorkspace = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    visibility: workspace.visibility,
    boards: workspace.boards.map((board) => ({
      id: board.id,
      title: board.title,
      slug: board.slug,
      description: board.description,
      background: board.background,
      isFavorite: board.isFavorite,
      updatedAt: board.updatedAt,
    })),
    members: workspace.members.map((member) => ({
      id: member.user.id,
      role: member.role,
      name: member.user.name,
      username: member.user.username,
      email: member.user.email,
      avatarColor: member.user.avatarColor,
    })),
    invitations: workspace.invitations.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt,
    })),
  }

  return (
    <AppShell user={session.user}>
      <div className="space-y-8">
        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(11,22,41,.94),rgba(52,17,90,.74))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/75">Espaco detalhado</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{workspace.name}</h1>
              <p className="mt-4 max-w-2xl text-white/64">
                Boards ativos, criacao rapida, membros do contexto e um ponto central para coordenar o trabalho sem friccao.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/15 px-4 py-2 text-sm text-white/72">
              visibilidade {workspace.visibility.toLowerCase()}
            </div>
          </div>
        </section>

        <WorkspaceDetailClient initialWorkspace={initialWorkspace} currentUserId={session.user.id} />
      </div>
    </AppShell>
  )
}
