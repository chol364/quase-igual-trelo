import type { NextApiRequest } from 'next'
import type { NextApiResponseServerIO } from '@/types/socket'
import { Server as IOServer } from 'socket.io'
import { setIO } from '@/lib/realtime/socket-server'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function handler(_req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    })

    io.on('connection', (socket) => {
      socket.on('board:join', (boardId: string) => {
        socket.join(`board:${boardId}`)
      })

      socket.on('user:join', (userId: string) => {
        socket.join(`user:${userId}`)
      })
    })

    res.socket.server.io = io
    setIO(io)
  }

  res.end()
}
