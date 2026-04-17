import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/register-form'
import { auth } from '@/lib/auth/session'

const cards = [
  ['Espaco inicial', 'A conta ja nasce com estrutura pronta para voce nao cair em tela vazia.'],
  ['Board editavel', 'Crie listas, cards e comentarios sem setup tecnico adicional.'],
  ['Fluxo original', 'Visual proprio, dark mode e uma base mais refinada para crescer.'],
  ['Escalavel', 'Arquitetura preparada para filtros, analytics, automacoes e notificacoes.'],
]

export default async function RegisterPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/app')

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="hero-orb absolute left-[14%] top-28 h-80 w-80 rounded-full bg-emerald-500/12 blur-3xl" />
      <div className="hero-orb-delayed absolute right-[10%] top-20 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />

      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[430px_1fr]">
        <div className="fade-up flex flex-col items-center justify-center gap-5">
          <RegisterForm />
          <p className="text-sm text-white/55">
            Ja tem conta?{' '}
            <Link className="text-cyan-300 transition hover:text-cyan-200" href="/login">
              Entrar
            </Link>
          </p>
        </div>

        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(10,23,45,.96),rgba(20,43,82,.82))] p-8 shadow-[0_34px_90px_rgba(0,0,0,0.28)] lg:p-12" style={{ animationDelay: '100ms' }}>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/70">Alquimia Tarefas</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
            Crie a conta e receba uma base pronta para comecar organizando.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/64">
            O objetivo aqui nao e te jogar num painel vazio. O onboarding nasce com espaco inicial, board e estrutura suficiente para voce entender e agir.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {cards.map(([title, description], index) => (
              <div
                key={title}
                className="stagger-rise rounded-[1.5rem] border border-white/10 bg-black/15 p-5"
                style={{ animationDelay: `${index * 100 + 160}ms` }}
              >
                <h2 className="font-medium">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
