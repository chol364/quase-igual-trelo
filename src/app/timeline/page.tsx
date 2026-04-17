import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Card } from '@/components/ui/card'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function TimelinePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const cards = await prisma.card.findMany({
    where: {
      board: {
        workspace: {
          members: { some: { userId: session.user.id } },
        },
      },
      isArchived: false,
      OR: [{ startDate: { not: null } }, { dueDate: { not: null } }],
    },
    include: { board: true },
    orderBy: { updatedAt: 'desc' },
    take: 24,
  })

  return (
    <AppShell user={session.user}>
      <div className="space-y-6">
        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(13,24,43,.94),rgba(58,20,83,.78))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Timeline</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Cronograma real dos cards</h1>
        </section>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white">
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div key={card.id} className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div>
                  <p className="font-medium">{card.title}</p>
                  <p className="mt-1 text-sm text-white/52">{card.board.title}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/10 p-2">
                  <div className="h-6 rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6)]" style={{ width: `${30 + (index % 6) * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
