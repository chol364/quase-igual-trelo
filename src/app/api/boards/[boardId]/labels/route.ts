import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { createActivityLog } from '@/server/services/boards'

const createSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().min(4).max(32),
})

const updateSchema = createSchema.extend({
  labelId: z.string().min(1),
})

const deleteSchema = z.object({
  labelId: z.string().min(1),
})

interface Params {
  params: Promise<{ boardId: string }>
}

async function getBoard(boardId: string, userId: string) {
  return prisma.board.findFirst({
    where: {
      id: boardId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      members: true,
      labels: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await getBoard(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  return NextResponse.json({
    labels: board.labels.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
    })),
  })
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await getBoard(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const role = board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para editar etiquetas.' }, { status: 403 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const label = await prisma.label.create({
    data: {
      workspaceId: board.workspaceId,
      boardId,
      name: parsed.data.name,
      color: parsed.data.color,
    },
  })

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'LABEL',
    action: 'label.created',
    message: `Criou a etiqueta ${label.name}`,
  })

  return NextResponse.json({ label }, { status: 201 })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await getBoard(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const role = board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para editar etiquetas.' }, { status: 403 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const label = await prisma.label.update({
    where: { id: parsed.data.labelId },
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
    },
  })

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'LABEL',
    action: 'label.updated',
    message: `Atualizou a etiqueta ${label.name}`,
  })

  return NextResponse.json({ label })
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await getBoard(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const role = board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para editar etiquetas.' }, { status: 403 })

  const body = await request.json()
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const label = await prisma.label.findFirst({
    where: {
      id: parsed.data.labelId,
      boardId,
    },
  })
  if (!label) return NextResponse.json({ error: 'Etiqueta nao encontrada.' }, { status: 404 })

  await prisma.label.delete({
    where: { id: parsed.data.labelId },
  })

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'LABEL',
    action: 'label.deleted',
    message: `Excluiu a etiqueta ${label.name}`,
  })

  return NextResponse.json({ ok: true })
}
