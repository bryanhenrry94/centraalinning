# Análisis funcional — Centraal Inning

_Generado: 2026-08-03. Basado en estructura de código (`modules/`, `prisma/schema.prisma`, `app/`), no en pruebas de ejecución._

## 1. Qué es el sistema

SaaS multi-tenant de cobranza de deudas (Curazao/Bonaire, terminología legal holandesa), con:

- Enrutamiento por subdominio por tenant + dominio `auth` compartido.
- Gating de funciones por estado de membresía (`PAST_DUE` bloquea `CREATE_COLLECTION`, `BLOK_CHECK`).
- Pasarela de pago Sentoo (Caribe) para cobros de deudores y suscripción de la plataforma.
- Generación de documentos legales en PDF (`@react-pdf/renderer`) y envío de correos (Resend).

## 2. Ciclo de vida del proceso de cobranza (negocio)

El dominio modela dos procesos encadenados, con siglas propias del negocio:

```
FAR (registro del reclamo) 
  → AOP (cobro administrativo: REMINDER → FINAL_NOTICE → DEFAULT_NOTICE → BLK_NOTIFICATION)
  → BLC (block-check / verificación crediticia)
  → BLK (Blokkade: bloqueo/registro en central de crédito, con reactivación automática)
  → COP (cobro colectivo, si aplica)
  → GOP (proceso judicial: PENDING_ACCEPTANCE → IN_PROCEDURE → GOP_ACTIVE/INACTIVE → CLOSED,
         con transferencia a abogado, sentencia (Verdict), embargo y ejecución vía alguacil)
```

Nota: el `CollectionCaseStatus` documentado en CLAUDE.md (AANMANING/SOMMATIE/INGEBREKESTELLING/BLOKKADE) es
**terminología heredada**. El modelo Prisma `CollectionCase` ya no existe — fue reemplazado por `DebtClaim` +
`AdministrativeCollection`/`AdministrativeCollectionStep` (mismas 4 etapas, nombradas en inglés). Verificado:
las 19 referencias vivas a este dominio usan `prisma.debtClaim`; las 5 referencias que aún dicen "CollectionCase"
son solo nombres de archivo/función que internamente ya operan sobre `DebtClaim` (ver sección 5).

## 3. Módulos (`modules/`, 18 total)

| Módulo | Función | Entidades / enums clave |
|---|---|---|
| `auth` | Login, signup, invitaciones, reset de contraseña, roles y membresías | `User`, `Membership`, `MembershipRole`, `TenantInvitation` |
| `tenant` | Gestión del tenant (cliente de la plataforma), cuentas bancarias | `Tenant`, `BankAccount` |
| `collection` | Casos de cobranza, deudores, personas, multas por mora, línea de tiempo, notificaciones de cobranza | `Debtor`, `Person`, `DebtClaim`, `ClaimTimeline`, `ClaimCharge` |
| `block-check` | Verificación de bloqueo/consulta crediticia previa (BLC) | `BlockCheck` |
| `blockade` | Registro y gestión del bloqueo (BLK), reactivación automática | `Blockade`, `BlockadeDocument` |
| `legal-process` | Proceso judicial (GOP): transferencia a abogado, aceptación/rechazo, seguimiento, cierre | `LegalProcess`, `GopTransferRequest`, `LegalProcessDocument` |
| `lawyer` | Gestión de abogados y facturación de honorarios | `Lawyer`, `LawyerFeeInvoice` |
| `bailiff` | Gestión de alguaciles (deurwaarders) | `Bailiff` |
| `verdict` | Sentencias judiciales: intereses, embargos, servicios de alguacil, adjuntos | `Verdict`, `VerdictEmbargo`, `VerdictInterest`, `VerdictAttachment` |
| `agreement` | Acuerdos de pago con el deudor, negociación/contraoferta, cuotas | `Agreement`, `AgreementInstallment` |
| `contract` | Contratos cliente–deudor, partes, documentos | `Contract`, `ContractParty`, `ContractDocument` |
| `payment` | Pagos, facturación, verificación de transferencias, reportes financieros, suscripción SaaS | `Payment`, `BillingInvoice`, `Subscription`, `Plan`, `FinancialReportRequest` |
| `employee` | Gestión de empleados del tenant, importación masiva | `Employee` |
| `notification` | Notificaciones multicanal (email, SMS, WhatsApp, carta) | `Notification`, `NotificationChannel` |
| `chat` | Chat en tiempo real (Socket.IO) | `ChatRoom`, `ChatMessage` |
| `dashboard` | Panel general y vista operativa ("workstation") | — |
| `settings` | Parámetros de plataforma, tipos de interés, planes | `Parameter`, `InterestType`, `Plan`, `SettingCategory` |
| `block-check`/`blockade` | (ver arriba) | |

