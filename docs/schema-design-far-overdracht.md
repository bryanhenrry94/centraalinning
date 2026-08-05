# Diseño de schema — FAR (`FinancialAgreement`) y Overdracht (`CaseTransfer`)

_Propuesta de diseño, no aplicada aún a `prisma/schema.prisma`. Implementa las decisiones #1 y #2 de la sección 6 de `plan-alineacion-cfsb.md`._

## 0. Hallazgo adicional antes de diseñar

Al revisar cómo se crea hoy un `LegalProcess`, encontré que **ya existe una entidad a medio camino de lo que pedimos**: `GopTransferRequest`. Hoy registra el pago de la comisión de transferencia (`PaymentType.GOP_TRANSFER`, `lawyerId`/`bailiffId`, `status PENDING|COMPLETED`), pero **no** el ciclo de aceptación/rechazo — eso vive en `LegalProcess.status` (`PENDING_ACCEPTANCE → IN_PROCEDURE/REJECTED → ... → GOP_ACTIVE`), es decir, `LegalProcess` se crea y vive en estado "no-GOP" desde el momento de la transferencia, no desde el vonnis.

Esto confirma dos problemas reales que el nuevo diseño debe resolver, no solo el de naming:

1. **`LegalProcess.debtClaimId` es `@unique`.** Si un abogado rechaza el expediente, `rejectTransfer` reutiliza la misma fila (limpia `lawyerId`/`bailiffId`, guarda `rejectionReason`) para poder reintentar con otro profesional — **se pierde el historial de rechazos anteriores**, porque cada nuevo intento sobrescribe el anterior.
2. **`Verdict.legal_process_id` es obligatorio.** Es decir, hoy no se puede registrar una sentencia sin que ya exista un `LegalProcess`, cuando el requisito CFSB es el inverso: el `LegalProcess` (GOP) debería nacer *a partir de* que se registra la sentencia.

El rediseño con `CaseTransfer` resuelve ambos de paso, no solo separa nombres.

## 1. `FinancialAgreement` (FAR)

```prisma
enum FinancialAgreementStatus {
  PENDING_PAYMENT   // registrado, esperando el pago del fee de $10
  REGISTERED        // pagado — único estado "estable"; sin recordatorios ni monitoreo
  ESCALATED         // hubo incumplimiento; se abrió un DebtClaim (AOP) a partir de este FAR
  CANCELLED
}

model FinancialAgreement {
  id String @id @default(cuid())

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])

  debtorId String
  debtor   Debtor @relation(fields: [debtorId], references: [id])

  // Un FAR puede originarse desde un contrato ya registrado (contract.service.ts
  // ya lo soporta como fuente de datos), pero es una entidad de servicio propia,
  // no una conversión de Contract.
  contractId String?
  contract   Contract? @relation(fields: [contractId], references: [id])

  reference   String?
  description String? @db.Text

  amount   Decimal @db.Decimal(18, 2)
  currency String  @default("USD")

  status FinancialAgreementStatus @default(PENDING_PAYMENT)

  registrationFeePaymentId String?  @unique   // fee fijo $10, vía Sentoo (PaymentType.FAR_REGISTRATION)
  registrationFeePayment   Payment? @relation(fields: [registrationFeePaymentId], references: [id])

  registeredAt DateTime?   // se setea al confirmarse el pago -> dispara status REGISTERED

  // Escalamiento por incumplimiento: NO es una conversión de tipo, es un puente
  // hacia un DebtClaim (AOP) nuevo, del mismo expediente central (mismo debtorId).
  escalatedToDebtClaimId String?    @unique
  escalatedToDebtClaim   DebtClaim? @relation(fields: [escalatedToDebtClaimId], references: [id])
  escalatedAt            DateTime?
  escalationReason       String?    @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([debtorId])
  @@map("financial_agreement")
}
```

**Cambios en modelos existentes:**
- `Payment` gana la relación inversa `financialAgreementRegistration FinancialAgreement?`.
- `DebtClaim` gana la relación inversa `originatingFinancialAgreement FinancialAgreement?` (a través de `escalatedToDebtClaimId`).
- `Contract` gana `financialAgreements FinancialAgreement[]`.
- `PaymentType` (enum en `payment.validators.ts`, no en Prisma — es un string validado, revisar si conviene moverlo a enum Prisma) gana `FAR_REGISTRATION`, y `payment-processor.ts` gana un `case PaymentType.FAR_REGISTRATION` que marca `FinancialAgreement.status = REGISTERED` y `registeredAt = now()` — mismo patrón que `BlockadeService.processBlokCheckPayment`.

