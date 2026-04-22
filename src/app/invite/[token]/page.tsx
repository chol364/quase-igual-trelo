'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

async function readJsonSafely(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as { error?: string; redirectTo?: string }
  } catch {
    return null
  }
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter()
  const { status } = useSession()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function resolveToken() {
      const resolved = await params
      if (!active) return
      setToken(resolved.token)
    }

    void resolveToken()

    return () => {
      active = false
    }
  }, [params])

  useEffect(() => {
    if (!token) return

    if (status === 'unauthenticated') {
      setLoading(false)
      return
    }

    if (status !== 'authenticated') {
      return
    }

    let active = true

    async function acceptInvite() {
      try {
        const response = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await readJsonSafely(response)
        if (!response.ok) {
          throw new Error(data?.error || 'Erro ao aceitar convite.')
        }

        router.push(data?.redirectTo || '/app')
        router.refresh()
      } catch (inviteError) {
        if (!active) return
        setError(inviteError instanceof Error ? inviteError.message : 'Erro ao aceitar convite.')
        setLoading(false)
      }
    }

    void acceptInvite()

    return () => {
      active = false
    }
  }, [router, status, token])

  const callbackUrl = token ? `/invite/${encodeURIComponent(token)}` : '/app'

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-400" />
          <p>{status === 'authenticated' ? 'Aceitando convite...' : 'Carregando convite...'}</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10 text-white">
        <div className="max-w-md rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center">
          <p className="text-lg font-medium text-rose-300">{error}</p>
          <Link className="mt-4 inline-flex text-sm text-cyan-300 transition hover:text-cyan-200" href="/app">
            Voltar para o app
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 text-white">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(10,23,45,.96),rgba(20,43,82,.82))] p-8 text-center shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/70">Convite</p>
        <h1 className="mt-4 text-3xl font-semibold">Continue para aceitar este convite</h1>
        <p className="mt-4 text-sm leading-6 text-white/68">
          Entre na sua conta ou crie uma nova conta com o mesmo e-mail que recebeu o convite. Depois disso, o acesso e liberado automaticamente.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-400"
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Entrar
          </Link>
          <Link
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  )
}
