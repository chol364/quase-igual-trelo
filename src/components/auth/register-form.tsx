'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

async function readJsonSafely(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as { error?: string }
  } catch {
    return null
  }
}

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await readJsonSafely(response)
      if (!response.ok) {
        setLoading(false)
        setError(
          data?.error ||
            'Falha ao criar conta. Se o erro persistir, confirme se o banco de dados local esta rodando.'
        )
        return
      }

      await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl: searchParams?.get('callbackUrl') ?? '/app',
      })

      router.push(searchParams?.get('callbackUrl') ?? '/app')
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
          <p className="text-sm text-white/50">Onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold">Criar conta</h1>
        </div>

        {[
          ['name', 'Nome'],
          ['username', 'Username'],
          ['email', 'Email'],
          ['password', 'Senha'],
        ].map(([key, label]) => (
          <label key={key} className="block space-y-2">
            <span className="text-sm text-white/70">{label}</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
              value={form[key as keyof typeof form]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              required
            />
          </label>
        ))}

        {error ? <p className="rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? 'Criando...' : 'Criar conta'}
        </Button>
      </form>
    </Card>
  )
}
