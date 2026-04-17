# TaskFlow

Plataforma Kanban inspirada na experiência de ferramentas modernas de gestão visual, mas com identidade própria, sem billing, paywall, trial ou qualquer limitação comercial.

## Etapa entregue agora

Esta entrega cobre o início da implementação, exatamente na ordem pedida:

1. Arquitetura base do projeto
2. Modelagem completa do banco com Prisma
3. Estrutura inicial de autenticação com NextAuth
4. Layout global inicial com App Router
5. Seeds, `.env.example`, testes base e preparação para Docker/Vercel

Os CRUDs, drag and drop persistido, visualizações completas, notificações e automações vêm na próxima etapa em cima desta base.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS v4
- Prisma
- PostgreSQL
- NextAuth
- dnd-kit
- React Query
- Vitest
- Playwright

## Estrutura

```text
src/
  app/
    api/
      auth/[...nextauth]/route.ts
    app/page.tsx
    boards/[boardSlug]/page.tsx
    calendar/page.tsx
    timeline/page.tsx
    analytics/page.tsx
    notifications/page.tsx
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    profile/page.tsx
    settings/page.tsx
    workspaces/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    layout/
    ui/
  features/
    auth/
    boards/
    workspaces/
    cards/
    analytics/
    automations/
  lib/
    auth/
    db/
    realtime/
    storage/
    utils.ts
  server/
    api/
    services/
  types/
prisma/
  schema.prisma
  seed.ts
tests/
  unit/
  e2e/
```

## Modelos Prisma criados

- `User`
- `Session`
- `Account`
- `VerificationToken`
- `Workspace`
- `WorkspaceMember`
- `Board`
- `BoardMember`
- `BoardViewPreference`
- `List`
- `Card`
- `CardMember`
- `Label`
- `CardLabel`
- `Checklist`
- `ChecklistItem`
- `Comment`
- `Attachment`
- `ActivityLog`
- `CustomField`
- `CustomFieldValue`
- `Notification`
- `Invitation`
- `AutomationRule`
- `AutomationAction`
- `AutomationTrigger`

## Setup local

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Suba o PostgreSQL com Docker:

```bash
docker compose up -d postgres
```

3. Instale dependências:

```bash
npm install
```

4. Gere o client do Prisma:

```bash
npm run prisma:generate
```

5. Rode a migração:

```bash
npm run prisma:migrate
```

6. Popule o banco com dados demo:

```bash
npm run seed
```

7. Rode o app:

```bash
npm run dev
```

## Usuário demo do seed

- `matheus@example.com`
- `12345678`

## Testes

Unitários:

```bash
npm run test
```

E2E:

```bash
npm run test:e2e
```

## Docker

Subir aplicação e banco:

```bash
docker compose up --build
```

## Checklist implementado nesta etapa

- [x] Projeto migrado para Next.js + TypeScript
- [x] App Router configurado
- [x] Tailwind CSS base configurado
- [x] Prisma configurado
- [x] Schema Prisma completo modelado
- [x] NextAuth base configurado com credentials
- [x] Prisma client centralizado
- [x] Providers globais para Session, Theme e React Query
- [x] Landing page e páginas-base principais
- [x] Seeds iniciais com dados realistas
- [x] `.env.example`
- [x] Dockerfile e `docker-compose.yml`
- [x] Testes básicos com Vitest e Playwright

## Checklist que falta

- [ ] Fluxo completo de cadastro/login/recuperação de senha
- [ ] CRUD de workspaces
- [ ] CRUD de boards
- [ ] CRUD de listas
- [ ] CRUD de cards
- [ ] Drag and drop persistido no banco
- [ ] Modal detalhado do card
- [ ] Busca e filtros completos
- [ ] Views Kanban, lista, calendário, timeline e dashboard
- [ ] Notificações funcionais
- [ ] Automações no-code
- [ ] Realtime
- [ ] Upload real de arquivos
- [ ] Relatórios e analytics completos
- [ ] UI final refinada com shadcn/ui aplicado em toda a interface

## Próxima etapa recomendada

Seguir exatamente a ordem definida:

1. autenticação real
2. layout global do app autenticado
3. CRUD de workspace
4. CRUD de boards
5. CRUD de listas
6. CRUD de cards
7. drag and drop

## Melhorias futuras

- cache e optimistic UI com React Query
- sockets por workspace/board
- parser de menções com autocomplete
- editor rico para descrição
- storage S3/local com adapter
- regras de automação executadas por fila
- auditoria mais detalhada e observabilidade
