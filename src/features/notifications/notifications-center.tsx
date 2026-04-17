'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { subscribeToNotifications } from '@/lib/realtime/client'

type NotificationItem = {
  id: string
  title: string
  body: string | null
  isRead: boolean
  createdAt: string | Date
}

export function NotificationsCenter({ initialNotifications, userId }: { initialNotifications: NotificationItem[]; userId: string }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications])

  useEffect(() => {
    let active = true

    const unsubscribe = subscribeToNotifications(userId, async () => {
        const response = await fetch('/api/notifications')
        if (!response.ok) return
        const data = await response.json()
        if (!active) return
        startTransition(() => {
          setNotifications(data.notifications)
        })
      })

    return () => {
      active = false
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

    startTransition(() => {
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
    })
  }

  async function markOneAsRead(notificationId: string) {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [notificationId] }),
    })

    if (!response.ok) return

    startTransition(() => {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification
        )
      )
    })
  }

  return (
    <div className="space-y-6">
      <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(14,23,43,.94),rgba(19,31,56,.82))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Notificacoes</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Centro de leitura</h1>
            <p className="mt-4 max-w-3xl text-white/62">Alertas persistidos de mencoes, atribuicoes e mudancas importantes do fluxo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/18 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
              {unreadCount} nao lidas
            </span>
            <Button disabled={unreadCount === 0} onClick={() => void markAllAsRead()}>
              Marcar todas como lidas
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white">
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className={`rounded-[1.3rem] border p-4 transition ${notification.isRead ? 'border-white/10 bg-white/[0.03]' : 'border-cyan-400/18 bg-cyan-500/8 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]'}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  {notification.body ? <p className="mt-2 text-sm leading-6 text-white/58">{notification.body}</p> : null}
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <span className="text-xs text-white/45">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(notification.createdAt))}</span>
                  {!notification.isRead ? (
                    <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10" onClick={() => void markOneAsRead(notification.id)}>
                      Marcar como lida
                    </button>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/45">Lida</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
