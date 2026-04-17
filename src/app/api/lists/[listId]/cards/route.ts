import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { emitBoardUpdate } from '@/lib/realtime/socket-server'
import { executeAutomationRules } from '@/server/services/automations'
import { createActivityLog } from '@/server/services/boards'

const createCardSchema = z.object({
  title: z.string().min(1),
})

interface Params {
  params: Promise<{ listId: string }>
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  const { listId } = await params

  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      board: {
        workspace: {
          members: {
            some: { userId: session.user.id },
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
  if (!list) return NextResponse.json({ error: 'Lista nao encontrada.' }, { status: 404 })

  const role = list.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para criar cards.' }, { status: 403 })

  const body = await request.json()
  const parsed = createCardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Titulo invalido.' }, { status: 400 })

  const count = await prisma.card.count({ where: { listId } })
  const card = await prisma.card.create({
    data: {
      boardId: list.boardId,
      listId,
      createdById: session.user.id,
      title: parsed.data.title,
      slug: `${parsed.data.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      priority: 'MEDIUM',
      status: 'TODO',
      sortOrder: count,
    },
  })

  await createActivityLog({
    workspaceId: list.board.workspaceId,
    boardId: list.boardId,
    listId,
    cardId: card.id,
    userId: session.user.id,
    entityType: 'CARD',
    action: 'card.created',
    message: `Criou o card ${card.title}`,
  })

  await executeAutomationRules({
    workspaceId: list.board.workspaceId,
    boardId: list.boardId,
    cardId: card.id,
    triggerType: 'card.created',
  })

  emitBoardUpdate(list.boardId, { cardId: card.id, action: 'card-created' })

  return NextResponse.json({ card }, { status: 201 })
}
