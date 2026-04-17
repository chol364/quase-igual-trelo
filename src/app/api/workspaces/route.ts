import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { MEMBER_ROLES, WORKSPACE_VISIBILITIES } from '@/lib/domain/constants'
import { prisma } from '@/lib/db/prisma'
import { slugify } from '@/lib/utils/slug'
import { createActivityLog, ensureWorkspaceMembership } from '@/server/services/boards'

const workspaceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/).optional().or(z.literal('')),
  description: z.string().optional(),
  visibility: z.enum(WORKSPACE_VISIBILITIES).default('PRIVATE'),
})

async function resolveWorkspaceSlug(input: string) {
  const baseSlug = slugify(input).slice(0, 50) || `espaco-${Date.now()}`
  let slug = baseSlug
  let counter = 2

  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter += 1
  }

  return slug
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
      boards: {
        where: { isArchived: false },
        select: { id: true, title: true, slug: true, isFavorite: true, background: true },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      visibility: workspace.visibility,
      membersCount: workspace.members.length,
      boards: workspace.boards,
    })),
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const body = await request.json()
  const parsed = workspaceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })
  }

  const slugSource = parsed.data.slug?.trim() || parsed.data.name
  const slug = await resolveWorkspaceSlug(slugSource)

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      ownerId: session.user.id,
    },
  })

  await ensureWorkspaceMembership(workspace.id, session.user.id, MEMBER_ROLES[0])
  await createActivityLog({
    workspaceId: workspace.id,
    userId: session.user.id,
    entityType: 'WORKSPACE',
    action: 'workspace.created',
    message: `Criou o workspace ${workspace.name}`,
  })

  return NextResponse.json(
    {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        visibility: workspace.visibility,
        membersCount: 1,
        boards: [],
      },
    },
    { status: 201 }
  )
}
