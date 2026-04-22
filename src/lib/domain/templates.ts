export const boardTemplates = [
  {
    id: 'product',
    name: 'Produto',
    description: 'Roadmap, discovery, build, QA e lancamento.',
    lists: ['Ideias', 'Backlog', 'Em desenvolvimento', 'Revisao', 'Concluido'],
    starterCards: [
      {
        title: 'Definir objetivo do ciclo',
        listIndex: 0,
        priority: 'HIGH',
        description: 'Descreva a meta principal desta entrega e os resultados esperados.',
        checklist: ['Alinhar escopo', 'Definir indicadores', 'Nomear responsavel'],
      },
      {
        title: 'Refinar backlog priorizado',
        listIndex: 1,
        priority: 'MEDIUM',
        description: 'Organize o backlog com foco em impacto e risco.',
        checklist: ['Revisar oportunidades', 'Quebrar entregas', 'Ordenar por prioridade'],
      },
      {
        title: 'Preparar QA e release',
        listIndex: 3,
        priority: 'MEDIUM',
        description: 'Checklist base para garantir qualidade antes de publicar.',
        checklist: ['Rodar validacoes', 'Checar regressao', 'Preparar comunicacao'],
      },
    ],
  },
  {
    id: 'content',
    name: 'Conteudo',
    description: 'Calendario editorial, producao, revisao e distribuicao.',
    lists: ['Ideias', 'Briefing', 'Producao', 'Revisao', 'Publicado'],
    starterCards: [
      {
        title: 'Calendario editorial do mes',
        listIndex: 0,
        priority: 'HIGH',
        description: 'Mapeie os temas prioritarios e os canais de distribuicao.',
        checklist: ['Definir pautas', 'Escolher canais', 'Aprovar cronograma'],
      },
      {
        title: 'Briefing do conteudo principal',
        listIndex: 1,
        priority: 'MEDIUM',
        description: 'Consolide objetivo, publico, CTA e referencias.',
        checklist: ['Objetivo', 'Publico', 'CTA', 'Referencias'],
      },
      {
        title: 'Checklist de publicacao',
        listIndex: 4,
        priority: 'LOW',
        description: 'Garanta consistencia antes de colocar no ar.',
        checklist: ['SEO basico', 'Capa', 'Links e UTMs'],
      },
    ],
  },
  {
    id: 'sales',
    name: 'Vendas',
    description: 'Pipeline simples com foco em qualificacao, proposta e fechamento.',
    lists: ['Leads', 'Qualificacao', 'Proposta', 'Negociacao', 'Fechado'],
    starterCards: [
      {
        title: 'Padrao de qualificacao',
        listIndex: 1,
        priority: 'HIGH',
        description: 'Defina as perguntas que separam lead frio de oportunidade real.',
        checklist: ['ICP', 'Dor principal', 'Prazo', 'Orcamento'],
      },
      {
        title: 'Template de proposta',
        listIndex: 2,
        priority: 'MEDIUM',
        description: 'Monte uma proposta reaproveitavel para acelerar o time.',
        checklist: ['Escopo', 'Preco', 'Prazos', 'Proximos passos'],
      },
    ],
  },
  {
    id: 'recruiting',
    name: 'Recrutamento',
    description: 'Fluxo de vagas, triagem, entrevistas e oferta.',
    lists: ['Vagas abertas', 'Triagem', 'Entrevistas', 'Oferta', 'Contratado'],
    starterCards: [
      {
        title: 'Abrir vaga com alinhamento',
        listIndex: 0,
        priority: 'HIGH',
        description: 'Documente escopo, senioridade e sinais de sucesso da contratacao.',
        checklist: ['Descricao da vaga', 'Scorecard', 'Faixa salarial'],
      },
      {
        title: 'Roteiro de triagem',
        listIndex: 1,
        priority: 'MEDIUM',
        description: 'Padronize a primeira etapa para reduzir variacao de avaliacao.',
        checklist: ['Perguntas fixas', 'Criticos de corte', 'Registro de feedback'],
      },
    ],
  },
] as const

export type BoardTemplateId = (typeof boardTemplates)[number]['id']

export function getBoardTemplate(templateId?: string | null) {
  return boardTemplates.find((template) => template.id === templateId) ?? null
}
