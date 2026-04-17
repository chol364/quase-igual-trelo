import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { WORKSPACE_VISIBILITIES } from '@/lib/domain/constants'
import { prisma } from '@/lib/db/prisma'
import { assertWorkspaceAccess, createActivityLog } from '@/server/services/boards'

const patchSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  description: z.string().optional().nullable(),
  visibility: z.enum(WORKSPACE_VISIBILITIES),
})

interface Params {
  params: Promise<{ workspaceId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { workspaceId } = await params
  const access = await assertWorkspaceAccess(workspaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: true },
      },
      boards: {
        where: { isArchived: false },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  return NextResponse.json({ workspace })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { workspaceId } = await params

  const access = await assertWorkspaceAccess(workspaceId, session.user.id)
  if (!access || !['OWNER', 'ADMIN'].includes(access.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: parsed.data,
  })

  await createActivityLog({
    workspaceId,
    userId: session.user.id,
    entityType: 'WORKSPACE',
    action: 'workspace.updated',
    message: `Atualizou o workspace ${workspace.name}`,
  })

  return NextResponse.json({ workspace })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { workspaceId } = await params

  const access = await assertWorkspaceAccess(workspaceId, session.user.id)
  if (!access || access.role !== 'OWNER') {
    return NextResponse.json({ error: 'Apenas owner pode excluir.' }, { status: 403 })
  }

  await prisma.workspace.delete({ where: { id: workspaceId } })
  return NextResponse.json({ ok: true })
}
