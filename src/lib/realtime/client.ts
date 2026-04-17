'use client'

import Pusher, { type Channel } from 'pusher-js'
import { io, type Socket } from 'socket.io-client'

type BoardUpdatedPayload = { boardId: string }
type NotificationUpdatedPayload = { userId: string }

let pusherClient: Pusher | null = null

function getRealtimeProvider() {
  if (process.env.NEXT_PUBLIC_REALTIME_PROVIDER === 'pusher') return 'pusher'
  if (process.env.NEXT_PUBLIC_REALTIME_PROVIDER === 'socket.io') return 'socket.io'
  return process.env.NODE_ENV === 'production' ? 'pusher' : 'socket.io'
}

function getPusherClient() {
  if (pusherClient) return pusherClient

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!key || !cluster) {
    return null
  }

  pusherClient = new Pusher(key, {
    cluster,
    forceTLS: true,
    channelAuthorization: {
      endpoint: '/api/realtime/auth',
      transport: 'ajax',
    },
  })

  return pusherClient
}

function subscribeWithSocket(channel: 'board' | 'user', id: string, eventName: string, callback: (payload: unknown) => void) {
  let socket: Socket | null = null
  let cancelled = false

  void (async () => {
    await fetch('/api/socket')
    if (cancelled) return

    socket = io({ path: '/api/socket' })
    socket.emit(channel === 'board' ? 'board:join' : 'user:join', id)
    socket.on(eventName, callback)
  })()

  return () => {
    cancelled = true
    socket?.disconnect()
  }
}

function subscribeWithPusher(channelName: string, eventName: string, callback: (payload: unknown) => void) {
  const client = getPusherClient()
  if (!client) {
    return () => undefined
  }

  const channel = client.subscribe(channelName) as Channel
  channel.bind(eventName, callback)

  return () => {
    channel.unbind(eventName, callback)
    client.unsubscribe(channelName)
  }
}

export function subscribeToBoard(boardId: string, callback: (payload: BoardUpdatedPayload) => void) {
  if (getRealtimeProvider() === 'pusher') {
    return subscribeWithPusher(`private-board.${boardId}`, 'board:updated', (payload) =>
      callback(payload as BoardUpdatedPayload)
    )
  }

  return subscribeWithSocket('board', boardId, 'board:updated', (payload) =>
    callback(payload as BoardUpdatedPayload)
  )
}

export function subscribeToNotifications(userId: string, callback: (payload: NotificationUpdatedPayload) => void) {
  if (getRealtimeProvider() === 'pusher') {
    return subscribeWithPusher(`private-user.${userId}`, 'notifications:updated', (payload) =>
      callback(payload as NotificationUpdatedPayload)
    )
  }

  return subscribeWithSocket('user', userId, 'notifications:updated', (payload) =>
    callback(payload as NotificationUpdatedPayload)
  )
}
