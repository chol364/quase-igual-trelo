import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function auth() {
  return getServerSession(authOptions)
}
