import { prisma } from '@/lib/db/prisma'
import { emitNotificationUpdate } from '@/lib/realtime/socket-server'

function extractMentions(content: string) {
  return Array.from(new Set((content.match(/@([a-z0-9-]+)/gi) ?? []).map((entry) => entry.slice(1).toLowerCase())))
}

export async function createNotification(input: {
  userId: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  workspaceId?: string
  boardId?: string
  cardId?: string
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      workspaceId: input.workspaceId,
      boardId: input.boardId,
      cardId: input.cardId,
    },
  })

  emitNotificationUpdate(input.userId)
  return notification
}

export async function notifyMentionedUsers(input: {
  content: string
  authorId: string
  workspaceId: string
  boardId: string
  cardId: string
  cardTitle: string
}) {
  const usernames = extractMentions(input.content)
  if (!usernames.length) return []

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernames,
      },
      id: {
        not: input.authorId,
      },
    },
    select: {
      id: true,
      username: true,
    },
  })

  const board = await prisma.board.findUnique({
    where: { id: input.boardId },
    select: { slug: true },
  })

  return Promise.all(
    users.map((user) =>
      createNotification({
        userId: user.id,
        type: 'MENTION',
        title: `Voce foi mencionado em ${input.cardTitle}`,
        body: input.content,
        link: board?.slug ? `/boards/${board.slug}?card=${input.cardId}` : null,
        workspaceId: input.workspaceId,
        boardId: input.boardId,
        cardId: input.cardId,
      })
    )
  )
}

export async function notifyAssignedUsers(input: {
  assignedUserIds: string[]
  actorId: string
  workspaceId: string
  boardId: string
  cardId: string
  cardTitle: string
}) {
  const targets = input.assignedUserIds.filter((id) => id !== input.actorId)
  const board = await prisma.board.findUnique({
    where: { id: input.boardId },
    select: { slug: true },
  })
  return Promise.all(
    targets.map((userId) =>
      createNotification({
        userId,
        type: 'ASSIGNMENT',
        title: `Voce foi associado ao card ${input.cardTitle}`,
        body: 'Abra o board para ver os detalhes da tarefa.',
        link: board?.slug ? `/boards/${board.slug}?card=${input.cardId}` : null,
        workspaceId: input.workspaceId,
        boardId: input.boardId,
        cardId: input.cardId,
      })
    )
  )
}
