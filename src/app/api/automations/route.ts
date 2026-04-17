import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

const createSchema = z.object({
  workspaceId: z.string(),
  boardId: z.string().optional().nullable(),
  name: z.string().min(3),
  description: z.string().optional().nullable(),
  triggerType: z.enum(['card.created', 'card.moved', 'card.status.changed']),
  triggerConfig: z.object({ field: z.string().optional().nullable() }).optional(),
  actionType: z.enum(['notify.assignee', 'move.card']),
  actionConfig: z
    .object({
      targetList: z.string().optional().nullable(),
      message: z.string().optional().nullable(),
    })
    .optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const rules = await prisma.automationRule.findMany({
    where: {
      workspace: {
        members: {
          some: { userId: session.user.id },
        },
      },
    },
    include: {
      workspace: { select: { id: true, name: true } },
      board: { select: { id: true, title: true } },
      triggers: true,
      actions: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ rules })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: parsed.data.workspaceId,
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  })

  if (!workspace) return NextResponse.json({ error: 'Workspace nao encontrado.' }, { status: 404 })
  if (!['OWNER', 'ADMIN'].includes(workspace.members[0]?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissao para criar automacoes.' }, { status: 403 })
  }

  if (parsed.data.boardId) {
    const board = await prisma.board.findFirst({
      where: {
        id: parsed.data.boardId,
        workspaceId: parsed.data.workspaceId,
      },
    })

    if (!board) {
      return NextResponse.json({ error: 'Board nao encontrada para a automacao.' }, { status: 404 })
    }
  }

  const rule = await prisma.automationRule.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      boardId: parsed.data.boardId ?? null,
      createdById: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      triggers: {
        create: [{ type: parsed.data.triggerType, config: parsed.data.triggerConfig ?? {} }],
      },
      actions: {
        create: [{ type: parsed.data.actionType, config: parsed.data.actionConfig ?? {} }],
      },
    },
    include: {
      workspace: { select: { id: true, name: true } },
      board: { select: { id: true, title: true } },
      triggers: true,
      actions: true,
    },
  })

  return NextResponse.json({ rule }, { status: 201 })
}
