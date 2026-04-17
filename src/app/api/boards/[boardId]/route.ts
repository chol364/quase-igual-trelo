import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { BOARD_VISIBILITIES, BOARD_VIEWS } from '@/lib/domain/constants'
import { prisma } from '@/lib/db/prisma'
import { assertBoardAccess, createActivityLog, serializeBoard } from '@/server/services/boards'

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  background: z.string().nullable().optional(),
  visibility: z.enum(BOARD_VISIBILITIES).optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  defaultView: z.enum(BOARD_VIEWS).optional(),
})

interface Params {
  params: Promise<{ boardId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertBoardAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  return NextResponse.json({ board: serializeBoard(board) })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertBoardAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const updated = await prisma.board.update({
    where: { id: boardId },
    data: parsed.data,
  })

  await createActivityLog({
    workspaceId: updated.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'BOARD',
    action: 'board.updated',
    message: `Atualizou o board ${updated.title}`,
  })

  const fullBoard = await assertBoardAccess(boardId, session.user.id)
  return NextResponse.json({ board: fullBoard ? serializeBoard(fullBoard) : null })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertBoardAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  await prisma.board.delete({ where: { id: boardId } })
  return NextResponse.json({ ok: true })
}
