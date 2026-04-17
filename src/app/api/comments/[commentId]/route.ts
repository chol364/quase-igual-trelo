import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { canManage } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { createActivityLog } from '@/server/services/boards'
import { notifyMentionedUsers } from '@/server/services/notifications'

const patchSchema = z.object({
  content: z.string().min(1),
})

interface Params {
  params: Promise<{ commentId: string }>
}

async function getComment(commentId: string, userId: string) {
  return prisma.comment.findFirst({
    where: {
      id: commentId,
      board: {
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
    },
    include: {
      author: true,
      board: {
        include: {
          members: true,
        },
      },
      card: true,
    },
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { commentId } = await params
  const comment = await getComment(commentId, session.user.id)
  if (!comment) return NextResponse.json({ error: 'Comentario nao encontrado.' }, { status: 404 })

  const role = comment.board.members.find((member) => member.userId === session.user.id)?.role
  if (comment.authorId !== session.user.id && !canManage(role)) {
    return NextResponse.json({ error: 'Sem permissao para editar este comentario.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Conteudo invalido.' }, { status: 400 })

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content: parsed.data.content,
      mentions: {
        users: Array.from(new Set((parsed.data.content.match(/@([a-z0-9-]+)/gi) ?? []).map((entry) => entry.slice(1).toLowerCase()))),
      },
    },
    include: { author: true },
  })

  await createActivityLog({
    workspaceId: comment.workspaceId,
    boardId: comment.boardId,
    cardId: comment.cardId,
    userId: session.user.id,
    entityType: 'COMMENT',
    action: 'comment.updated',
    message: 'Editou um comentario',
  })

  await notifyMentionedUsers({
    content: parsed.data.content,
    authorId: session.user.id,
    workspaceId: comment.workspaceId,
    boardId: comment.boardId,
    cardId: comment.cardId,
    cardTitle: comment.card.title,
  })

  return NextResponse.json({
    comment: {
      id: updated.id,
      content: updated.content,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      author: {
        id: updated.author.id,
        name: updated.author.name,
        username: updated.author.username,
        avatarColor: updated.author.avatarColor,
      },
    },
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { commentId } = await params
  const comment = await getComment(commentId, session.user.id)
  if (!comment) return NextResponse.json({ error: 'Comentario nao encontrado.' }, { status: 404 })

  const role = comment.board.members.find((member) => member.userId === session.user.id)?.role
  if (comment.authorId !== session.user.id && !canManage(role)) {
    return NextResponse.json({ error: 'Sem permissao para excluir este comentario.' }, { status: 403 })
  }

  await prisma.comment.delete({ where: { id: commentId } })
  await createActivityLog({
    workspaceId: comment.workspaceId,
    boardId: comment.boardId,
    cardId: comment.cardId,
    userId: session.user.id,
    entityType: 'COMMENT',
    action: 'comment.deleted',
    message: 'Removeu um comentario',
  })

  return NextResponse.json({ ok: true })
}
