import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.notification.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.checklistItem.deleteMany()
  await prisma.checklist.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.cardMember.deleteMany()
  await prisma.customFieldValue.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.label.deleteMany()
  await prisma.boardViewPreference.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.customField.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('12345678', 10)

  const owner = await prisma.user.create({
    data: {
      name: 'Matheus Bueno',
      username: 'matheus',
      email: 'matheus@example.com',
      passwordHash,
      theme: 'dark',
      avatarColor: '#0c66e4',
    },
  })

  const ana = await prisma.user.create({
    data: {
      name: 'Ana Lima',
      username: 'ana',
      email: 'ana@example.com',
      passwordHash,
      theme: 'dark',
      avatarColor: '#8b5cf6',
    },
  })

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Studio Atlas',
      slug: 'studio-atlas',
      description: 'Workspace de produto, marketing e operacao.',
      visibility: 'PRIVATE',
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: ana.id, role: 'ADMIN' },
        ],
      },
    },
  })

  const board = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      ownerId: owner.id,
      title: 'Roadmap Q2',
      slug: 'roadmap-q2',
      description: 'Planejamento do trimestre com foco em ativacao e retencao.',
      background: '#0f3d72',
      visibility: 'WORKSPACE',
      isFavorite: true,
      defaultView: 'KANBAN',
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: ana.id, role: 'ADMIN' },
        ],
      },
    },
  })

  const [, doing] = await Promise.all([
    prisma.list.create({ data: { boardId: board.id, title: 'Backlog', sortOrder: 0 } }),
    prisma.list.create({ data: { boardId: board.id, title: 'Em andamento', sortOrder: 1 } }),
    prisma.list.create({ data: { boardId: board.id, title: 'Revisao', sortOrder: 2 } }),
    prisma.list.create({ data: { boardId: board.id, title: 'Concluido', sortOrder: 3 } }),
  ])

  const [designLabel, backendLabel] = await Promise.all([
    prisma.label.create({
      data: {
        workspaceId: workspace.id,
        boardId: board.id,
        name: 'Design',
        color: '#3b82f6',
      },
    }),
    prisma.label.create({
      data: {
        workspaceId: workspace.id,
        boardId: board.id,
        name: 'Backend',
        color: '#8b5cf6',
      },
    }),
  ])

  const card = await prisma.card.create({
    data: {
      boardId: board.id,
      listId: doing.id,
      createdById: owner.id,
      title: 'Implementar onboarding colaborativo',
      slug: 'implementar-onboarding-colaborativo',
      description: 'Fluxo inicial com convite de membros, checklist e feedback visual.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      sortOrder: 0,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      members: {
        create: [{ userId: owner.id }, { userId: ana.id }],
      },
      labels: {
        create: [{ labelId: designLabel.id }, { labelId: backendLabel.id }],
      },
    },
  })

  const checklist = await prisma.checklist.create({
    data: {
      cardId: card.id,
      title: 'Entrega',
      sortOrder: 0,
      items: {
        create: [
          { title: 'Definir copy da experiencia', sortOrder: 0, isCompleted: true },
          { title: 'Implementar persistencia no banco', sortOrder: 1 },
          { title: 'Criar testes e2e do fluxo', sortOrder: 2 },
        ],
      },
    },
  })

  await prisma.comment.create({
    data: {
      workspaceId: workspace.id,
      boardId: board.id,
      cardId: card.id,
      authorId: ana.id,
      content: 'Vamos fechar os atalhos de teclado nessa sprint tambem.',
      mentions: { users: [owner.username] },
    },
  })

  await prisma.attachment.create({
    data: {
      workspaceId: workspace.id,
      boardId: board.id,
      cardId: card.id,
      uploaderId: owner.id,
      fileName: 'Briefing-onboarding.pdf',
      fileUrl: 'https://example.com/briefing-onboarding.pdf',
      mimeType: 'application/pdf',
      size: 182044,
    },
  })

  await prisma.activityLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        boardId: board.id,
        userId: owner.id,
        entityType: 'BOARD',
        action: 'board.created',
        message: 'Criou o board Roadmap Q2',
      },
      {
        workspaceId: workspace.id,
        boardId: board.id,
        listId: doing.id,
        cardId: card.id,
        userId: owner.id,
        entityType: 'CARD',
        action: 'card.moved',
        message: 'Moveu o card para Em andamento',
      },
    ],
  })

  await prisma.boardViewPreference.create({
    data: {
      boardId: board.id,
      userId: owner.id,
      view: 'KANBAN',
      filters: { assignee: owner.id },
    },
  })

  await prisma.customField.create({
    data: {
      workspaceId: workspace.id,
      boardId: board.id,
      name: 'Esforco',
      type: 'number',
      options: { min: 1, max: 13 },
    },
  })

  console.log(`Seed concluido. Workspace: ${workspace.name}, Board: ${board.title}, Checklist: ${checklist.title}`)
  console.log('Usuario demo: matheus@example.com / 12345678')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
