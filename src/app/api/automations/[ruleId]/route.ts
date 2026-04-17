import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

const patchSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

interface Params {
  params: Promise<{ ruleId: string }>
}

async function getManagedRule(ruleId: string, userId: string) {
  return prisma.automationRule.findUnique({
    where: { id: ruleId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { ruleId } = await params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })

  const rule = await getManagedRule(ruleId, session.user.id)
  const role = rule?.workspace.members[0]?.role
  if (!rule || !['OWNER', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Regra nao encontrada.' }, { status: 404 })
  }

  const updated = await prisma.automationRule.update({
    where: { id: ruleId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive,
    },
    include: {
      workspace: { select: { id: true, name: true } },
      board: { select: { id: true, title: true } },
      triggers: true,
      actions: true,
    },
  })

  return NextResponse.json({ rule: updated })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { ruleId } = await params
  const rule = await getManagedRule(ruleId, session.user.id)
  const role = rule?.workspace.members[0]?.role
  if (!rule || !['OWNER', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Regra nao encontrada.' }, { status: 404 })
  }

  await prisma.automationRule.delete({ where: { id: ruleId } })
  return NextResponse.json({ ok: true })
}
