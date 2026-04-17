import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

interface Params {
  params: Promise<{ boardId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      workspace: {
        members: {
          some: { userId: session.user.id },
        },
      },
    },
    select: {
      id: true,
      title: true,
      isArchived: true,
      lists: {
        where: { isArchived: true },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
      },
      cards: {
        where: { isArchived: true },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          listId: true,
          updatedAt: true,
          list: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  })

  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  return NextResponse.json({
    board: {
      id: board.id,
      title: board.title,
      isArchived: board.isArchived,
    },
    lists: board.lists,
    cards: board.cards.map((card) => ({
      id: card.id,
      title: card.title,
      listId: card.listId,
      listTitle: card.list?.title ?? 'Sem lista',
      updatedAt: card.updatedAt,
    })),
  })
}
