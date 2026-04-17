import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { emitBoardUpdate } from '@/lib/realtime/socket-server'
import { executeAutomationRules } from '@/server/services/automations'
import { assertBoardAccess, createActivityLog, serializeBoard } from '@/server/services/boards'

const reorderSchema = z.object({
  lists: z.array(
    z.object({
      id: z.string(),
      cards: z.array(z.string()),
    })
  ),
})

interface Params {
  params: Promise<{ boardId: string }>
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertBoardAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const role = board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para reordenar.' }, { status: 403 })

  const body = await request.json()
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Payload invalido.' }, { status: 400 })

  const beforeCardLists = new Map(
    board.lists.flatMap((list) => list.cards.map((card) => [card.id, list.id] as const))
  )

  await prisma.$transaction(async (tx) => {
    for (let listIndex = 0; listIndex < parsed.data.lists.length; listIndex += 1) {
      const list = parsed.data.lists[listIndex]
      await tx.list.update({
        where: { id: list.id },
        data: { sortOrder: listIndex },
      })

      for (let cardIndex = 0; cardIndex < list.cards.length; cardIndex += 1) {
        await tx.card.update({
          where: { id: list.cards[cardIndex] },
          data: {
            listId: list.id,
            sortOrder: cardIndex,
          },
        })
      }
    }
  })

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'BOARD',
    action: 'board.reordered',
    message: 'Reordenou listas ou cards',
  })

  const movedCardIds = parsed.data.lists.flatMap((list) =>
    list.cards.filter((cardId) => beforeCardLists.get(cardId) && beforeCardLists.get(cardId) !== list.id)
  )

  for (const movedCardId of movedCardIds) {
    await executeAutomationRules({
      workspaceId: board.workspaceId,
      boardId,
      cardId: movedCardId,
      triggerType: 'card.moved',
    })
  }

  emitBoardUpdate(boardId, { action: 'reordered' })

  const fullBoard = await assertBoardAccess(boardId, session.user.id)
  return NextResponse.json({ board: fullBoard ? serializeBoard(fullBoard) : null })
}
