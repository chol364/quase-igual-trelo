import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { emitBoardUpdate } from '@/lib/realtime/socket-server'
import { createActivityLog } from '@/server/services/boards'

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  limit: z.number().nullable().optional(),
  isArchived: z.boolean().optional(),
})

interface Params {
  params: Promise<{ listId: string }>
}

async function getListWithBoard(listId: string, userId: string) {
  return prisma.list.findFirst({
    where: {
      id: listId,
      board: {
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
    },
    include: {
      board: {
        include: { members: true },
      },
    },
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  const { listId } = await params
  const list = await getListWithBoard(listId, session.user.id)
  if (!list) return NextResponse.json({ error: 'Lista nao encontrada.' }, { status: 404 })

  const role = list.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para editar.' }, { status: 403 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  await prisma.list.update({
    where: { id: listId },
    data: parsed.data,
  })
  await createActivityLog({
    workspaceId: list.board.workspaceId,
    boardId: list.boardId,
    listId,
    userId: session.user.id,
    entityType: 'LIST',
    action: 'list.updated',
    message: `Atualizou a lista ${parsed.data.title ?? list.title}`,
  })

  emitBoardUpdate(list.boardId, { listId, action: 'list-updated' })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  const { listId } = await params
  const list = await getListWithBoard(listId, session.user.id)
  if (!list) return NextResponse.json({ error: 'Lista nao encontrada.' }, { status: 404 })

  const role = list.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para excluir.' }, { status: 403 })

  await prisma.$transaction(async (tx) => {
    await tx.list.delete({ where: { id: listId } })
    await tx.activityLog.create({
      data: {
        workspaceId: list.board.workspaceId,
        boardId: list.boardId,
        userId: session.user.id,
        entityType: 'LIST',
        action: 'list.deleted',
        message: `Excluiu a lista ${list.title}`,
      },
    })
  })

  emitBoardUpdate(list.boardId, { listId, action: 'list-deleted' })
  return NextResponse.json({ ok: true, deletedListId: listId })
}
