import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { BoardScreen } from '@/features/boards/board-screen'
import { auth } from '@/lib/auth/session'
import { assertBoardAccessBySlug, serializeBoard } from '@/server/services/boards'

interface BoardPageProps {
  params: Promise<{ boardSlug: string }>
  searchParams: Promise<{ card?: string }>
}

export default async function BoardPage({ params, searchParams }: BoardPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { boardSlug } = await params
  const { card } = await searchParams
  const board = await assertBoardAccessBySlug(boardSlug, session.user.id)
  if (!board) notFound()

  return (
    <AppShell user={session.user}>
      <BoardScreen currentUserId={session.user.id} initialBoard={serializeBoard(board)} initialSelectedCardId={card ?? null} />
    </AppShell>
  )
}
