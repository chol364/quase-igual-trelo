import { Prisma } from '@prisma/client'
import { MemberRole } from '@/lib/domain/constants'
import { prisma } from '@/lib/db/prisma'
import { getBoardTemplate } from '@/lib/domain/templates'

export const boardInclude = {
  workspace: true,
  members: {
    include: {
      user: true,
    },
  },
  lists: {
    orderBy: { sortOrder: 'asc' as const },
    where: { isArchived: false },
    include: {
      cards: {
        orderBy: { sortOrder: 'asc' as const },
        where: { isArchived: false },
        include: {
          members: { include: { user: true } },
          labels: { include: { label: true } },
          checklists: {
            orderBy: { sortOrder: 'asc' as const },
            include: {
              items: {
                orderBy: { sortOrder: 'asc' as const },
              },
            },
          },
          comments: {
            orderBy: { createdAt: 'desc' as const },
            include: { author: true },
          },
          attachments: {
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
    },
  },
  labels: true,
  activityLogs: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: { user: true },
  },
} satisfies Prisma.BoardInclude

export type FullBoard = Prisma.BoardGetPayload<{
  include: typeof boardInclude
}>

export async function getUserWorkspaceIds(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  })
  return memberships.map((item) => item.workspaceId)
}

export async function assertWorkspaceAccess(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    include: { workspace: true },
  })
  return membership
}

export async function assertBoardAccess(boardId: string, userId: string) {
  return prisma.board.findFirst({
    where: {
      id: boardId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: boardInclude,
  })
}

export async function assertBoardAccessBySlug(slug: string, userId: string) {
  return prisma.board.findFirst({
    where: {
      slug,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: boardInclude,
  })
}

export function serializeBoard(board: FullBoard) {
  return {
    id: board.id,
    title: board.title,
    slug: board.slug,
    description: board.description,
    background: board.background,
    coverImage: board.coverImage,
    visibility: board.visibility,
    isFavorite: board.isFavorite,
    isArchived: board.isArchived,
    defaultView: board.defaultView,
    workspace: {
      id: board.workspace.id,
      name: board.workspace.name,
      slug: board.workspace.slug,
    },
    members: board.members.map((member) => ({
      id: member.user.id,
      role: member.role,
      name: member.user.name,
      username: member.user.username,
      email: member.user.email,
      image: member.user.image,
      avatarColor: member.user.avatarColor,
    })),
    labels: board.labels.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })),
    lists: board.lists.map((list) => ({
      id: list.id,
      title: list.title,
      sortOrder: list.sortOrder,
      limit: list.limit,
      color: list.color,
      cards: list.cards.map((card) => {
        const checklistItems = card.checklists.flatMap((checklist) => checklist.items)
        const completedChecklist = checklistItems.filter((item) => item.isCompleted).length
        return {
          id: card.id,
          title: card.title,
          slug: card.slug,
          description: card.description,
          priority: card.priority,
          status: card.status,
          dueDate: card.dueDate,
          startDate: card.startDate,
          completedAt: card.completedAt,
          reminderAt: card.reminderAt,
          coverImage: card.coverImage,
          coverColor: card.coverColor,
          isWatching: card.isWatching,
          listId: card.listId,
          boardId: card.boardId,
          sortOrder: card.sortOrder,
          members: card.members.map((assignment) => ({
            id: assignment.user.id,
            name: assignment.user.name,
            username: assignment.user.username,
            avatarColor: assignment.user.avatarColor,
          })),
          labels: card.labels.map((entry) => ({
            id: entry.label.id,
            name: entry.label.name,
            color: entry.label.color,
          })),
          checklist: card.checklists.map((checklist) => ({
            id: checklist.id,
            title: checklist.title,
            sortOrder: checklist.sortOrder,
            items: checklist.items.map((item) => ({
              id: item.id,
              title: item.title,
              isCompleted: item.isCompleted,
              sortOrder: item.sortOrder,
            })),
          })),
          checklistProgress: {
            total: checklistItems.length,
            completed: completedChecklist,
          },
          comments: card.comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            mentions: comment.mentions,
            author: {
              id: comment.author.id,
              name: comment.author.name,
              username: comment.author.username,
              avatarColor: comment.author.avatarColor,
            },
          })),
          attachments: card.attachments.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            mimeType: attachment.mimeType,
            size: attachment.size,
          })),
        }
      }),
    })),
    activity: board.activityLogs.map((log) => ({
      id: log.id,
      action: log.action,
      message: log.message,
      createdAt: log.createdAt,
      entityType: log.entityType,
      user: {
        id: log.user.id,
        name: log.user.name,
        username: log.user.username,
        avatarColor: log.user.avatarColor,
      },
    })),
  }
}

export async function createActivityLog(input: {
  workspaceId?: string
  boardId?: string
  listId?: string
  cardId?: string
  userId: string
  entityType: string
  action: string
  message: string
  metadata?: Prisma.InputJsonValue
}) {
  return prisma.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      boardId: input.boardId,
      listId: input.listId,
      cardId: input.cardId,
      userId: input.userId,
      entityType: input.entityType,
      action: input.action,
      message: input.message,
      metadata: input.metadata,
    },
  })
}

export async function createDefaultBoardData(boardId: string, userId: string, templateId?: string) {
  const template = getBoardTemplate(templateId)
  const listTitles = template?.lists ?? ['Backlog', 'Para fazer', 'Em andamento', 'Concluido']

  const createdLists = await prisma.$transaction(
    listTitles.map((title, index) =>
      prisma.list.create({
        data: { boardId, title, sortOrder: index },
      })
    )
  )

  const [backlog, todo, doing, done] = [
    createdLists[0],
    createdLists[1] ?? createdLists[0],
    createdLists[2] ?? createdLists[0],
    createdLists[3] ?? createdLists[createdLists.length - 1],
  ]

  await prisma.card.create({
    data: {
      boardId,
      listId: todo.id,
      createdById: userId,
      title: 'Bem-vindo ao seu board',
      slug: `bem-vindo-${Date.now()}`,
      description: 'Crie listas, mova cards e edite detalhes no modal lateral.',
      priority: 'MEDIUM',
      status: 'TODO',
      sortOrder: 0,
      checklists: {
        create: [
          {
            title: 'Primeiros passos',
            sortOrder: 0,
            items: {
              create: [
                { title: 'Renomear o board', sortOrder: 0 },
                { title: 'Criar mais listas', sortOrder: 1 },
                { title: 'Mover um card com drag and drop', sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  })

  return { backlog, todo, doing, done }
}

export async function ensureWorkspaceMembership(
  workspaceId: string,
  userId: string,
  role: MemberRole = 'MEMBER'
) {
  return prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    update: { role },
    create: {
      workspaceId,
      userId,
      role,
    },
  })
}
