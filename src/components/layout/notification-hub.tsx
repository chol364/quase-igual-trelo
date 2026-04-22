'use client'

import { Bell, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { subscribeToNotifications } from '@/lib/realtime/client'

type NotificationItem = {
  id: string
  title: string
  body: string | null
  isRead: boolean
  createdAt: string | Date
  link: string | null
}

async function fetchNotifications() {
  const response = await fetch('/api/notifications')
  if (!response.ok) return null
  return response.json() as Promise<{ notifications: NotificationItem[]; unreadCount: number }>
}

export function NotificationHub({
  userId,
  initialCount,
  initialNotifications,
}: {
  userId: string
  initialCount: number
  initialNotifications: NotificationItem[]
}) {
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [open, setOpen] = useState(false)
  const unreadLabel = useMemo(() => `${count} alerta${count === 1 ? '' : 's'}`, [count])

  useEffect(() => {
    if (!userId) return

    let mounted = true

    const unsubscribe = subscribeToNotifications(userId, async () => {
      const data = await fetchNotifications()
      if (!data || !mounted) return
      setCount(data.unreadCount)
      setNotifications(data.notifications)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [userId])

  async function markAllAsRead() {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
    if (!response.ok) return
    setCount(0)
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
  }

  return (
    <div className="relative">
      <button
        className="micro-bounce relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.1]"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className={`h-4 w-4 transition ${count > 0 ? 'text-cyan-200' : 'text-white/70'}`} />
        <span>Alertas</span>
        {count > 0 ? (
          <span className="soft-pulse grid h-5 min-w-5 place-items-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
            {Math.min(count, 99)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="app-fade absolute right-0 top-[calc(100%+12px)] z-40 w-[390px] max-w-[calc(100vw-2rem)]">
          <div className="app-panel app-rise rounded-[1.6rem] border border-white/10 bg-[rgba(6,11,22,0.96)] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Central ao vivo</p>
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">{unreadLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="micro-bounce rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.1]" onClick={() => void markAllAsRead()}>
                  Marcar tudo
                </button>
                <Link className="micro-bounce rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.1]" href="/notifications" onClick={() => setOpen(false)}>
                  Abrir centro
                </Link>
              </div>
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {notifications.slice(0, 8).map((notification, index) => {
                const content = (
                  <div
                    className={`app-stagger app-panel micro-bounce rounded-[1.2rem] border p-4 transition ${
                      notification.isRead ? 'border-white/10 bg-white/[0.03]' : 'border-cyan-400/20 bg-cyan-500/10'
                    }`}
                    style={{ animationDelay: `${index * 28}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-white">{notification.title}</p>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(notification.createdAt))}
                      </span>
                    </div>
                    {notification.body ? <p className="mt-2 text-sm leading-6 text-white/58">{notification.body}</p> : null}
                  </div>
                )

                return notification.link ? (
                  <Link key={notification.id} href={notification.link} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                )
              })}

              {!notifications.length ? (
                <div className="empty-glow app-rise rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/45">
                  <div className="empty-orbit mx-auto mb-5 grid h-18 w-18 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Sparkles className="h-7 w-7 text-cyan-200/85" />
                  </div>
                  <p className="font-medium text-white/75">Nenhuma notificacao por enquanto</p>
                  <p className="mt-2 leading-6">Quando houver movimento relevante nos seus boards, ele aparece aqui.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
