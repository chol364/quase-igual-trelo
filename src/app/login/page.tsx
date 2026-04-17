import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { auth } from '@/lib/auth/session'

const points = [
  'Entre nos seus boards recentes em poucos segundos.',
  'Mantenha contexto visual com cards, prazos e comentarios.',
  'Continue o fluxo sem perder espacos, membros e atividade.',
]

export default async function LoginPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/app')

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="hero-orb absolute left-[12%] top-24 h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl" />
      <div className="hero-orb-delayed absolute right-[10%] top-40 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.08fr_430px]">
        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,24,44,.94),rgba(18,34,63,.82))] p-8 shadow-[0_34px_90px_rgba(0,0,0,0.28)] backdrop-blur xl:p-12">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/70">Alquimia Tarefas</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight xl:text-5xl">
            Entre no painel e retome seu fluxo com clareza imediata.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
            Uma interface pensada para trabalho real: espacos bem separados, boards vivos e cards com contexto suficiente para agir sem atrito.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {points.map((item, index) => (
              <div
                key={item}
                className="stagger-rise rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5"
                style={{ animationDelay: `${index * 120 + 140}ms` }}
              >
                <p className="text-sm leading-6 text-white/72">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="fade-up flex flex-col items-center justify-center gap-5" style={{ animationDelay: '100ms' }}>
          <LoginForm />
          <p className="text-sm text-white/55">
            Nao tem conta?{' '}
            <Link className="text-cyan-300 transition hover:text-cyan-200" href="/register">
              Criar agora
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
