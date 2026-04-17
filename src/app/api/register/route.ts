import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MEMBER_ROLES } from '@/lib/domain/constants'
import { prisma } from '@/lib/db/prisma'
import { createActivityLog, createDefaultBoardData, ensureWorkspaceMembership } from '@/server/services/boards'

const registerSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos para cadastro.' }, { status: 400 })
  }

  const { name, username, email, password } = parsed.data
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'Email ou username já está em uso.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const slug = username

  const user = await prisma.user.create({
    data: {
      name,
      username,
      email,
      passwordHash,
      avatarColor: '#4f8cff',
    },
  })

  const workspace = await prisma.workspace.create({
    data: {
      name: `${name.split(' ')[0]} Workspace`,
      slug: `${slug}-workspace`,
      ownerId: user.id,
      visibility: 'PRIVATE',
    },
  })

  await ensureWorkspaceMembership(workspace.id, user.id, MEMBER_ROLES[0])

  const board = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      ownerId: user.id,
      title: 'Meu primeiro board',
      slug: `${slug}-primeiro-board`,
      visibility: 'WORKSPACE',
      background: '#12335b',
    },
  })

  await prisma.boardMember.create({
    data: {
      boardId: board.id,
      userId: user.id,
      role: 'OWNER',
    },
  })

  await createDefaultBoardData(board.id, user.id)
  await createActivityLog({
    workspaceId: workspace.id,
    boardId: board.id,
    userId: user.id,
    entityType: 'WORKSPACE',
    action: 'workspace.created',
    message: `Criou o workspace ${workspace.name}`,
  })

  return NextResponse.json({ ok: true })
}
