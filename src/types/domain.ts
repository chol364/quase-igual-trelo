export type AppRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type AppBoardView = 'KANBAN' | 'LIST' | 'CALENDAR' | 'TIMELINE' | 'DASHBOARD'

export interface AppNavItem {
  title: string
  href: string
  description?: string
}
