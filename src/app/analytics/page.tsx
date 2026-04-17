import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { AnalyticsCenter } from '@/features/analytics/analytics-center'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const cards = await prisma.card.findMany({
    where: {
      board: {
        workspace: {
          members: {
            some: { userId: session.user.id },
          },
        },
      },
      isArchived: false,
    },
    include: {
      members: { include: { user: true } },
      board: { select: { title: true } },
    },
  })

  const initialCards = cards.map((card) => ({
    id: card.id,
    createdAt: card.createdAt.toISOString(),
    completedAt: card.completedAt?.toISOString() ?? null,
    status: card.status,
    dueDate: card.dueDate?.toISOString() ?? null,
    boardTitle: card.board?.title ?? null,
    members: card.members.map((member) => ({ id: member.user.id, name: member.user.name })),
  }))

  return (
    <AppShell user={session.user}>
      <AnalyticsCenter initialCards={initialCards} />
    </AppShell>
  )
}
