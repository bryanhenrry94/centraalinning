# Estado actual de funcionalidades — 2026-08-04

_Generado para doble verificación cruzada con el análisis externo (ChatGPT). Organizado según la
misma estructura de servicios que `docs/plan-alineacion-cfsb.md` (FAR/AOP/BLC/BLK/Overdracht-GOP/COP),
no según los módulos de carpeta. Cada fila está verificada contra el código real de este repo en la
fecha de arriba — no es una copia del plan, es una relectura actualizada tras el trabajo hecho hoy sobre
`CaseTransfer`._

**Cómo usarlo:** pega esta tabla (o el CSV `docs/matriz-funcionalidades.csv`, que cubre el inventario
por módulo de carpeta en vez de por servicio CFSB) en tu conversación de ChatGPT junto con la lista de
funcionalidades que tengas ahí, y pedí un diff en dos sentidos: qué aparece en su lista y no acá (gap
real pendiente), y qué aparece acá y no en la suya (posible funcionalidad no capturada en ese análisis).

Leyenda: ✅ Implementado y en uso · 🟡 Parcial (existe pero incompleto) · 🔴 No existe.

---

## 1. Plataforma / infraestructura transversal

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Multi-tenant por subdominio (`*.cio.test`) | ✅ | `middleware.ts`, `NEXT_PUBLIC_ROOT_DOMAIN` |
| Auth compartido en subdominio `auth.*` (NextAuth JWT) | ✅ | `modules/auth`, `lib/auth.ts` |
| Roles y membresías por tenant | ✅ | `Membership`, `MembershipRole`, `UserRole` |
| Gating de features por estado de membresía (`PAST_DUE`) | ✅ | `shared/utils/permission.ts` → `canUseFeature` |
| Pasarela de pago Sentoo + webhook | ✅ | `lib/sentoo.ts`, `app/api/sentoo/webhook/route.ts`, `payment-processor.ts` |
| PDF legales (Aanmaning/Sommatie/Ingebrekestelling/Blokkade/FinancialSummary) | ✅ | `components/pdf/*`, `modules/*/templates/pdfs/*` |
| Email transaccional (Resend) | ✅ | `@react-email/components` |
| Chat en tiempo real (Socket.IO) | ✅ pero fuera del flujo core | `modules/chat` — aislado, sin gate a quitar del nav aún |
| Pruebas automatizadas | 🔴 | Confirmado en `CLAUDE.md`: "no hay tests automatizados" |
| Branding CFSB (reemplazo de "Centraal Inning"/"CI") | 🔴 | 35 archivos `.tsx` todavía mencionan "Centraal Inning"/"CI" |
| Texto "tenant" visible al usuario (debería decir "deelnemer/participante") | 🟡 | Literal en `modules/auth/components/user-table.tsx:110` y otros |
| Naming heredado `CollectionCase*` sin uso real | 🟡 | `modules/collection/constants/collection-case-status.ts` (0 usos fuera del propio archivo); `process_collection_case_workflow.ts` y sus rutas siguen con el nombre viejo pero ya operan sobre `DebtClaim` |
| Residuos de UI duplicada (`page_old.tsx`, `parameters_vs2/`) | 🟡 | `app/(admin)/settings/parameters/page_old.tsx` y `app/(admin)/settings/parameters_vs2/page.tsx` siguen presentes junto al flujo vigente |

## 2. FAR — Financiële Afspraken Registreren

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Modelo `FinancialAgreement` en schema (fee $10, sin seguimiento activo) | 🟡 solo schema | `prisma/schema.prisma` — modelo definido, `prisma.financialAgreement` con **0 referencias** en todo `modules/`/`app/` |
| Módulo `modules/financial-agreement/` (actions/services/components) | 🔴 | No existe el directorio |
| Escalamiento FAR → AOP (`escalatedToDebtClaimId`) | 🔴 | Campo existe en schema, ninguna lógica lo setea |
| `PaymentType.FAR_REGISTRATION` | 🔴 | No existe en `payment.validators.ts` |