**Documentos y timeline de FAR:** en vez de crear `FinancialAgreementDocument`/`FinancialAgreementTimeline` nuevos, generalizo `ClaimDocument` para que acepte **uno de dos** FKs opcionales (`debtClaimId` o `financialAgreementId`, con un `@@check`/validación a nivel de servicio de que exactamente uno esté presente) y hago lo mismo con un evento de timeline mínimo reusando `ClaimTimelineService` contra el `debtorId` en vez de `debtClaimId` cuando el sujeto es un FAR. Es más barato que duplicar dos tablas nuevas para un servicio que, por diseño, **no tiene seguimiento activo**.

**No incluye:** `ObligationService`/`DebtClaimObligation` — FAR no tiene saldo pendiente ni pagos parciales, es un fee fijo de registro. Si más adelante FAR necesitara cuotas, se reevalúa, pero el doc CFSB es explícito en que FAR "es geen vorderings- of incassodossier".

## 2. `CaseTransfer` (Overdracht)

```prisma
enum CaseTransferStatus {
  PENDING_PAYMENT      // comisión de transferencia (5%) generada, esperando pago
  PENDING_ACCEPTANCE   // pagado, notificado al abogado/alguacil, esperando respuesta (7 días)
  ACCEPTED              // procedimiento en curso (antes llamado IN_PROCEDURE dentro de LegalProcess)
  REJECTED
  WORK_COMPLETED        // solo camino abogado: honorarios facturados + 5% CFSB pagado + trabajo cerrado
  CANCELLED
}

model CaseTransfer {
  id String @id @default(cuid())

  debtClaimId String
  debtClaim   DebtClaim @relation(fields: [debtClaimId], references: [id])
  // A propósito SIN @unique: un mismo DebtClaim puede tener varios intentos
  // de transferencia (rechazos con distintos profesionales) y cada uno queda
  // como fila propia — soluciona la pérdida de historial que tiene hoy
  // rejectTransfer() al reusar la misma fila de LegalProcess.

  lawyerId  String?
  lawyer    Lawyer?  @relation(fields: [lawyerId], references: [id])
  // Se puede completar más adelante aunque el expediente haya iniciado con
  // un abogado: representa "a qué alguacil se le entrega la sentencia para
  // ejecutar" una vez el abogado terminó (sección 6.4 del doc CFSB).
  bailiffId String?
  bailiff   Bailiff? @relation(fields: [bailiffId], references: [id])

  status CaseTransferStatus @default(PENDING_PAYMENT)

  rejectionReason String? @db.Text

  paymentId String?  @unique   // reemplaza a GopTransferRequest.paymentId (fee 5%, GOP_TRANSFER)
  payment   Payment? @relation(fields: [paymentId], references: [id])

  acceptanceDeadline DateTime?   // fecha límite de 7 días para aceptar/rechazar (AT-012, AT-013)
  respondedAt        DateTime?

  workCompletedAt DateTime?   // reemplaza legalProcess.lawyerWorkCompletedAt

  isEmergencyTransfer Boolean @default(false)   // AT-013: noodoverdracht (fallecimiento/incapacidad)
  emergencyReason      String? @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  lawyerFeeInvoices LawyerFeeInvoice[]   // se mueve desde LegalProcess
  agreements        Agreement[]          // regelingen negociadas antes del vonnis (sección 6.4)
  documents         ClaimDocument[]      // vía nuevo FK opcional caseTransferId, ver más abajo

  legalProcess LegalProcess?   // 1:1 opcional — solo existe si este transfer llegó a vonnis

  @@index([debtClaimId])
  @@map("case_transfer")
}
```

**`GopTransferRequest` se retira** (no se mantiene en paralelo) — su única función (pago + estado PENDING/COMPLETED) queda cubierta por `CaseTransfer.paymentId` + `status`.

## 3. `LegalProcess` (GOP) — se adelgaza

```prisma
enum LegalProcessStatus {
  GOP_ACTIVE
  GOP_INACTIVE
  GOP_CANCELLED
  CLOSED
  // PENDING_ACCEPTANCE, REJECTED, IN_PROCEDURE se retiran de aquí — ahora son CaseTransferStatus
}

model LegalProcess {
  id String @id @default(cuid())

  debtClaimId String    @unique
  debtClaim   DebtClaim @relation(fields: [debtClaimId], references: [id])

  caseTransferId String       @unique
  caseTransfer   CaseTransfer @relation(fields: [caseTransferId], references: [id])

  referenceNumber String? @unique

  bailiffId String
  bailiff   Bailiff @relation(fields: [bailiffId], references: [id])
  // Ya no lleva lawyerId — la relación con el abogado quedó en CaseTransfer.

  status LegalProcessStatus @default(GOP_ACTIVE)   // nace directamente en GOP_ACTIVE al registrar el vonnis

  inactiveReason GopInactiveReason?
  inactiveNotes  String?            @db.Text
  reviewDate     DateTime?

  cancelledAt  DateTime?
  cancelReason String?   @db.Text

  startedAt DateTime   // = fecha de registro del vonnis (antes era fecha de transferencia)
  closedAt  DateTime?

  gopCompletedGateAt DateTime?   // se setea cuando BailiffFeeInvoice.status = PAID (reemplaza lawyerWorkCompletedAt)

  verdicts           Verdict[]
  documents          LegalProcessDocument[]   // documentos de ejecución: embargos, notificaciones, actas
  bailiffFeeInvoices BailiffFeeInvoice[]

  @@map("legal_process")
}
```

