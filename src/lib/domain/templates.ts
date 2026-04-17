export const boardTemplates = [
  {
    id: 'product',
    name: 'Produto',
    description: 'Roadmap, backlog, desenvolvimento, revisao e entrega.',
    lists: ['Ideias', 'Backlog', 'Em desenvolvimento', 'Revisao', 'Concluido'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Planejamento, criacao, aprovacao e publicacao.',
    lists: ['Briefing', 'Planejamento', 'Criacao', 'Aprovacao', 'Publicado'],
  },
  {
    id: 'support',
    name: 'Suporte',
    description: 'Entrada, triagem, em tratamento, aguardando retorno e resolvido.',
    lists: ['Entrada', 'Triagem', 'Em tratamento', 'Aguardando retorno', 'Resolvido'],
  },
] as const

export type BoardTemplateId = (typeof boardTemplates)[number]['id']

export function getBoardTemplate(templateId?: string | null) {
  return boardTemplates.find((template) => template.id === templateId) ?? null
}
