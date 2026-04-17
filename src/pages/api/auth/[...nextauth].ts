import type { NextApiRequest, NextApiResponse } from 'next'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, authOptions)
}
