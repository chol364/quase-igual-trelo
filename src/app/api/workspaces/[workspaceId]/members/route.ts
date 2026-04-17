import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { MEMBER_ROLES } from '@/lib/domain/constants'
import { prisma } from '@/lib/db/prisma'
import { assertWorkspaceAccess, createActivityLog, ensureWorkspaceMembership } from '@/server/services/boards'

const postSchema = z.object({
  email: z.string().email(),
  role: z.enum(MEMBER_ROLES),
})

const patchSchema = z.object({
  userId: z.string(),
  role: z.enum(MEMBER_ROLES),
})

interface Params {
  params: Promise<{ workspaceId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { workspaceId } = await params
  const access = await assertWorkspaceAccess(workspaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Workspace nao encontrado.' }, { status: 404 })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: true },
      },
      invitations: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!workspace) return NextResponse.json({ error: 'Workspace nao encontrado.' }, { status: 404 })

  return NextResponse.json({
    members: workspace.members.map((member) => ({
      id: member.user.id,
      role: member.role,
      name: member.user.name,
      username: member.user.username,
      email: member.user.email,
      avatarColor: member.user.avatarColor,
    })),
    invitations: workspace.invitations.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt,
    })),
  })
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { workspaceId } = await params
  const access = await assertWorkspaceAccess(workspaceId, session.user.id)
  if (!access || !['OWNER', 'ADMIN'].includes(access.role)) {
    return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  if (access.role !== 'OWNER' && (parsed.data.role === 'OWNER' || parsed.data.role === 'ADMIN')) {
    return NextResponse.json({ error: 'Apenas owners podem convidar para papeis administrativos.' }, { status: 403 })
  }

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } })

  if (targetUser) {
    const membership = await ensureWorkspaceMembership(workspaceId, targetUser.id, parsed.data.role)
    await createActivityLog({
      workspaceId,
      userId: session.user.id,
      entityType: 'WORKSPACE',
      action: 'workspace.member_added',
      message: `Adicionou ${parsed.data.email} como ${parsed.data.role}`,
    })

    return NextResponse.json({
      member: {
        id: targetUser.id,
        role: membership.role,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        avatarColor: targetUser.avatarColor,
      },
    })
  }

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedById: session.user.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  })

  await createActivityLog({
    workspaceId,
    userId: session.user.id,
    entityType: 'WORKSPACE',
    action: 'workspace.invite_created',
    message: `Enviou convite para ${parsed.data.email}`,
  })

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
    },
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { workspaceId } = await params
  const access = await assertWorkspaceAccess(workspaceId, session.user.id)
  if (!access || !['OWNER', 'ADMIN'].includes(access.role)) {
    return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const targetMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: parsed.data.userId,
      },
    },
  })

  if (!targetMembership) {
    return NextResponse.json({ error: 'Membro nao encontrado.' }, { status: 404 })
  }

  if (targetMembership.userId === session.user.id && parsed.data.role !== 'OWNER') {
    return NextResponse.json({ error: 'O owner atual nao pode rebaixar o proprio papel por aqui.' }, { status: 400 })
  }

  if (access.role !== 'OWNER' && (parsed.data.role === 'OWNER' || targetMembership.role === 'OWNER' || parsed.data.role === 'ADMIN')) {
    return NextResponse.json({ error: 'Apenas owners podem editar papeis administrativos.' }, { status: 403 })
  }

  await prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: parsed.data.userId,
      },
    },
    data: { role: parsed.data.role },
  })

  await createActivityLog({
    workspaceId,
    userId: session.user.id,
    entityType: 'WORKSPACE',
    action: 'workspace.member_role_changed',
    message: `Alterou o papel de um membro para ${parsed.data.role}`,
  })

  return NextResponse.json({ ok: true })
}
