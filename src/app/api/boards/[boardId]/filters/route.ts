import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

const filterSchema = z.object({
  name: z.string().min(2).max(40),
  filters: z.object({
    search: z.string().optional().default(''),
    memberFilter: z.string().optional().default(''),
    priorityFilter: z.string().optional().default(''),
    labelFilter: z.string().optional().default(''),
    dueFilter: z.string().optional().default('ALL'),
  }),
})

const deleteSchema = z.object({
  preferenceId: z.string().min(1),
})

interface Params {
  params: Promise<{ boardId: string }>
}

async function assertAccess(boardId: string, userId: string) {
  return prisma.board.findFirst({
    where: {
      id: boardId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    select: { id: true },
  })
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const preferences = await prisma.boardViewPreference.findMany({
    where: {
      boardId,
      userId: session.user.id,
      view: {
        startsWith: 'FILTER:',
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    filters: preferences.map((preference) => ({
      id: preference.id,
      name: typeof preference.filters === 'object' && preference.filters && 'name' in preference.filters
        ? String((preference.filters as { name?: string }).name ?? 'Filtro salvo')
        : 'Filtro salvo',
      filters: typeof preference.filters === 'object' && preference.filters && 'values' in preference.filters
        ? (preference.filters as { values?: unknown }).values
        : {},
      updatedAt: preference.updatedAt,
    })),
  })
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const body = await request.json()
  const parsed = filterSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const preference = await prisma.boardViewPreference.create({
    data: {
      boardId,
      userId: session.user.id,
      view: `FILTER:${Date.now()}`,
      filters: {
        name: parsed.data.name,
        values: parsed.data.filters,
      },
      sorting: Prisma.DbNull,
    },
  })

  return NextResponse.json({
    filter: {
      id: preference.id,
      name: parsed.data.name,
      filters: parsed.data.filters,
      updatedAt: preference.updatedAt,
    },
  }, { status: 201 })
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await assertAccess(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const body = await request.json()
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  await prisma.boardViewPreference.deleteMany({
    where: {
      id: parsed.data.preferenceId,
      boardId,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
