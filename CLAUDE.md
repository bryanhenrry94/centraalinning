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

This is a **Next.js 15 multi-tenant debt collection SaaS** (App Router, React 19, TypeScript) and targets the Dutch-Caribbean market (Curaçao/Bonaire — Dutch terminology throughout). The platform's brand — used everywhere in the UI, PDFs, emails and other communications — is **CFSB**. "Centraal Inning" (CI) is retired as a brand name; it survives only as part of the legal entity name **Centraal Inning Onderneming B.V.** (`Tenant.legal_name` for the admin tenant) and in the repo/package name for historical reasons. Never introduce new "Centraal Inning" or "CI" branding in code — use "CFSB".

### Multi-tenant subdomain routing

Each tenant gets its own subdomain (e.g., `dazzsoft-sas.cio.test`). Authentication lives on `auth.cio.test`. The middleware (`middleware.ts`) handles:

- Unauthenticated users → redirect to `auth.<ROOT_DOMAIN>/login`
- Authenticated user on auth domain → redirect to `<subdomain>.<ROOT_DOMAIN>/dashboard`
- Wrong subdomain → redirect to tenant's correct subdomain
- Users whose only role is `DEBTOR` are further restricted to a fixed set of path prefixes (`/dashboard`, `/payments`, `/agreements`, `/financial-report`, `/block-status`, `/settings`, `/logout`) — this list must stay in sync with the "verplichtingen" menu group in `shared/ui/layout/menus.tsx`

The auth cookie is shared across subdomains using `COOKIE_DOMAIN`. The JWT token carries `subdomain`, `tenant_id`, `roles`, and `memberships`.

### Route groups

- `app/(auth)/` — public pages: login, signup, forgot-password, reset-password, invitation
- `app/(dashboard)/` — tenant-scoped app: all business features behind auth
- `app/(admin)/` — platform admin (settings/parameters)
- `app/(public)/` — unauthenticated pages: payment return, test pages
- `app/api/` — API routes (NextAuth, Sentoo webhook, cron jobs, file upload, etc.)

### Modular architecture

The codebase is organized by business module, not by technical layer. This is a hard constraint, not just a convention:

- Organize the project by modules — one folder per business capability under `modules/`.
- Never create global/top-level folders for code that belongs to a single module.
- All business logic stays inside its module.
- `shared/` holds only code reused across modules (`ui/`, `hooks/`, `utils/`, `constants/`, `theme/`, `providers/`).
- `infrastructure/` holds external integrations only (`mail/`, `storage/`, `sentoo/`, `pdf/`, `realtime/`).
- `app/` contains only routes and layouts — no business logic.
- React components never touch Prisma directly.
- Every query goes through a Service; every business rule goes through a Service.
- Server Actions only orchestrate Services — they don't contain business logic themselves.
- Don't duplicate types or validations across modules.
- A module never imports another module's internal components — cross-module reuse goes through `shared/`.

Each module under `modules/` (e.g. `modules/collection/`, `modules/contract/`) follows the same internal shape:

- `actions/` — `"use server"` Server Actions, the only thing pages/components call
- `services/` — business logic + Zod validators (`*.validators.ts`); this is the only layer that touches `lib/prisma.ts`
- `components/` — module-scoped React components
- `types/` — module-scoped types
- `constants/`, `utils/` — module-scoped constants/helpers
- `templates/` — PDF (`@react-pdf/renderer`, under `templates/pdfs/`) and email (`@react-email/components`) templates for that module

Current modules: `agreement`, `auth`, `bailiff`, `blockade`, `block-check`, `case-file`, `chat`, `collection`, `collective-follow-up`, `contract`, `dashboard`, `employee`, `financial-agreement`, `jurisdiction`, `lawyer`, `legal-process`, `notification`, `payment`, `settings`, `support`, `tenant`, `verdict`.

A few things remain outside `modules/` as known, temporary migration debt: `actions/email.tsx` and `actions/sentoo.actions.ts` at the repo root still mix multiple domains and haven't been distributed into their owning modules yet.

### Data layer

- **ORM**: Prisma with MySQL/MariaDB (`lib/prisma.ts` singleton, `@prisma/adapter-mariadb`)
- **Schema**: `prisma/schema.prisma` (68 models) — key models: `Tenant`, `User`, `Membership`, `Person`, `Debtor`, `DebtClaim`, `FinancialAgreement`, `AdministrativeCollection`, `Blockade`, `BlockCheck`, `CollectiveCollection`, `CaseTransfer`, `LegalProcess`, `Verdict`, `Agreement`, `Contract`, `Payment`, `BillingInvoice`, `Plan`/`Subscription`
- `Person` is the durable cross-tenant identity record; `Debtor` is only the per-tenant/per-case link to a `Person` — don't treat `Debtor` as the identity record
- Server Actions orchestrate; Services (`modules/*/services/`) are the only layer allowed to import `lib/prisma.ts`

### Business domain

The collection domain models a chain of independent services around a `DebtClaim` (a claim registered against a `Debtor`), identified by their Dutch acronyms:

