import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { slug } = await params

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug,
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
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 })

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      visibility: workspace.visibility,
      boards: workspace.boards.map((board) => ({
        id: board.id,
        title: board.title,
        slug: board.slug,
        description: board.description,
        background: board.background,
        isFavorite: board.isFavorite,
        updatedAt: board.updatedAt,
      })),
      members: workspace.members.map((member) => ({
        id: member.user.id,
        role: member.role,
        name: member.user.name,
        username: member.user.username,
        avatarColor: member.user.avatarColor,
      })),
    },
  })
}
