import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { emitBoardUpdate } from '@/lib/realtime/socket-server'
import { assertBoardAccess, createActivityLog } from '@/server/services/boards'

const createListSchema = z.object({
  title: z.string().min(1),
})

interface Params {
  params: Promise<{ boardId: string }>
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertBoardAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const membership = board.members.find((member) => member.userId === session.user.id)
  if (!canEdit(membership?.role)) {
    return NextResponse.json({ error: 'Sem permissao para editar.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createListSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Titulo invalido.' }, { status: 400 })

  const list = await prisma.list.create({
    data: {
      boardId,
      title: parsed.data.title,
      sortOrder: board.lists.length,
    },
  })

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    listId: list.id,
    userId: session.user.id,
    entityType: 'LIST',
    action: 'list.created',
    message: `Criou a lista ${list.title}`,
  })

  emitBoardUpdate(boardId, { listId: list.id, action: 'list-created' })

  return NextResponse.json({ list }, { status: 201 })
}
