import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { BOARD_VISIBILITIES } from '@/lib/domain/constants'
import { prisma } from '@/lib/db/prisma'
import { slugify } from '@/lib/utils/slug'
import { assertWorkspaceAccess, createActivityLog, createDefaultBoardData } from '@/server/services/boards'

const createBoardSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  background: z.string().optional(),
  visibility: z.enum(BOARD_VISIBILITIES).default('WORKSPACE'),
  templateId: z.string().optional(),
})

async function resolveBoardSlug(workspaceId: string, source: string) {
  const baseSlug = slugify(source)
  let slug = baseSlug
  let counter = 2

  while (await prisma.board.findFirst({ where: { workspaceId, slug } })) {
    slug = `${baseSlug}-${counter}`
    counter += 1
  }

  return slug
}

interface Params {
  params: Promise<{ workspaceId: string }>
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { workspaceId } = await params
  const access = await assertWorkspaceAccess(workspaceId, session.user.id)
  if (!access || access.role === 'VIEWER') {
    return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createBoardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const slug = await resolveBoardSlug(workspaceId, parsed.data.slug?.trim() || parsed.data.title)
  if (slug.length < 3) {
    return NextResponse.json({ error: 'Informe um titulo valido para gerar o slug do board.' }, { status: 400 })
  }

  const board = await prisma.board.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      background: parsed.data.background,
      visibility: parsed.data.visibility,
      workspaceId,
      ownerId: session.user.id,
    },
  })

  await prisma.boardMember.create({
    data: {
      boardId: board.id,
      userId: session.user.id,
      role: access.role,
    },
  })

  await createDefaultBoardData(board.id, session.user.id, parsed.data.templateId)
  await createActivityLog({
    workspaceId,
    boardId: board.id,
    userId: session.user.id,
    entityType: 'BOARD',
    action: 'board.created',
    message: `Criou o board ${board.title}`,
  })

  return NextResponse.json({ board }, { status: 201 })
}
