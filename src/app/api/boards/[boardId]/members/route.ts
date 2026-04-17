import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { MEMBER_ROLES } from '@/lib/domain/constants'
import { canManage } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { sendInvitationEmail } from '@/lib/notifications/invitations'
import { createActivityLog } from '@/server/services/boards'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(MEMBER_ROLES).default('MEMBER'),
})

const updateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(MEMBER_ROLES),
})

const removeSchema = z.object({
  userId: z.string().min(1),
})

interface Params {
  params: Promise<{ boardId: string }>
}

async function getBoardContext(boardId: string, userId: string) {
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
      workspace: {
        include: {
          members: {
            include: {
              user: true,
            },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
      members: {
        include: {
          user: true,
        },
        orderBy: { joinedAt: 'asc' },
      },
      invitations: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

function canAssignRole(currentRole: string | undefined, targetRole: string) {
  if (currentRole === 'OWNER') return true
  if (currentRole !== 'ADMIN') return false
  return targetRole === 'MEMBER' || targetRole === 'VIEWER'
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await getBoardContext(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const memberIds = new Set(board.members.map((member) => member.userId))

  return NextResponse.json({
    members: board.members.map((member) => ({
      id: member.user.id,
      role: member.role,
      name: member.user.name,
      username: member.user.username,
      email: member.user.email,
      avatarColor: member.user.avatarColor,
    })),
    availableMembers: board.workspace.members
      .filter((member) => !memberIds.has(member.userId))
      .map((member) => ({
        id: member.user.id,
        role: member.role,
        name: member.user.name,
        username: member.user.username,
        email: member.user.email,
        avatarColor: member.user.avatarColor,
      })),
    invitations: board.invitations.map((invite) => ({
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

  const { boardId } = await params
  const board = await getBoardContext(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const currentMember = board.members.find((member) => member.userId === session.user.id)
  if (!canManage(currentMember?.role)) {
    return NextResponse.json({ error: 'Sem permissao para gerenciar membros.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  if (!canAssignRole(currentMember?.role, parsed.data.role)) {
    return NextResponse.json({ error: 'Voce nao pode convidar com esse papel.' }, { status: 403 })
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (existingUser) {
    const workspaceMember = board.workspace.members.find((member) => member.userId === existingUser.id)
    if (!workspaceMember) {
      return NextResponse.json({ error: 'O usuario precisa fazer parte do workspace antes de entrar no board.' }, { status: 400 })
    }

    const existingBoardMember = board.members.find((member) => member.userId === existingUser.id)
    if (existingBoardMember) {
      return NextResponse.json({ error: 'Usuario ja esta no board.' }, { status: 409 })
    }

    const created = await prisma.boardMember.create({
      data: {
        boardId,
        userId: existingUser.id,
        role: parsed.data.role,
      },
      include: {
        user: true,
      },
    })

    await createActivityLog({
      workspaceId: board.workspaceId,
      boardId,
      userId: session.user.id,
      entityType: 'BOARD_MEMBER',
      action: 'board.member.added',
      message: `Adicionou ${created.user.name} ao board ${board.title}`,
    })

    return NextResponse.json({
      member: {
        id: created.user.id,
        role: created.role,
        name: created.user.name,
        username: created.user.username,
        email: created.user.email,
        avatarColor: created.user.avatarColor,
      },
    })
  }

  const invitation = await prisma.invitation.create({
    data: {
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'PENDING',
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      workspaceId: board.workspaceId,
      boardId,
      invitedById: session.user.id,
    },
  })

  try {
    await sendInvitationEmail({
      to: invitation.email,
      role: invitation.role,
      token: invitation.token,
      inviterName: session.user.name,
      workspaceName: board.workspace.name,
      boardName: board.title,
    })
  } catch (error) {
    await prisma.invitation.delete({ where: { id: invitation.id } })
    const message = error instanceof Error ? error.message : 'Falha ao enviar e-mail de convite.'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'INVITATION',
    action: 'board.invitation.created',
    message: `Enviou convite para ${invitation.email} no board ${board.title}`,
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

  const { boardId } = await params
  const board = await getBoardContext(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const currentMember = board.members.find((member) => member.userId === session.user.id)
  if (!canManage(currentMember?.role)) {
    return NextResponse.json({ error: 'Sem permissao para gerenciar membros.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  if (!canAssignRole(currentMember?.role, parsed.data.role)) {
    return NextResponse.json({ error: 'Voce nao pode atribuir esse papel.' }, { status: 403 })
  }

  const targetMember = board.members.find((member) => member.userId === parsed.data.userId)
  if (!targetMember) return NextResponse.json({ error: 'Membro nao encontrado.' }, { status: 404 })

  if (targetMember.userId === session.user.id && currentMember?.role === 'OWNER' && parsed.data.role !== 'OWNER') {
    return NextResponse.json({ error: 'O owner atual nao pode remover o proprio papel.' }, { status: 400 })
  }

  if (targetMember.role === 'OWNER' && currentMember?.role !== 'OWNER') {
    return NextResponse.json({ error: 'Apenas owner pode alterar outro owner.' }, { status: 403 })
  }

  await prisma.boardMember.update({
    where: {
      boardId_userId: {
        boardId,
        userId: parsed.data.userId,
      },
    },
    data: {
      role: parsed.data.role,
    },
  })

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'BOARD_MEMBER',
    action: 'board.member.updated',
    message: `Atualizou o papel de ${targetMember.user.name} para ${parsed.data.role}`,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { boardId } = await params
  const board = await getBoardContext(boardId, session.user.id)
  if (!board) return NextResponse.json({ error: 'Board nao encontrado.' }, { status: 404 })

  const currentMember = board.members.find((member) => member.userId === session.user.id)
  if (!canManage(currentMember?.role)) {
    return NextResponse.json({ error: 'Sem permissao para gerenciar membros.' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = removeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const targetMember = board.members.find((member) => member.userId === parsed.data.userId)
  if (!targetMember) return NextResponse.json({ error: 'Membro nao encontrado.' }, { status: 404 })
  if (targetMember.role === 'OWNER') {
    return NextResponse.json({ error: 'Nao e permitido remover o owner do board.' }, { status: 400 })
  }

  await prisma.boardMember.delete({
    where: {
      boardId_userId: {
        boardId,
        userId: parsed.data.userId,
      },
    },
  })

  await createActivityLog({
    workspaceId: board.workspaceId,
    boardId,
    userId: session.user.id,
    entityType: 'BOARD_MEMBER',
    action: 'board.member.removed',
    message: `Removeu ${targetMember.user.name} do board ${board.title}`,
  })

  return NextResponse.json({ ok: true })
}
