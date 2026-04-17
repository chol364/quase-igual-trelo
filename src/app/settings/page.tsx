import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { Card } from '@/components/ui/card'
import { auth } from '@/lib/auth/session'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <AppShell user={session.user}>
      <div className="space-y-6">
        <section className="fade-up rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,21,39,.94),rgba(19,32,56,.82))] p-8 text-white shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Configuracoes</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Preferencias do produto e da conta</h1>
          <p className="mt-4 max-w-3xl text-white/62">
            A base visual desta tela ja comporta ajustes de perfil, tema, notificacoes, visibilidade e controles do ambiente de trabalho.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white">
            <h2 className="text-2xl font-semibold">Conta</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">Nome, username, avatar e ajustes pessoais do usuario.</p>
          </Card>
          <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white" style={{ animationDelay: '100ms' }}>
            <h2 className="text-2xl font-semibold">Experiencia</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">Tema, comportamento visual, preferencias de view e atalhos.</p>
          </Card>
          <Card className="fade-up border-white/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.92),rgba(8,13,24,0.82))] text-white" style={{ animationDelay: '200ms' }}>
            <h2 className="text-2xl font-semibold">Sistema</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">Permissoes, comportamento do workspace e controles administrativos.</p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