Cada módulo sigue el patrón `actions/` (orquestación) → `services/` (lógica + validadores Zod) → `components/` (UI),
con `templates/` para PDF/HTML donde aplica. Esto es consistente con la arquitectura declarada en CLAUDE.md.

## 4. Automatización

3 jobs en `lib/jobs/`, expuestos vía `app/api/jobs/*` (para cron externo):

- `process_collection_case_workflow` — avanza automáticamente los casos por las etapas de cobranza.
- `check_gop_deadlines` — vencimientos del proceso judicial (prescripción, revisión).
- `check_blockade_reactivation` — reactivación de bloqueos suspendidos.

## 5. Observaciones para evaluar el rumbo

**A favor:**
- El flujo legal completo (FAR→AOP→BLC→BLK→COP/GOP→Verdict→ejecución) está modelado de punta a punta, no solo el primer tramo.
- Capa SaaS propia (planes, suscripciones, facturación de la plataforma) además del cobro al deudor final — es decir, monetización de la plataforma ya está construida.
- Separación modular ya ejecutada (`modules/`, `shared/`, `infrastructure/`) según memoria del proyecto.

**Riesgos / deuda técnica a resolver (antes de seguir sumando features):**
- **Nomenclatura desactualizada, no duplicación real**: se confirmó que `DebtClaim` es el único modelo vigente (`CollectionCase` no existe en `schema.prisma`). Quedan 5 restos de naming que deberían limpiarse para evitar confusión futura:
  - `modules/collection/constants/collection-case-status.ts` — enum `CollectionCaseStatus` sin ningún uso en el resto del código. Candidato a borrar.
  - `modules/collection/actions/collection-case.actions.ts`, `lib/jobs/process_collection_case_workflow.ts` y sus rutas (`app/api/jobs/process-collection-case-workflow`, `run-all`) — funcionan sobre `DebtClaim`/`AdministrativeCollection` pero conservan el nombre antiguo. Candidatos a renombrar.
  - `modules/payment/services/payment.service.ts:150-157` — bloque comentado que referencia `prisma.accountsReceivable` y `prisma.collectionCaseAgreement`, modelos que ya no existen. Código muerto, se puede eliminar.
- **`actions/email.tsx` y `actions/sentoo.actions.ts`** siguen fuera de `modules/` (mezclan dominios) — pendiente de fase 2 de la migración.
- **`lib/validations/`** duplica validadores que ya existen en `modules/*/services/*.validators.ts`.
- **`app/(admin)/settings/parameters_vs2/`** parece una segunda versión de la pantalla de parámetros — revisar si una debe eliminarse.
- **Sin pruebas automatizadas** (confirmado en CLAUDE.md) — riesgo alto dado que el core es un flujo legal con plazos y estados.

## 6. Cómo usar esto para comparar con ChatGPT

Se generó también `docs/matriz-funcionalidades.csv` con una fila por funcionalidad (módulo, funcionalidad, estado estructural, notas).
Pega ese CSV o esta tabla en tu conversación de ChatGPT junto con la lista de funcionalidades que tienen definida ahí,
y pide un diff: qué está en su lista y no aparece aquí (gap real), y qué está aquí pero no en la suya (posible scope creep o feature no priorizada).
