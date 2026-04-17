import type { MemberRole } from '@/lib/domain/constants'

export function canEdit(role?: string | null) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER'
}

export function canManage(role?: string | null) {
  return role === 'OWNER' || role === 'ADMIN'
}

export function isViewer(role?: string | null) {
  return role === 'VIEWER'
}

export function normalizeRole(role?: string | null): MemberRole {
  if (role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER' || role === 'VIEWER') return role
  return 'MEMBER'
}
