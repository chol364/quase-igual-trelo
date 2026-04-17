import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { authorizeRealtimeChannel } from '@/lib/realtime/socket-server'

function getChannelTarget(channelName: string) {
  if (channelName.startsWith('private-user.')) {
    return {
      id: channelName.slice('private-user.'.length),
      type: 'user' as const,
    }
  }

  if (channelName.startsWith('private-board.')) {
    return {
      id: channelName.slice('private-board.'.length),
      type: 'board' as const,
    }
  }

  return null
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  }

  const formData = await request.formData()
  const socketId = formData.get('socket_id')
  const channelName = formData.get('channel_name')

  if (typeof socketId !== 'string' || typeof channelName !== 'string') {
    return NextResponse.json({ error: 'Payload realtime invalido.' }, { status: 400 })
  }

  const target = getChannelTarget(channelName)
  if (!target) {
    return NextResponse.json({ error: 'Canal realtime invalido.' }, { status: 403 })
  }

  if (target.type === 'user') {
    if (target.id !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissao para este canal.' }, { status: 403 })
    }
  }

  if (target.type === 'board') {
    const board = await prisma.board.findFirst({
      where: {
        id: target.id,
        workspace: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      select: { id: true },
    })

    if (!board) {
      return NextResponse.json({ error: 'Sem permissao para este board.' }, { status: 403 })
    }
  }

  try {
    return NextResponse.json(authorizeRealtimeChannel(socketId, channelName))
  } catch (error) {
    console.error('Falha ao autorizar canal realtime.', error)
    return NextResponse.json({ error: 'Realtime nao configurado.' }, { status: 500 })
  }
}
