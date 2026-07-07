# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Run prisma generate + next build
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Database
npx prisma generate        # Regenerate Prisma client after schema changes
npx prisma db push         # Push schema changes to DB without migrations
npx prisma studio          # Open Prisma Studio GUI
npx tsx ./prisma/seed.ts   # Seed the database
```

There are no automated tests in this codebase.

## Architecture Overview

This is a **Next.js 15 multi-tenant debt collection SaaS** (App Router, React 19, TypeScript). The domain is called "Centraal Inning" and targets the Dutch-Caribbean market (Curaçao/Bonaire — Dutch terminology throughout).

### Multi-tenant subdomain routing

Each tenant gets its own subdomain (e.g., `dazzsoft-sas.cio.test`). Authentication lives on `auth.cio.test`. The middleware (`middleware.ts`) handles:

- Unauthenticated users → redirect to `auth.<ROOT_DOMAIN>/login`
- Authenticated user on auth domain → redirect to `<subdomain>.<ROOT_DOMAIN>/dashboard`
- Wrong subdomain → redirect to tenant's correct subdomain

The auth cookie is shared across subdomains using `COOKIE_DOMAIN`. The JWT token carries `subdomain`, `tenant_id`, `roles`, and `memberships`.

### Route groups

- `app/(auth)/` — public pages: login, signup, forgot-password, reset-password, invitation
- `app/(dashboard)/` — tenant-scoped app: all business features behind auth
- `app/(admin)/` — platform admin (settings/parameters)
- `app/(public)/` — unauthenticated pages: payment return, test pages
- `app/api/` — API routes (NextAuth, Sentoo webhook, jobs, file upload, etc.)

### Data layer

- **ORM**: Prisma with MySQL/MariaDB (`lib/prisma.ts` singleton)
- **Schema**: `prisma/schema.prisma` — core models: `Tenant`, `User`, `Membership`, `CollectionCase`, `Debtor`, `Verdict`, `Agreement`, `Contract`, `Blockade`, `Payment`, `BillingInvoice`
- **Server Actions**: `actions/` — all data mutations go through Next.js Server Actions (`"use server"`)
- **Services**: `services/` — business logic layer called by actions; each domain has its own folder (`collection/`, `contract/`, `payments/`, etc.)

### Business domain

The collection workflow follows Dutch legal stages tracked by `CollectionCaseStatus`:

1. `AANMANING` (payment reminder)
2. `SOMMATIE` (formal demand)
3. `INGEBREKESTELLING` (notice of default)
4. `BLOKKADE` (credit block / registry filing)

Automated workflow progression runs via `lib/jobs/process_collection_case_workflow.ts`, triggered by `app/api/jobs/` routes.

### Membership / payment gating

`utils/permission.ts` → `canUseFeature(membership, action)` gates features. Actions are defined in `constants/AppAction.ts`. Tenants with `PAST_DUE` memberships lose access to `CREATE_COLLECTION` and `BLOK_CHECK`. Payment processing uses **Sentoo** (Caribbean payment gateway via `lib/sentoo.ts` / `services/providers/sentoo.service.ts`).

### Key libraries

| Purpose        | Library                                             |
| -------------- | --------------------------------------------------- |
| UI components  | MUI v7 (`@mui/material`, `@mui/x-data-grid`)        |
| Styling        | Tailwind CSS v4                                     |
| Forms          | `react-hook-form` + Zod validation                  |
| Auth           | `next-auth` v4 (Credentials provider, JWT strategy) |
| Email          | Resend + `@react-email/components`                  |
| PDF generation | `@react-pdf/renderer`                               |
| File storage   | AWS S3 / Cloudflare R2 (`lib/r2-client.ts`)         |
| Charts         | ApexCharts (`react-apexcharts`)                     |
| Real-time chat | Socket.IO client (`lib/socketClient.ts`)            |

### Validations

Zod schemas live in `lib/validations/` and mirror Prisma models. Server actions import from here; the same schemas are reused on the client via `react-hook-form` + `@hookform/resolvers/zod`.

### PDF documents

Dutch collection documents are generated as React components in `components/pdf/`: `AanmaningPDF`, `SommatiePDF`, `IngebrekestellingPDF`, `BlokkadePDF`, `FinancialSummaryPDF`. Test pages are in `app/(public)/test/pdf/`.

### Environment variables

See `.env.example`. Key variables:

- `DATABASE_URL` / `DIRECT_URL` — MySQL connection strings
- `NEXTAUTH_SECRET` / `COOKIE_DOMAIN` — session security
- `NEXT_PUBLIC_ROOT_DOMAIN` — base domain for subdomain routing
- `ADMIN_TENANT_ID` — platform owner tenant
- `RESEND_API_KEY` — transactional email
- `SENTOO_API` / `SENTOO_SECRET` — payment gateway
- AWS/R2 credentials for file storage

# Arquitectura

- Organizar el proyecto por módulos.
- No crear carpetas globales si pertenecen a un módulo.
- Toda la lógica de negocio debe permanecer dentro del módulo.
- shared contiene únicamente código reutilizable entre módulos.
- infrastructure contiene integraciones externas.
- app solo contiene rutas y layouts.
- Nunca acceder a Prisma desde componentes React.
- Toda consulta debe pasar por Service.
- Toda regla de negocio debe pasar por Service.
- Los Server Actions únicamente orquestan Services.
- No duplicar tipos.
- No duplicar validaciones.
- Un módulo nunca importa componentes internos de otro módulo.

### Local dev setup

Add entries to `/etc/hosts`:

```
127.0.0.1 cio.test
127.0.0.1 auth.cio.test
127.0.0.1 <your-tenant-subdomain>.cio.test
```

`next.config.ts` allows `*.cio.test` as dev origins.