`Verdict.legal_process_id` deja de ser obligatorio en el flujo de negocio (aunque a nivel de tipo puede seguir siendo `String` no-nulo, porque en el nuevo flujo el `LegalProcess` se crea **en la misma transacción** que el `Verdict`, no antes — ver sección 5).

## 4. `BailiffFeeInvoice` — nuevo (ítem 1.8 del plan)

Copia directa del patrón ya validado de `LawyerFeeInvoice`, pero contra `LegalProcess` en vez de contra la fase de transferencia:

```prisma
model BailiffFeeInvoice {
  id             String       @id @default(cuid())
  legalProcessId String
  legalProcess   LegalProcess @relation(fields: [legalProcessId], references: [id])

  totalAmount   Decimal   @db.Decimal(18, 2)   // monto facturado al debiteur por el alguacil
  invoiceNumber String?
  invoiceDate   DateTime?

  storageKey   String
  originalName String
  mimeType     String
  size         Int

  cfsbFeeAmount Decimal @db.Decimal(18, 2)   // 5% de totalAmount

  paymentId String  @unique
  payment   Payment @relation(fields: [paymentId], references: [id])

  status    String    @default("PENDING_PAYMENT")   // PENDING_PAYMENT | PAID
  createdAt DateTime  @default(now())
  paidAt    DateTime?

  @@map("bailiff_fee_invoice")
}
```

El gate de cierre de GOP (`legal-process.service.ts`, función equivalente a `Werkzaamheden afgerond`) pasa a exigir `BailiffFeeInvoice.status === "PAID"` antes de permitir `status = CLOSED`, igual que hoy `LawyerFeeInvoice` bloquea el cierre del lado del abogado.

## 5. Flujo transaccional nuevo: registrar vonnis crea el `LegalProcess`

Hoy `legal-process.service.ts:224` crea el `LegalProcess` en `finalizeTransfer` (al confirmar el pago de transferencia). Con el nuevo modelo, esa función pasa a crear solo el `CaseTransfer`. El `LegalProcess` se crea recién en la acción "Vonnis registreren":

```
registrarVonnis(caseTransferId, verdictData):
  1. caseTransfer = CaseTransfer.findUnique(caseTransferId), status debe ser ACCEPTED (o WORK_COMPLETED si vino de abogado)
  2. bailiffId = caseTransfer.bailiffId (obligatorio en este punto — si el camino fue solo abogado,
     debe habérsele asignado un bailiffId a CaseTransfer antes de poder registrar vonnis)
  3. dentro de una transacción Prisma:
     a. crear LegalProcess { debtClaimId, caseTransferId, bailiffId, status: GOP_ACTIVE, startedAt: now() }
     b. crear Verdict { ...verdictData, legal_process_id: legalProcess.id }
  4. ClaimTimelineService.logEvent(..., "GOP_ACTIVATED", ...)
  5. NotificationService (GOP_ACTIVATED)
```

Esto reemplaza el `legal-process.service.ts:448`/`:697` actuales (que hoy solo cambian `status` en una fila que ya existía desde la transferencia).

## 6. Plan de migración de datos (`legal_process` existente → `case_transfer` + `legal_process`)

> **Estado (2026-08-03): ya no aplica.** El `db push` del schema nuevo ya se ejecutó contra la base de datos de este entorno (`DATABASE_URL`) mientras `legal_process` tenía 0 filas y no había ninguna fila real en el `legal_process`/`gop_transfer_request` con el shape viejo. Verificado directamente contra la base: `gop_transfer_request` ya no existe como tabla, y `legal_process` ya no tiene las columnas viejas (`lawyerId`, `rejectionReason`, `lawyerWorkCompletedAt`) — solo el shape nuevo. No hay datos legacy que backfillear ni se perdió nada en el proceso. El plan de abajo se conserva como documentación de diseño (por si se necesitara aplicar este mismo cambio contra otra base que sí tenga datos en el shape viejo), pero no hace falta ejecutarlo aquí.

Es una migración de datos real, no solo de schema. Script de backfill, ejecutado una sola vez tras aplicar el nuevo schema (con ambas tablas coexistiendo temporalmente):

