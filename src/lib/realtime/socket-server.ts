import type { Server as IOServer } from 'socket.io'
import Pusher from 'pusher'

declare global {
  var __taskflow_io__: IOServer | undefined
}

let pusherClient: Pusher | null | undefined

function getRealtimeProvider() {
  if (process.env.REALTIME_PROVIDER === 'pusher') return 'pusher'
  if (process.env.REALTIME_PROVIDER === 'socket.io') return 'socket.io'
  return process.env.VERCEL ? 'pusher' : 'socket.io'
}

function getPusherClient() {
  if (pusherClient !== undefined) return pusherClient

  const appId = process.env.PUSHER_APP_ID
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!appId || !key || !secret || !cluster) {
    pusherClient = null
    return pusherClient
  }

  pusherClient = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  })

  return pusherClient
}

function publish(channel: string, event: string, payload: Record<string, unknown>) {
  if (getRealtimeProvider() === 'pusher') {
    const client = getPusherClient()
    if (!client) return

    void client.trigger(channel, event, payload).catch((error) => {
      console.error(`Falha ao publicar evento realtime ${event}.`, error)
    })
    return
  }

  const io = getIO()
  io?.to(channel).emit(event, payload)
}

export function setIO(io: IOServer) {
  globalThis.__taskflow_io__ = io
}

export function getIO() {
  return globalThis.__taskflow_io__
}

export function emitBoardUpdate(boardId: string, payload?: Record<string, unknown>) {
  publish(getRealtimeProvider() === 'pusher' ? `private-board.${boardId}` : `board:${boardId}`, 'board:updated', {
    boardId,
    ...payload,
  })
}

export function emitNotificationUpdate(userId: string) {
  publish(getRealtimeProvider() === 'pusher' ? `private-user.${userId}` : `user:${userId}`, 'notifications:updated', {
    userId,
  })
}

export function authorizeRealtimeChannel(socketId: string, channelName: string) {
  const client = getPusherClient()
  if (!client) {
    throw new Error('Pusher nao configurado.')
  }

  return client.authorizeChannel(socketId, channelName)
}
