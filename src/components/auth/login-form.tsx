'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: searchParams?.get('callbackUrl') ?? '/app',
      })

      if (result?.error) {
        setError('Email ou senha invalidos. Se o banco local nao estiver ativo, o login tambem vai falhar.')
        return
      }

      router.push(result?.url || '/app')
      router.refresh()
    } catch {
      setError('Nao foi possivel comunicar com o servidor local.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-white/10 bg-slate-950/80 text-white">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <p className="text-sm text-white/50">Acesso</p>
          <h1 className="mt-2 text-3xl font-semibold">Entrar na plataforma</h1>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-white/70">Email</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-white/70">Senha</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
        </label>
        {error ? <p className="rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </Card>
  )
}