1. **FAR** (`FinancialAgreement`) — a lightweight, preventive payment agreement registered from a contract; not itself a claim. On breach it escalates to a new `DebtClaim` via `FinancialAgreement.escalatedToDebtClaimId`.
2. **AOP** (administrative collection, `AdministrativeCollection`/`AdministrativeCollectionStep`, step enum `AOPStep`) — the automated reminder chain: `REMINDER` → `FINAL_NOTICE` → `DEFAULT_NOTICE` → `BLK_NOTIFICATION`. These map to the Dutch legal terms still used in UI text, PDFs and emails: **AANMANING** (payment reminder), **SOMMATIE** (formal demand), **INGEBREKESTELLING** (notice of default), **BLOKKADE** (credit block notice).
3. **BLC** (`BlockCheck`, module `block-check`) — a paid, standalone credit-block lookup.
4. **BLK** (`Blockade`, module `blockade`) — the actual credit-registry block, with automatic reactivation handling.
5. **COP** (`CollectiveCollection`, module `collective-follow-up`) — collective/employer-based follow-up collection.
6. **GOP** (`LegalProcess`, module `legal-process`) — the judicial track: case transfer to a lawyer/bailiff (`CaseTransfer`, `PENDING_ACCEPTANCE → ACCEPTED/REJECTED`), verdict registration (`Verdict`), embargo, and execution via a bailiff.

Automated workflow progression runs via `lib/jobs/process_aop_workflow.ts` (advances AOP steps), plus `check_gop_deadlines.ts`, `check_blockade_reactivation.ts`, `check_case_transfer_deadlines.ts`, and `check_cop_employer_matches.ts`. Each is exposed as its own route under `app/api/jobs/*` and also run together via `app/api/jobs/run-all`, both authenticated with a `?token=` query param checked against `CRON_SECRET_TOKEN` (meant to be hit by an external cron scheduler).

`docs/` contains living design/analysis notes (`analisis-sistema-centraal-inning.md`, `plan-alineacion-cfsb.md`, `schema-design-far-overdracht.md`, `estado-funcionalidades-*.md`) tracking the migration from the legacy "Centraal Inning" collection-case model to the current CFSB service model — check there for the reasoning behind non-obvious schema/domain decisions before assuming something is accidental.

### Membership / payment gating

`shared/utils/permission.ts` → `canUseFeature(membership, action)` gates features. Actions are defined in `shared/constants/AppAction.ts`. Tenants with `PAST_DUE` memberships lose access to `CREATE_COLLECTION` and `BLOK_CHECK`.

Payment processing uses **Sentoo** (Caribbean payment gateway; client/service in `infrastructure/sentoo/`, dispatch logic in `modules/payment/services/payment-processor.ts`). Sentoo is only used for CFSB's own fees (subscriptions, registration, AOP/BLK/GOP/BLOK_CHECK fees, contract activation) — the underlying debt payment between debtor and tenant is never routed through Sentoo; it's recorded directly by the tenant.

### Key libraries

| Purpose        | Library                                             |
| -------------- | --------------------------------------------------- |
| UI components  | MUI v7 (`@mui/material`, `@mui/x-data-grid`)        |
| Styling        | Tailwind CSS v4                                     |
| Forms          | `react-hook-form` + Zod validation                  |
| Auth           | `next-auth` v4 (Credentials provider, JWT strategy) |
| Email          | Resend + `@react-email/components`                  |
| PDF generation | `@react-pdf/renderer`                               |
| File storage   | Cloudflare R2 (`infrastructure/storage/r2-client.ts`, S3-compatible SDK) |
| Charts         | ApexCharts (`react-apexcharts`)                     |
| Real-time chat | Socket.IO client (`infrastructure/realtime/socket-client.ts`) |

### Validations

Zod schemas live next to the service that owns them, as `modules/*/services/*.validators.ts` — there is no shared `lib/validations/` directory. Server actions import validators from their own module's services; the same schemas are reused on the client via `react-hook-form` + `@hookform/resolvers/zod`. Don't create cross-module validation files — extend or reuse the owning module's validators instead.

### PDF documents

Dutch legal documents are React components under each owning module's `templates/pdfs/`, e.g. `modules/collection/templates/pdfs/{AanmaningPDF,SommatiePDF,IngebrekestellingPDF}.tsx`, `modules/blockade/templates/pdfs/BlokkadePDF.tsx`, `modules/verdict/templates/pdfs/Verdict{Company,Approval,Creditor,Debtor}PDF.tsx`, `modules/payment/templates/pdfs/{InvoicePDF,FinancialSummaryPDF}.tsx`. Test pages are in `app/(public)/test/pdf/`.

### Environment variables

See `.env.example`. Key variables:

- `DATABASE_URL` / `DIRECT_URL` — MySQL connection strings
- `NEXTAUTH_SECRET` / `COOKIE_DOMAIN` — session security
- `NEXT_PUBLIC_ROOT_DOMAIN` — base domain for subdomain routing (middleware and mail links read the domain from here — never hardcode it)
- `ADMIN_TENANT_ID` — platform owner tenant
- `RESEND_API_KEY` / `EMAIL_FROM` / `EMAIL_SENDER_NAME` — transactional email
- `SENTOO_API` / `SENTOO_SECRET` / `SENTOO_MERCHANT` — payment gateway
- `R2_ACCOUNT_ID` / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — Cloudflare R2 file storage
- `CRON_SECRET_TOKEN` — required `?token=` query param for the `app/api/jobs/*` routes

### Local dev setup

Add entries to `/etc/hosts`:

```
127.0.0.1 cio.test
127.0.0.1 auth.cio.test
127.0.0.1 <your-tenant-subdomain>.cio.test
```

`next.config.ts` allows `*.cio.test` as dev origins.
