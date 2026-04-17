import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Card } from '@/components/ui/card'
import { auth } from '@/lib/auth/session'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <AppShell user={session.user}>
      <div className="space-y-6">
        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(11,22,41,.94),rgba(22,33,59,.82))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Perfil</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Sua identidade dentro do fluxo</h1>
          <p className="mt-4 max-w-3xl text-white/62">
            A tela agora sustenta uma apresentacao melhor para avatar, username, preferencias e futuros controles de notificacao pessoal.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-[1.8rem] bg-[linear-gradient(135deg,#22d3ee,#2563eb)] text-xl font-semibold">
                {session.user.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-2xl font-semibold">{session.user.name}</p>
                <p className="mt-1 text-sm text-white/55">{session.user.email}</p>
              </div>
            </div>
          </Card>

          <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white" style={{ animationDelay: '100ms' }}>
            <h2 className="text-2xl font-semibold">Campos futuros</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {['Avatar customizado', 'Username publico', 'Preferencias pessoais', 'Assinatura visual'].map((item, index) => (
                <div
                  key={item}
                  className="stagger-rise rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/58"
                  style={{ animationDelay: `${index * 100 + 120}ms` }}
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
