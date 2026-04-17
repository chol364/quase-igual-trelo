import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { NotificationsCenter } from '@/features/notifications/notifications-center'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <AppShell user={session.user}>
      <NotificationsCenter initialNotifications={notifications} userId={session.user.id} />
    </AppShell>
  )
}
