import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { CARD_PRIORITIES, CARD_STATUSES } from '@/lib/domain/constants'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { emitBoardUpdate } from '@/lib/realtime/socket-server'
import { executeAutomationRules } from '@/server/services/automations'
import { createActivityLog } from '@/server/services/boards'
import { notifyAssignedUsers } from '@/server/services/notifications'

const checklistItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  isCompleted: z.boolean().default(false),
  sortOrder: z.number().default(0),
})

const patchCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(CARD_PRIORITIES).optional(),
  status: z.enum(CARD_STATUSES).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  reminderAt: z.string().nullable().optional(),
  coverColor: z.string().nullable().optional(),
  isWatching: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  memberIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  checklist: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1),
        sortOrder: z.number().default(0),
        items: z.array(checklistItemSchema),
      })
    )
    .optional(),
})

interface Params {
  params: Promise<{ cardId: string }>
}

function toOptionalDate(value?: string | null) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return new Date(value)
}

async function getCard(cardId: string, userId: string) {
  return prisma.card.findFirst({
    where: {
      id: cardId,
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
        include: {
          members: true,
        },
      },
      list: true,
      members: true,
      checklists: { include: { items: true } },
    },
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { cardId } = await params
  const card = await getCard(cardId, session.user.id)
  if (!card) return NextResponse.json({ error: 'Card nao encontrado.' }, { status: 404 })

  const role = card.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para editar.' }, { status: 403 })

  const body = await request.json()
  const parsed = patchCardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const data = parsed.data

  await prisma.$transaction(async (tx) => {
    await tx.card.update({
      where: { id: cardId },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: toOptionalDate(data.dueDate),
        startDate: toOptionalDate(data.startDate),
        reminderAt: toOptionalDate(data.reminderAt),
        coverColor: data.coverColor,
        isWatching: data.isWatching,
        isArchived: data.isArchived,
        ...(data.status === 'DONE' ? { completedAt: new Date() } : {}),
      },
    })

    if (data.memberIds) {
      await tx.cardMember.deleteMany({ where: { cardId } })
      if (data.memberIds.length) {
        await tx.cardMember.createMany({
          data: data.memberIds.map((userId) => ({ cardId, userId })),
        })
      }
    }

    if (data.labelIds) {
      await tx.cardLabel.deleteMany({ where: { cardId } })
      if (data.labelIds.length) {
        await tx.cardLabel.createMany({
          data: data.labelIds.map((labelId) => ({ cardId, labelId })),
        })
      }
    }

    if (data.checklist) {
      await tx.checklistItem.deleteMany({
        where: {
          checklist: { cardId },
        },
      })
      await tx.checklist.deleteMany({ where: { cardId } })

      for (const checklist of data.checklist) {
        await tx.checklist.create({
          data: {
            cardId,
            title: checklist.title,
            sortOrder: checklist.sortOrder,
            items: {
              create: checklist.items.map((item, index) => ({
                title: item.title,
                isCompleted: item.isCompleted,
                sortOrder: item.sortOrder ?? index,
              })),
            },
          },
        })
      }
    }
  })

  await createActivityLog({
    workspaceId: card.board.workspaceId,
    boardId: card.boardId,
    listId: card.listId,
    cardId,
    userId: session.user.id,
    entityType: 'CARD',
    action: 'card.updated',
    message: `Atualizou o card ${data.title ?? card.title}`,
  })

  if (data.memberIds) {
    await notifyAssignedUsers({
      assignedUserIds: data.memberIds,
      actorId: session.user.id,
      workspaceId: card.board.workspaceId,
      boardId: card.boardId,
      cardId,
      cardTitle: data.title ?? card.title,
    })
  }

  if (data.status && data.status !== card.status) {
    await executeAutomationRules({
      workspaceId: card.board.workspaceId,
      boardId: card.boardId,
      cardId,
      triggerType: 'card.status.changed',
    })
  }

  emitBoardUpdate(card.boardId, { cardId, action: 'updated' })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { cardId } = await params
  const card = await getCard(cardId, session.user.id)
  if (!card) return NextResponse.json({ error: 'Card nao encontrado.' }, { status: 404 })

  const role = card.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para excluir.' }, { status: 403 })

  await prisma.$transaction(async (tx) => {
    await tx.card.delete({ where: { id: cardId } })
    await tx.activityLog.create({
      data: {
        workspaceId: card.board.workspaceId,
        boardId: card.boardId,
        listId: card.listId,
        userId: session.user.id,
        entityType: 'CARD',
        action: 'card.deleted',
        message: `Excluiu o card ${card.title}`,
      },
    })
  })

  emitBoardUpdate(card.boardId, { cardId, action: 'deleted' })
  return NextResponse.json({ ok: true })
}
