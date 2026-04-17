import { prisma } from '@/lib/db/prisma'
import { createNotification } from '@/server/services/notifications'

async function notifyAssignees(params: {
  cardId: string
  workspaceId: string
  boardId: string
  cardTitle: string
  message?: string | null
}) {
  const [assignments, board] = await Promise.all([
    prisma.cardMember.findMany({
      where: { cardId: params.cardId },
      select: { userId: true },
    }),
    prisma.board.findUnique({
      where: { id: params.boardId },
      select: { slug: true },
    }),
  ])

  if (!assignments.length) return

  await Promise.all(
    assignments.map((assignment) =>
      createNotification({
        userId: assignment.userId,
        type: 'AUTOMATION',
        title: `Automacao executada em ${params.cardTitle}`,
        body: params.message ?? 'Uma regra automatica foi aplicada ao seu card.',
        link: board?.slug ? `/boards/${board.slug}?card=${params.cardId}` : null,
        workspaceId: params.workspaceId,
        boardId: params.boardId,
        cardId: params.cardId,
      })
    )
  )
}

async function moveCardToList(params: {
  cardId: string
  boardId: string
  targetListName?: string | null
}) {
  if (!params.targetListName) return
  const targetList = await prisma.list.findFirst({
    where: {
      boardId: params.boardId,
      title: params.targetListName,
      isArchived: false,
    },
    orderBy: { sortOrder: 'asc' },
  })

  if (!targetList) return

  const currentCount = await prisma.card.count({ where: { listId: targetList.id, isArchived: false } })
  await prisma.card.update({
    where: { id: params.cardId },
    data: {
      listId: targetList.id,
      sortOrder: currentCount,
    },
  })
}

export async function executeAutomationRules(input: {
  workspaceId: string
  boardId: string
  cardId: string
  triggerType: 'card.created' | 'card.moved' | 'card.status.changed'
}) {
  const [rules, card] = await Promise.all([
    prisma.automationRule.findMany({
      where: {
        workspaceId: input.workspaceId,
        isActive: true,
        OR: [{ boardId: null }, { boardId: input.boardId }],
        triggers: {
          some: { type: input.triggerType },
        },
      },
      include: {
        actions: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.card.findUnique({
      where: { id: input.cardId },
      select: { id: true, title: true },
    }),
  ])

  if (!card || !rules.length) return

  for (const rule of rules) {
    for (const action of rule.actions) {
      if (action.type === 'notify.assignee') {
        await notifyAssignees({
          cardId: input.cardId,
          workspaceId: input.workspaceId,
          boardId: input.boardId,
          cardTitle: card.title,
          message: typeof action.config === 'object' && action.config && 'message' in action.config ? String(action.config.message ?? '') : null,
        })
      }

      if (action.type === 'move.card') {
        const targetListName =
          typeof action.config === 'object' && action.config && 'targetList' in action.config
            ? String(action.config.targetList ?? '')
            : null

        await moveCardToList({
          cardId: input.cardId,
          boardId: input.boardId,
          targetListName,
        })
      }
    }
  }
}
