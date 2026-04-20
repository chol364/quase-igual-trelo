'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const acceptInvite = async () => {
      if (status === 'unauthenticated') {
        router.push(`/login?callbackUrl=/invite/${params.token}`)
        return
      }

      if (status !== 'authenticated') {
        return
      }

      try {
        const response = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: params.token }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erro ao aceitar convite')
        }

        router.push('/workspaces')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setLoading(false)
      }
    }

    void acceptInvite()
  }, [status, params.token, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p>Aceitando convite...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Link href="/workspaces" className="text-blue-500 underline">
            Voltar para workspaces
          </Link>
        </div>
      </div>
    )
  }

  return null
}
