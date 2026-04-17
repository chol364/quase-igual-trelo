import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { AutomationCenter } from '@/features/automations/automation-center'
import { auth } from '@/lib/auth/session'

export default async function AutomationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <AppShell user={session.user}>
      <AutomationCenter />
    </AppShell>
  )
}
