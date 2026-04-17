import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { emitNotificationUpdate } from '@/lib/realtime/socket-server'

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      ...(parsed.data.markAll ? {} : { id: { in: parsed.data.ids ?? [] } }),
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  const unreadCount = await prisma.notification.count({
    where: {
      userId: session.user.id,
      isRead: false,
    },
  })
  emitNotificationUpdate(session.user.id)

  return NextResponse.json({ ok: true, unreadCount })
}
