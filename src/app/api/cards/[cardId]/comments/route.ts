import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { emitBoardUpdate } from '@/lib/realtime/socket-server'
import { createActivityLog } from '@/server/services/boards'
import { notifyMentionedUsers } from '@/server/services/notifications'

const createCommentSchema = z.object({
  content: z.string().min(1),
})

interface Params {
  params: Promise<{ cardId: string }>
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { cardId } = await params
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
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
        include: {
          members: true,
        },
      },
    },
  })

  if (!card) return NextResponse.json({ error: 'Card nao encontrado.' }, { status: 404 })
  const role = card.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para comentar.' }, { status: 403 })

  const body = await request.json()
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Comentario invalido.' }, { status: 400 })

  const mentions = Array.from(new Set((parsed.data.content.match(/@([a-z0-9-]+)/gi) ?? []).map((entry) => entry.slice(1).toLowerCase())))

  const comment = await prisma.comment.create({
    data: {
      workspaceId: card.board.workspaceId,
      boardId: card.boardId,
      cardId,
      authorId: session.user.id,
      content: parsed.data.content,
      mentions: { users: mentions },
    },
    include: { author: true },
  })

  await createActivityLog({
    workspaceId: card.board.workspaceId,
    boardId: card.boardId,
    cardId,
    userId: session.user.id,
    entityType: 'COMMENT',
    action: 'comment.created',
    message: 'Adicionou um comentario',
  })

  await notifyMentionedUsers({
    content: parsed.data.content,
    authorId: session.user.id,
    workspaceId: card.board.workspaceId,
    boardId: card.boardId,
    cardId,
    cardTitle: card.title,
  })

  emitBoardUpdate(card.boardId, { cardId, action: 'comment' })

  return NextResponse.json({
    comment: {
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
    },
  })
}
