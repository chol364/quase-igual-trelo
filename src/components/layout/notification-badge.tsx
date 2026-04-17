'use client'

import { useEffect, useState } from 'react'
import { subscribeToNotifications } from '@/lib/realtime/client'

export function NotificationBadge({ initialCount, userId }: { initialCount: number; userId: string }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    if (!userId) return

    let mounted = true

    const unsubscribe = subscribeToNotifications(userId, async () => {
        const response = await fetch('/api/notifications')
        if (!response.ok) return
        const data = await response.json()
        if (mounted) {
          setCount(data.unreadCount)
        }
      })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [userId])

  if (count <= 0) return null

  return (
    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
      {Math.min(count, 99)}
    </span>
  )
}