**Resumen:** exactamente como lo dejó el plan del 03-08 — el schema está listo, cero código de negocio. No hubo trabajo sobre FAR en esta sesión.

## 3. AOP — Administratieve Opvolging (cobro administrativo)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Etapas REMINDER → FINAL_NOTICE → DEFAULT_NOTICE → BLK_NOTIFICATION | ✅ | `AdministrativeCollection`/`AdministrativeCollectionStep` |
| Avance automático por job programado | ✅ | `lib/jobs/process_collection_case_workflow.ts` |
| Multas por mora (`DebtFineService`) | ✅ | `modules/collection/services/debt-fine.service.ts` |
| Timeline de auditoría del expediente | ✅ | `ClaimTimeline` / `ClaimTimelineService` |
| Cadena FAR→AOP→BLC→BLK sin acoplamiento obligatorio | 🟡 | AOP y BLK ya son tablas separadas; falta la ruta "BLK directo" (ver sección 5) y que FAR exista para poder desacoplarse de él |

## 4. BLC — Block Check (verificación previa)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Consulta de bloqueo previa, cobrada por check | ✅ | `modules/block-check/services/block-check.service.ts` |
| Respuesta limitada a `blockadeFound: boolean` (sin exponer el expediente) | ✅ | Verificado en el servicio |
| Auditoría (`checkedBy`/`checkedAt`) | ✅ | Modelo `BlockCheck` |
| Precio configurado en `$35` (pedido CFSB) | 🟡 dato pendiente | `Parameter.blok_check_pricing` sigue en `30` (`prisma/schema.prisma:1051`) — es cambio de dato, no de código |

## 5. BLK — Blokkade (bloqueo / registro en central de crédito)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Registro de bloqueo desde AOP fallido | ✅ | `BlockadeService`, `modules/blockade` |
| Registro de bloqueo desde vonnis GOP (sentencia registrada) | ✅ | `legal-process.service.ts` → `registerFirstVerdict` crea `Blockade` si no existe |
| Reactivación automática de bloqueos suspendidos | ✅ | `lib/jobs/check_blockade_reactivation.ts` |
| Documentos de bloqueo | ✅ | `BlockadeDocument` |
| Ruta "BLK directo" (trayecto externo ya completado, sin pasar por AOP) | 🔴 | No hay ninguna action/servicio que cree un `Blockade` fuera de los dos caminos de arriba |
| Múltiples razones de bloqueo simultáneas | 🔴 | `enum BlockadeReason { UNPAID_PAYMENT }` — un solo valor, sin ampliar |

## 6. Overdracht — `CaseTransfer` (transferencia a abogado/alguacil)

