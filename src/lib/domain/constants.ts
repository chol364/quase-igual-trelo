export const WORKSPACE_VISIBILITIES = ['PRIVATE', 'PUBLIC'] as const
export const BOARD_VISIBILITIES = ['PRIVATE', 'WORKSPACE', 'PUBLIC'] as const
export const MEMBER_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const
export const BOARD_VIEWS = ['KANBAN', 'LIST', 'CALENDAR', 'TIMELINE', 'DASHBOARD'] as const
export const CARD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export const CARD_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE', 'ARCHIVED'] as const

export type WorkspaceVisibility = (typeof WORKSPACE_VISIBILITIES)[number]
export type BoardVisibility = (typeof BOARD_VISIBILITIES)[number]
export type MemberRole = (typeof MEMBER_ROLES)[number]
export type BoardView = (typeof BOARD_VIEWS)[number]
export type CardPriority = (typeof CARD_PRIORITIES)[number]
export type CardStatus = (typeof CARD_STATUSES)[number]
