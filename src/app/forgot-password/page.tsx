import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl items-center px-6 py-10">
      <div className="hero-orb absolute left-[12%] top-24 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />
      <section className="fade-up relative w-full rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(11,20,37,.94),rgba(15,30,54,.82))] p-8 shadow-[0_34px_90px_rgba(0,0,0,0.28)] backdrop-blur lg:p-12">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Recuperacao</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/64">
          Esta etapa ainda nao envia e-mail real, mas a tela ja foi preparada para receber um fluxo de recuperacao mais completo sem quebrar a experiencia do produto.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-white/40">Proxima camada</p>
            <p className="mt-3 text-sm leading-6 text-white/62">Envio de link por e-mail, token temporario e redefinicao segura.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-white/40">Navegacao</p>
            <div className="mt-4 flex gap-3">
              <Link className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium" href="/login">
                Voltar ao login
              </Link>
              <Link className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/78" href="/register">
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