**Esta es la sección que más cambió respecto al plan del 03-08.** El ítem 1.6 (antes 🔴 alto esfuerzo) y
el 1.8 (factura CFSB del alguacil, antes 🔴) quedaron completos en esta sesión.

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Modelo `CaseTransfer` separado de `LegalProcess`, sin `@unique` en `debtClaimId` (conserva historial de rechazos) | ✅ | `prisma/schema.prisma` |
| `GopTransferRequest` retirado (reemplazado por `CaseTransfer.paymentId`) | ✅ | Tabla ya no existe en el schema ni en la base (verificado contra la DB real) |
| Solicitud de transferencia + cobro de comisión 5% (Sentoo) | ✅ | `CaseTransferService.requestTransfer` |
| Confirmación de pago → `PENDING_ACCEPTANCE` + plazo de 7 días | ✅ | `CaseTransferService.confirmTransferPayment` |
| Aceptación / rechazo por el abogado o alguacil asignado | ✅ | `acceptTransfer` / `rejectTransfer` |
| **Vencimiento automático del plazo de 7 días (AT-012/013)** | ✅ *(agregado hoy)* | `CaseTransferService.expireOverdueTransfers` + job `lib/jobs/check_case_transfer_deadlines.ts`, colgado de `app/api/jobs/run-all` |
| Cancelación por el participante (solo antes del vonnis) | ✅ | `CaseTransferService.cancelTransfer` |
| **Transferencia de urgencia / noodoverdracht (AT-013)** | ✅ *(agregado hoy)* | `isEmergencyTransfer`/`emergencyReason` ahora expuestos en `TransferToLawyerSchema`, en el diálogo de transferencia y en la ficha del expediente |
| Finalización del trabajo del abogado: factura + comisión CFSB 5% | ✅ | `CaseTransferService.submitLawyerFeeInvoice` / `processLawyerFeePaymentConfirmed` |
| Transferencia de la sentencia del abogado al alguacil (requiere trabajo finalizado + documento "Vonnis" adjunto) | ✅ | `CaseTransferService.assignBailiffForExecution` |
| Documentos de la fase de transferencia (`CaseTransferDocument`) | ✅ | Servicio + acción + UI (`case-transfer-documents.tsx`) |
| Listado de transferencias por rol (staff/abogado/alguacil) + ficha de detalle | ✅ | `app/(dashboard)/legal-processes/page.tsx` + `.../transfers/[id]/page.tsx` |
| Migración de datos de `LegalProcess`/`GopTransferRequest` legacy → `CaseTransfer` | ✅ no aplicable | Verificado contra la base real: `legal_process` tenía 0 filas y `gop_transfer_request` ya no existía cuando se aplicó el schema nuevo — no había datos que migrar (ver nota en `docs/schema-design-far-overdracht.md` sección 6) |

## 7. GOP — `LegalProcess` (proceso judicial post-vonnis)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| `LegalProcess` nace en `GOP_ACTIVE` al registrar el vonnis (ya no antes) | ✅ | `LegalProcessService.registerFirstVerdict`, transacción única vonnis+GOP |
| Estados reducidos a `GOP_ACTIVE / GOP_INACTIVE / CLOSED` (sin `PENDING_ACCEPTANCE/REJECTED/IN_PROCEDURE/GOP_CANCELLED`, movidos a `CaseTransferStatus`) | ✅ | `LegalProcessStatus` en `constants/legal-process-status.ts` |
| Sentencias adicionales sobre un GOP ya activo | ✅ | `registerAdditionalVerdict` |
| Medidas de ejecución, intereses, costos del alguacil | ✅ | `registerExecutionMeasure` / `registerInterestUpdate` / `registerBailiffCost` |
| GOP Inactivo + reactivación automática al registrar nueva actividad | ✅ | `markInactive` / `reactivate` / `reactivateIfInactive` |
| Cambio de alguacil | ✅ | `changeBailiff` |
| Acuerdos de pago (regeling) dentro del GOP | ✅ | `createGopAgreement` vía `AgreementService` |
| Pago de deuda registrado directamente por el alguacil (sin pasar por Sentoo) | ✅ decisión consciente | `registerPayment` — desviación documentada de AT-009, ver plan sección 6 #3 |
| **Factura CFSB del 5% del alguacil (`BailiffFeeInvoice`)** | ✅ *(agregado hoy)* | `LegalProcessService.submitBailiffFeeInvoice` / `processBailiffFeePaymentConfirmed`, diálogo `finalize-bailiff-work-dialog.tsx` |
| **Gate de cierre: exige `BailiffFeeInvoice.status = PAID` antes de `CLOSED`** | ✅ *(agregado hoy)* | `LegalProcessService.close` ahora valida `gopCompletedGateAt` |
| Recordatorios de prescripción / fecha de revisión | ✅ | `lib/jobs/check_gop_deadlines.ts` |
| Documentos del expediente post-vonnis | ✅ | `LegalProcessDocument` |

## 8. COP — Collectieve Opvolging (cobro colectivo)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Modelo `CollectiveCollection`/`COLNegotiation`/`COLNotification` en schema | 🟡 solo schema | `prisma/schema.prisma` |
| Módulo `modules/collective-follow-up/` (o equivalente) | 🔴 | No existe ningún directorio de módulo |
| Cualquier action/servicio que use estos modelos | 🔴 | Único archivo que los referencia: `modules/dashboard/server/dashboard.service.ts` (conteo agregado, sin lógica de negocio) |
| Búsqueda de empleador / red de deelnemers / 3 salidas finales | 🔴 | Nada implementado |

