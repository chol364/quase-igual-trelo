import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { deleteStoredFile } from '@/lib/storage'
import { createActivityLog } from '@/server/services/boards'

interface Params {
  params: Promise<{ attachmentId: string }>
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { attachmentId } = await params
  const attachment = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      board: {
        workspace: {
          members: {
            some: { userId: session.user.id },
          },
        },
      },
    },
    include: {
      board: {
        include: { members: true },
      },
    },
  })

  if (!attachment) return NextResponse.json({ error: 'Anexo nao encontrado.' }, { status: 404 })
  const role = attachment.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para remover anexo.' }, { status: 403 })

  await prisma.attachment.delete({ where: { id: attachmentId } })

  if (attachment.storageKey) {
    await deleteStoredFile(attachment.storageKey)
  }

  await createActivityLog({
    workspaceId: attachment.workspaceId,
    boardId: attachment.boardId,
    cardId: attachment.cardId,
    userId: session.user.id,
    entityType: 'ATTACHMENT',
    action: 'attachment.deleted',
    message: `Removeu o anexo ${attachment.fileName}`,
  })

  return NextResponse.json({ ok: true })
}
