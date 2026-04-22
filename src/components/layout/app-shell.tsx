import Link from 'next/link'
import { User } from 'next-auth'
import { CommandPalette } from '@/components/layout/command-palette'
import { NotificationHub } from '@/components/layout/notification-hub'
import { SignOutButton } from '@/components/auth/signout-button'
import { NotificationBadge } from '@/components/layout/notification-badge'
import { prisma } from '@/lib/db/prisma'

const navItems = [
  { href: '/app', label: 'Inicio' },
  { href: '/workspaces', label: 'Espacos' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/automations', label: 'Automacoes' },
  { href: '/notifications', label: 'Notificacoes' },
  { href: '/settings', label: 'Configuracoes' },
]

export async function AppShell({
  user,
  children,
}: {
  user: User & { id?: string }
  children: React.ReactNode
}) {
  const unreadCount = user.id
    ? await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      })
    : 0
  const latestNotifications = user.id
    ? await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          body: true,
          isRead: true,
          createdAt: true,
          link: true,
        },
      })
    : []
  const commandItems = user.id
    ? [
        ...navItems.map((item) => ({
          id: item.href,
          label: item.label,
          hint: 'Abrir pagina',
          href: item.href,
          section: 'Navegacao',
        })),
        ...(
          await prisma.workspace.findMany({
            where: {
              members: {
                some: { userId: user.id },
              },
            },
            orderBy: { updatedAt: 'desc' },
            take: 8,
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          })
        ).map((workspace) => ({
          id: workspace.id,
          label: workspace.name,
          hint: workspace.description || 'Abrir workspace',
          href: `/workspaces/${workspace.slug}`,
          section: 'Workspaces',
        })),
        ...(
          await prisma.board.findMany({
            where: {
              workspace: {
                members: {
                  some: { userId: user.id },
                },
              },
              isArchived: false,
            },
            orderBy: { updatedAt: 'desc' },
            take: 8,
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              workspace: {
                select: { name: true },
              },
            },
          })
        ).map((board) => ({
          id: board.id,
          label: board.title,
          hint: board.description || board.workspace.name,
          href: `/boards/${board.slug}`,
          section: 'Boards',
        })),
        ...(
          await prisma.card.findMany({
            where: {
              isArchived: false,
              board: {
                workspace: {
                  members: {
                    some: { userId: user.id },
                  },
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
            take: 12,
            select: {
              id: true,
              title: true,
              description: true,
              board: {
                select: {
                  slug: true,
                  title: true,
                  workspace: {
                    select: { name: true },
                  },
                },
              },
            },
          })
        ).map((card) => ({
          id: card.id,
          label: card.title,
          hint: `${card.board.title} • ${card.board.workspace.name}${card.description ? ` • ${card.description}` : ''}`,
          href: `/boards/${card.board.slug}?card=${card.id}`,
          section: 'Cards',
        })),
      ]
    : navItems.map((item) => ({
        id: item.href,
        label: item.label,
        hint: 'Abrir pagina',
        href: item.href,
        section: 'Navegacao',
      }))

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(38,131,255,0.22),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(0,184,148,0.14),transparent_18%),linear-gradient(180deg,#09111e,#0b1527_45%,#0c1728)] text-white">
      <header className="fade-in sticky top-0 z-30 border-b border-white/8 bg-[rgba(6,11,22,0.72)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-5">
            <Link href="/app" className="flex items-center gap-3">
              <div className="orbital-ring soft-pulse grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#26c6da,#155eef)] text-sm font-bold shadow-[0_18px_40px_rgba(21,94,239,0.35)]">
                AT
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/35">Alquimia</p>
                <p className="text-base font-semibold">Tarefas</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1.5 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item-glow relative rounded-full px-4 py-2 text-sm text-white/62 transition hover:bg-white/8 hover:text-white"
                >
                  {item.label}
                  {item.href === '/notifications' ? <NotificationBadge initialCount={unreadCount} userId={user.id ?? ''} /> : null}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <CommandPalette items={commandItems} />
            {user.id ? <NotificationHub userId={user.id} initialCount={unreadCount} initialNotifications={latestNotifications} /> : null}
            <div className="ambient-panel hidden items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 md:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold text-cyan-200">
                {user.name?.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/35">{unreadCount} alertas</p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-8">{children}</div>
    </div>
  )
}