1. Por cada fila actual de `legal_process`:
   - Crear una fila `case_transfer` con: `debtClaimId`, `lawyerId`, `bailiffId`, `status` mapeado según la tabla de abajo, `rejectionReason`, `paymentId` (tomado del `gop_transfer_request` asociado a ese `debtClaimId`), `createdAt = legal_process.startedAt`.
   - Copiar `lawyer_fee_invoice.legalProcessId` → `lawyer_fee_invoice.caseTransferId` (nuevo FK) apuntando a la fila `case_transfer` recién creada.
   - Copiar `agreement.legalProcessId` → `agreement.caseTransferId` **solo si** el `Agreement` fue creado antes de que existiera un `Verdict` para ese expediente (regeling pre-vonnis); si es posterior, se deja en `agreement.legalProcessId` apuntando al `LegalProcess` real.
2. Si la fila original de `legal_process` **ya tenía un `Verdict` asociado** (es decir, ya llegó a `GOP_ACTIVE`/`GOP_INACTIVE`/`CLOSED`/`GOP_CANCELLED`): se conserva como fila `legal_process` real, actualizando su `caseTransferId` para apuntar a la nueva fila `case_transfer` creada en el paso 1, y su `status` se queda igual (ya usa el subconjunto de estados válido).
3. Si la fila original estaba en `PENDING_ACCEPTANCE`/`REJECTED`/`IN_PROCEDURE` (nunca llegó a vonnis): **se elimina la fila `legal_process`** (toda su información ya vive en el `case_transfer` creado en el paso 1).
4. Mapeo de estados `LegalProcessStatus` (viejo) → `CaseTransferStatus` (nuevo, para las filas sin vonnis):
   - `PENDING_ACCEPTANCE` → `PENDING_ACCEPTANCE`
   - `REJECTED` → `REJECTED`
   - `IN_PROCEDURE` → `ACCEPTED`
5. Verificación post-migración: contar que `case_transfer` + `legal_process` (nuevo) tenga exactamente el mismo número de `Verdict.legal_process_id` válidos que antes, y que ningún `LawyerFeeInvoice`/`Agreement` haya quedado huérfano.

## 7. Resumen de todo lo nuevo/movido en esta pieza del plan

| Elemento | Acción |
|---|---|
| `FinancialAgreement` (+ `FinancialAgreementStatus`) | Nuevo |
| `CaseTransfer` (+ `CaseTransferStatus`) | Nuevo |
| `BailiffFeeInvoice` | Nuevo (ítem 1.8, aprovechando que ya se está tocando `LegalProcess`) |
| `GopTransferRequest` | Se retira, reemplazado por `CaseTransfer` |
| `LegalProcess` | Se adelgaza: pierde `lawyerId`, `rejectionReason`, `lawyerWorkCompletedAt`; gana `caseTransferId`, `gopCompletedGateAt` |
| `LegalProcessStatus` | Pierde `PENDING_ACCEPTANCE`/`REJECTED`/`IN_PROCEDURE` |
| `LawyerFeeInvoice` | FK cambia de `legalProcessId` a `caseTransferId` |
| `Agreement` | Gana FK opcional `caseTransferId` (además del `legalProcessId` existente) |
| `ClaimDocument` | Gana FK opcional `financialAgreementId` y `caseTransferId` (mutuamente excluyentes con `debtClaimId`) |
| `Verdict` | Su creación pasa a disparar la creación de `LegalProcess`, no al revés |
| `PaymentType` | Gana `FAR_REGISTRATION` |

## 8. Qué falta antes de poder aplicar esto (`npx prisma db push` / migration)

- ~~Confirmar si el proyecto usa migraciones versionadas (`prisma migrate`) o `db push` directo~~ — **resuelto (2026-08-03):** el proyecto usa `db push` directo (confirmado en `CLAUDE.md` y en `prisma.config.ts`, que no tiene migraciones aplicadas), y ya se ejecutó contra la base de este entorno. Ver nota de estado en la sección 6.
- Decidir si `ClaimDocument` con múltiples FKs opcionales se valida con una constraint a nivel de base de datos (Postgres/MySQL `CHECK`, si el motor lo soporta) o solo a nivel de servicio (Zod/`ClaimDocumentService`) — dado que el proyecto usa MySQL/MariaDB (`DATABASE_URL`), los `CHECK` constraints tienen soporte limitado según versión; probablemente conviene validación a nivel de servicio.
- Confirmar con el equipo si esto se aplica en un solo PR grande (schema + backfill + refactor de `legal-process.service.ts` juntos) o se divide en sub-fases (p. ej. primero `CaseTransfer`/`FinancialAgreement` como tablas nuevas y vacías, luego el refactor de servicios, luego el backfill) — dado el tamaño, recomiendo dividir para poder desplegar y probar cada parte por separado.
