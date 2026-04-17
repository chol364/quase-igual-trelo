import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/session'
import { assertBoardAccessBySlug, serializeBoard } from '@/server/services/boards'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { slug } = await params
  const board = await assertBoardAccessBySlug(slug, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board não encontrado.' }, { status: 404 })
  return NextResponse.json({ board: serializeBoard(board) })
}
