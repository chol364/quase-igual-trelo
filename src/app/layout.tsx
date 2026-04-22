import type { Metadata } from 'next'
import { Manrope, Sora } from 'next/font/google'
import { AppProviders } from '@/components/layout/providers'
import './globals.css'

const bodyFont = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

const displayFont = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Alquimia Tarefas',
  description: 'Plataforma Kanban profissional, gratuita e com identidade propria.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className={bodyFont.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