**Sin cambios respecto al plan del 03-08** — sigue siendo el mayor esfuerzo pendiente de todo el roadmap.

## 9. Roles, dinero configurable y experiencia por rol (Fase 2 del plan)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| `Plan` con precios de registro/mensualidad/reactivación por `target_role` | ✅ | Ya es dato de configuración, no requiere cambio de schema |
| `hasPowerOfAttorney` (volmacht) en `Agreement`/`DebtClaim` | 🔴 | 0 referencias en el código |
| Generador de identidad `CFSBP-xxx`/`CFSB-xxx` sobre `Person.personal_number` | 🔴 | No existe generador de secuencia |
| Vistas de dashboard por nivel (Directie/Management/Operationeel) | 🔴 | `modules/dashboard` tiene panel general + workstation, sin las 3 vistas segmentadas |
| Migración `Parameter` (singleton global) → `Setting`/`SettingCategory` (con `tenantId`) | 🔴 | `Setting` ya soporta `tenantId` nullable en schema, pero los ~23 campos de `Parameter` (incl. `blok_check_pricing`, `abb_rate`) siguen leyéndose desde `ParameterService.getParameter()` (singleton `findFirst()`) en todo el código, no desde `Setting` |
| Notificaciones — regla "máximo 3 importantes" en pantalla | 🔴 | No hay lógica de priorización; `NotificationType`/canales multicanal sí existen |
| Dossier central / vista de documentos agregada sin doble carga | 🔴 | Cada fase (`ContractDocument`/`LegalProcessDocument`/`BlockadeDocument`/`CaseTransferDocument`/`VerdictAttachment`) sigue viviendo por separado, sin servicio de agregación |
| Multi-isla configurable (Bonaire/Curaçao/Aruba) | 🔴 | `Tenant` no tiene campo `island`/`jurisdiction` |

## 10. Reportería, auditoría avanzada, alcance de `employee` (Fase 3 del plan)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Reportes directivos/management/operacionales exportables | 🔴 | Solo existe `FinancialReportRequest` (reporte financiero puntual) |
| Auditoría inmutable transversal de plataforma (`AuditLog`) | 🔴 | No existe el modelo; `ClaimTimeline` solo cubre el dominio de cobranza |
| Principio de "cuatro ojos" para correcciones críticas de admin | 🔴 | No implementado |
| `Employee` acotado a su uso real (relaciones de empleador para COP) | 🟡 depende de COP | No se puede definir el alcance final hasta que exista COP |
| Salud del sistema / indicadores de riesgo y fraude | 🔴 | No definido ni en negocio ni en código |

---

## 11. Resumen ejecutivo (para pegar rápido en ChatGPT)

**Completo end-to-end:** Auth/multi-tenant, AOP, BLC, BLK (camino estándar), Overdracht/`CaseTransfer`
completo (incluida la transferencia de urgencia y el vencimiento automático de 7 días), GOP/`LegalProcess`
completo (incluida la factura del 5% del alguacil y el gate de cierre), Agreement, Contract, Payment/Sentoo,
capa SaaS (planes/suscripciones/facturación de plataforma).

**Con modelo pero sin lógica de negocio (0% de código funcional):** FAR (`FinancialAgreement`), COP
(`CollectiveCollection`).

**Con lógica pero incompleto:** BLK (falta ruta directa + múltiples razones), `Setting` (schema listo, sin
migrar lectores), branding CFSB (pendiente en 35 archivos), dashboards por rol (3 vistas), `hasPowerOfAttorney`,
identidad `CFSBP-xxx`, dossier central agregado, auditoría transversal, multi-isla.

**No iniciado en absoluto:** reportería exportable Fase 3, salud del sistema/fraude, acotamiento de `employee`.
