import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/session'
import { canEdit } from '@/lib/domain/permissions'
import { prisma } from '@/lib/db/prisma'
import { saveAttachmentFile } from '@/lib/storage'
import { createActivityLog } from '@/server/services/boards'

interface Params {
  params: Promise<{ cardId: string }>
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { cardId } = await params
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
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

  if (!card) return NextResponse.json({ error: 'Card nao encontrado.' }, { status: 404 })

  const role = card.board.members.find((member) => member.userId === session.user.id)?.role
  if (!canEdit(role)) return NextResponse.json({ error: 'Sem permissao para anexar arquivos.' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo invalido.' }, { status: 400 })

  const storedFile = await saveAttachmentFile({
    cardId,
    fileName: file.name,
    contentType: file.type || null,
    data: await file.arrayBuffer(),
  })

  const attachment = await prisma.attachment.create({
    data: {
      workspaceId: card.board.workspaceId,
      boardId: card.boardId,
      cardId,
      uploaderId: session.user.id,
      fileName: file.name,
      fileUrl: storedFile.url,
      mimeType: file.type || null,
      size: file.size,
      storageKey: storedFile.key,
    },
  })

  await createActivityLog({
    workspaceId: card.board.workspaceId,
    boardId: card.boardId,
    cardId,
    userId: session.user.id,
    entityType: 'ATTACHMENT',
    action: 'attachment.created',
    message: `Anexou o arquivo ${file.name}`,
  })

  return NextResponse.json({
    attachment: {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      size: attachment.size,
    },
  })
}
