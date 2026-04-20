import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

const schema = z.object({
  token: z.string(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Token invalido.' }, { status: 400 })
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token: parsed.data.token },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Convite nao encontrado.' }, { status: 404 })
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Convite expirado.' }, { status: 400 })
  }

  if (invitation.email !== session.user.email) {
    return NextResponse.json({ error: 'Email nao corresponde ao do convite.' }, { status: 403 })
  }

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: invitation.workspaceId,
        userId: session.user.id,
      },
    },
    update: { role: invitation.role },
    create: {
      workspaceId: invitation.workspaceId,
      userId: session.user.id,
      role: invitation.role,
    },
  })

  if (invitation.boardId) {
    await prisma.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId: invitation.boardId,
          userId: session.user.id,
        },
      },
      update: { role: invitation.role },
      create: {
        boardId: invitation.boardId,
        userId: session.user.id,
        role: invitation.role,
      },
    })
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'ACCEPTED' },
  })

  return NextResponse.json({ ok: true })
}
