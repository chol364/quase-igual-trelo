import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Card } from '@/components/ui/card'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const cards = await prisma.card.findMany({
    where: {
      dueDate: { not: null },
      board: {
        workspace: {
          members: { some: { userId: session.user.id } },
        },
      },
      isArchived: false,
    },
    include: { board: true },
    orderBy: { dueDate: 'asc' },
    take: 24,
  })

  return (
    <AppShell user={session.user}>
      <div className="space-y-6">
        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(13,24,43,.94),rgba(14,38,63,.82))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Calendario</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Cards com prazo no radar</h1>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(card.dueDate!))}</p>
              <p className="mt-3 text-2xl font-semibold">{card.title}</p>
              <p className="mt-2 text-sm text-white/56">{card.board.title}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
