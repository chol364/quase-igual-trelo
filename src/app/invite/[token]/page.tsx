'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
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

    acceptInvite()
  }, [status, params.token, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Aceitando convite...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">❌ {error}</p>
          <a href="/workspaces" className="text-blue-500 underline">
            Voltar para workspaces
          </a>
        </div>
      </div>
    )
  }

  return null
}
