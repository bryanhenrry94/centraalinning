# Estado actual de funcionalidades — actualizado 2026-08-04 (post puntos 2–14)

_Reemplaza la versión anterior de este mismo archivo (generada como línea de base antes de empezar a
trabajar los puntos numerados del análisis externo). Cada fila fue verificada contra el código real de
este repo hoy, después de completar los puntos **2, 4, 6, 7, 8, 9, 10, 11, 12, 13 y 14** del listado de
correcciones de CFSB. El **punto 15 (pruebas automáticas) queda pendiente — no se inició todavía**, sigue
en 🔴 exactamente igual que antes._

**Cómo usarlo:** pegá esta tabla (o el CSV `docs/matriz-funcionalidades.csv`) en tu conversación de
ChatGPT junto con la lista de funcionalidades/puntos que tengas ahí, y pedí un diff en dos sentidos: qué
aparece en su lista y no acá (gap real pendiente), y qué aparece acá y no en la suya (posible
funcionalidad no capturada en ese análisis).

Leyenda: ✅ Implementado y en uso · 🟡 Parcial (existe pero incompleto) · 🔴 No existe.

---

## 0. Qué cambió respecto a la versión anterior de este documento

| Punto del análisis | Tema | Resultado |
|---|---|---|
| 2 | Plazo de 7 días de aceptación de `CaseTransfer` sin vencimiento automático | ✅ hecho |
| 4 | FAR como servicio independiente ($10, sin seguimiento) | ✅ hecho |
| 6 | Ruta directa a BLK (sin pasar por AOP) | ✅ hecho |
| 7 | Acuerdos de pago — volmacht (`hasPowerOfAttorney`) | ✅ hecho |
| 8 | Confirmación centralizada de pagos en GOP (doble control) | ✅ hecho |
| 9 | Validaciones de cierre de GOP + fix de liberación de bloqueo | ✅ hecho |
| 10 | Expediente digital centralizado (dossier agregado) | ✅ hecho |
| 11 | Numeración permanente CFSBP-xxx / CFSB-xxx | ✅ hecho |
| 12 | Barrido de marca CFSB (Centraal Inning/CI → CFSB) | ✅ hecho |
| 13 | Arquitectura multi-isla data-driven (`Jurisdiction`) | ✅ hecho |
| 14 | Migración `Parameter` (singleton) → `Setting` (por isla/tenant) | ✅ hecho |
| 15 | Pruebas automáticas | 🔴 **pendiente — pausado a pedido del usuario, se retoma después** |

Puntos 1, 3, 5 del análisis original no fueron trabajados en esta sesión (no se pidieron todavía).

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
| **Branding CFSB** (reemplazo de "Centraal Inning"/"CI") | ✅ *(punto 12)* | 0 menciones de "Centraal Inning"/"CI" en `app/`, `modules/`, `shared/`, `infrastructure/` (verificado por grep). Se mantiene deliberadamente: razón social legal `Centraal Inning Onderneming B.V.` en `Tenant.legal_name` del tenant admin, y URLs/emails funcionales externos (`www.centraalinning.com`, `no-reply@centraalinning.com`) hasta que exista el dominio definitivo de CFSB. |
| **Multi-isla configurable** (Bonaire activa; Curaçao/Aruba preparadas) | ✅ *(punto 13)* | Tabla real `Jurisdiction` (no enum, sin nombres de isla hardcodeados en código) con tarifas/plazos/ABB/prefijo de numeración/servicios activos por isla vía `JurisdictionService` |
| **Configuración por isla/tenant sin tocar código** (`Setting` reemplaza a `Parameter` singleton) | ✅ *(punto 14)* | `SettingsService.resolveValue`/`getResolvedSettings` con jerarquía tenant > isla > global; pantalla real de Superadministrador en `/admin/settings/parameters` con selector de isla |
| **Numeración permanente de identidad** `CFSBP-BON-000001` (persona) / `CFSB-BON-000001` (empresa) | ✅ *(punto 11)* | `PersonService.generatePersonalNumber` — generador atómico con `SELECT...FOR UPDATE` + reintento ante deadlock, prefijo de isla leído de `Jurisdiction.numberingPrefix` (dato, no código) |
| **Expediente digital centralizado** (dossier agregado de documentos) | ✅ *(punto 10)* | `modules/case-file/services/case-file.service.ts` — agregación de solo lectura sobre contrato/FAR/AOP/BLK/transferencia/GOP/vonnis/facturas/comprobantes de pago, sin tabla nueva ni doble carga |
| Pruebas automatizadas | 🔴 | Sigue sin runner configurado ni tests — punto 15, pausado por pedido explícito del usuario en esta sesión para retomarlo después |
| Texto "tenant" visible al usuario (debería decir "deelnemer/participante") | 🟡 | Sin cambios — pendiente, no forma parte de los puntos trabajados |
| Naming heredado `CollectionCase*` sin uso real | 🟡 | Sin cambios — pendiente |
| Residuo de UI duplicada `parameters_vs2/` | ✅ *(resuelto al hacer el punto 14)* | Confirmado 100% mockup estático sin wiring real, sin ninguna referencia de navegación — eliminado junto con su componente `ParameterCategoriesGrid`. Queda `page_old.tsx` + `sections/*` como residuo menor no ruteado (no forma parte de ningún path de Next.js), no eliminado por no ser parte del alcance pedido. |

## 2. FAR — Financiële Afspraken Registreren

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Modelo `FinancialAgreement` en schema (fee $10, sin seguimiento activo) | ✅ | `prisma/schema.prisma` |
| Módulo `modules/financial-agreement/` (actions/services/constants/utils) | ✅ *(punto 4)* | `FinancialAgreementService.create` / `processRegistrationPaymentConfirmed`, `FAR_REGISTRATION_FEE = 10` |
| `PaymentType.FAR_REGISTRATION` cobrado vía Sentoo, independiente de AOP | ✅ *(punto 4)* | `payment.validators.ts`, `payment-processor.ts` — un `FinancialAgreement` puede existir y pagarse sin que exista ningún `DebtClaim`/AOP asociado |
| Pantallas de alta/listado/detalle | ✅ *(punto 4)* | `app/(dashboard)/financial-agreements/{page,new/page,[id]/page}.tsx` |
| Escalamiento FAR → AOP (`escalatedToDebtClaimId`) | 🔴 | Campo existe en schema, ninguna lógica lo setea todavía — no fue parte de los puntos trabajados |

## 3. AOP — Administratieve Opvolging (cobro administrativo)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Etapas REMINDER → FINAL_NOTICE → DEFAULT_NOTICE → BLK_NOTIFICATION | ✅ | `AdministrativeCollection`/`AdministrativeCollectionStep` |
| Avance automático por job programado | ✅ | `lib/jobs/process_collection_case_workflow.ts` |
| Plazos y multas configurables por isla/tenant (no hardcodeados) | ✅ *(puntos 13 y 14)* | `ParameterService.getParameterForTenant` resuelve `company_aanmaning_term_days`, `consumer_aanmaning_term_days`, penalidades, etc. vía `Setting` con fallback a la columna de `Jurisdiction` |
| Timeline de auditoría del expediente | ✅ | `ClaimTimeline` / `ClaimTimelineService` |
| Cadena FAR→AOP→BLC→BLK sin acoplamiento obligatorio | ✅ *(puntos 4 y 6)* | FAR ya es independiente (sección 2); BLK ya tiene ruta directa sin pasar por AOP (sección 5) |

## 4. BLC — Block Check (verificación previa)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Consulta de bloqueo previa, cobrada por check | ✅ | `modules/block-check/services/block-check.service.ts` |
| Respuesta limitada a `blockadeFound: boolean` (sin exponer el expediente) | ✅ | Verificado en el servicio |
| Auditoría (`checkedBy`/`checkedAt`) | ✅ | Modelo `BlockCheck` |
| Precio en $35 (pedido CFSB) | 🟡 sigue como dato pendiente | El precio ahora es configurable por `Setting` (`blok_check_pricing`, vía `getParameterForTenant`, punto 14) — el mecanismo ya soporta $35 por isla, pero el valor sembrado en `prisma/seed.ts` para Bonaire sigue en $30. Cambio de dato, no de código: alcanza con actualizar la fila `Setting` o el seed. |

## 5. BLK — Blokkade (bloqueo / registro en central de crédito)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Registro de bloqueo desde AOP fallido | ✅ | `BlockadeService`, `modules/blockade` |
| Registro de bloqueo desde vonnis GOP (sentencia registrada) | ✅ | `legal-process.service.ts` → `registerFirstVerdict` |
| Reactivación automática de bloqueos suspendidos | ✅ | `lib/jobs/check_blockade_reactivation.ts` |
| Documentos de bloqueo (con ruta de descarga real) | ✅ *(fix del punto 10)* | `BlockadeDocument` + `app/api/blockades/documents/[id]/download/route.ts` — antes la UI apuntaba a una ruta que nunca existió |
| **Ruta "BLK directo"** (trayecto externo ya completado, sin pasar por AOP) | ✅ *(punto 6)* | `BlockadeSchema` exige motivo + `reasonNote` (para los motivos que lo requieren) + confirmación explícita (`confirmed: true`); `BlockadeService.createFull` registra el evento `BLOCKADE_REGISTERED` en `ClaimTimeline` como auditoría |
| **Múltiples razones de bloqueo** | ✅ *(punto 6)* | `enum BlockadeReason` ampliado a `UNPAID_PAYMENT`, `EXTERNAL_PROCEDURE_COMPLETED`, `OTHER` |
| Regla "el bloqueo permanece activo si existe otro expediente abierto" | ✅ *(punto 9)* | `BlockadeService.releaseForSettledDebtClaim` — al cerrar un GOP solo libera el `Blockade` de ESE `debtClaim`; antes de notificar "desbloqueo total" verifica si existen otros bloqueos activos para la misma `Person` (cruzando tenants, igual que `BlockCheckService`). Corrigió un bug real: el código anterior (`suspendActiveForDebtor`) liberaba TODOS los bloqueos del deudor sin importar si había otra deuda vigente. |

## 6. Overdracht — `CaseTransfer` (transferencia a abogado/alguacil)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Modelo `CaseTransfer` separado de `LegalProcess` | ✅ | `prisma/schema.prisma` |
| Solicitud de transferencia + cobro de comisión 5% (Sentoo) | ✅ | `CaseTransferService.requestTransfer` |
| Confirmación de pago → `PENDING_ACCEPTANCE` + plazo de 7 días | ✅ | `CaseTransferService.confirmTransferPayment` |
| Aceptación / rechazo por el abogado o alguacil asignado | ✅ | `acceptTransfer` / `rejectTransfer` |
| **El plazo del abogado/alguacil puede extenderse y NO vence automáticamente** | ✅ *(punto 2 — corrige el comportamiento anterior)* | Reemplaza el viejo `expireOverdueTransfers` (que rechazaba solo). Ahora: recordatorio día 5 al profesional (`CASE_TRANSFER_ACCEPTANCE_REMINDER`), aviso día 7 al participante (`CASE_TRANSFER_ACCEPTANCE_DEADLINE_REACHED`, se repite mientras no se resuelva), y el participante decide: `extendCaseTransferAcceptanceDeadline` (7 días más al mismo profesional) o `rejectOverdueCaseTransfer` (elegir otro). Nada se cierra ni rechaza solo. Antelación del recordatorio ahora configurable por isla/tenant (`case_transfer_acceptance_reminder_days_before`, punto 14). |
| **El alguacil/abogado ya asignado no necesita volver a aceptar** ante cambios menores del expediente | ✅ *(verificado, comportamiento ya correcto)* | El ciclo de aceptación (`PENDING_ACCEPTANCE → ACCEPTED`) ocurre una única vez por `CaseTransfer`; extender el plazo (`extendAcceptanceDeadline`) o registrar actividad posterior no vuelve a pedir aceptación — solo actualiza `acceptanceDeadline` sobre el mismo registro `ACCEPTED`/pendiente, sin crear una nueva transferencia ni resetear el estado. |
| Cancelación por el participante (solo antes del vonnis) | ✅ | `CaseTransferService.cancelTransfer` |
| Transferencia de urgencia / noodoverdracht | ✅ | `isEmergencyTransfer`/`emergencyReason` |
| **Acuerdos de pago (regeling) con volmacht del participante** | ✅ *(punto 7)* | `CaseTransfer.hasPowerOfAttorney`/`powerOfAttorneyGrantedAt`/`powerOfAttorneyNote`. Por defecto: "el profesional propone, el participante decide" (`AgreementService.decide` — staff siempre puede, el profesional (abogado/alguacil) solo si `hasPowerOfAttorney = true`). Sin volmacht, el profesional solo puede *proponer* (`proposeCaseTransferAgreement`), nunca decidir. |
| Finalización del trabajo del abogado: factura + comisión CFSB 5% | ✅ | `CaseTransferService.submitLawyerFeeInvoice` / `processLawyerFeePaymentConfirmed` |
| Documentos de la fase de transferencia | ✅ | `CaseTransferDocument` |

## 7. GOP — `LegalProcess` (proceso judicial post-vonnis)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| **GOP solo inicia tras el registro de la sentencia (vonnis)** | ✅ | `LegalProcessService.registerFirstVerdict` — `LegalProcess` nace en `GOP_ACTIVE` recién ahí, nunca antes; transacción única vonnis+GOP. No existe ningún camino que cree un `LegalProcess` sin vonnis (la fase previa vive enteramente en `CaseTransfer`, sección 6). |
| Sentencias adicionales sobre un GOP ya activo | ✅ | `registerAdditionalVerdict` |
| Medidas de ejecución, intereses, costos del alguacil | ✅ | `registerExecutionMeasure` / `registerInterestUpdate` / `registerBailiffCost` |
| **Medidas de ejecución — listado y marcado de completadas en UI** | ✅ *(punto 9)* | `getGopExecutionMeasures` / `completeGopExecutionMeasure`, componente `gop-execution-measures.tsx` |
| GOP Inactivo + reactivación automática, recordatorios de prescripción/revisión configurables por isla | ✅ *(base existente + punto 14)* | `check_gop_deadlines.ts` — `gop_prescription_reminder_days`/`gop_review_reminder_days` ahora resueltos por `SettingsService` en vez de constantes fijas |
| Cambio de alguacil | ✅ | `changeBailiff` |
| **Acuerdos de pago (regeling) requieren aprobación del participante** | ✅ *(punto 7)* | `AgreementService.decide` — mismo mecanismo de volmacht que en Overdracht (sección 6), aplicado también al GOP directo vía `decideGopAgreement` |
| **Los pagos requieren confirmación de ambas partes** (doble control) | ✅ *(punto 8, reemplaza el registro directo sin confirmación)* | Nuevo modelo `GopPaymentConfirmation`: `registerGopPayment` crea el `Payment` en estado `pending` + comprobante obligatorio + notifica a la contraparte; `confirmGopPayment` (solo quien NO registró puede confirmar — segregación estricta vía `requireAuthorizedToConfirmGopPayment`) recién ahí aplica el pago al saldo; `disputeGopPayment` → `DISPUTED`; `correctGopPayment` (solo quien registró originalmente) corrige y vuelve a pedir confirmación. Reemplaza formalmente la desviación consciente de AT-009 documentada en `plan-alineacion-cfsb.md` §6.3. |
| **GOP no puede cerrarse antes de tiempo** | ✅ *(punto 9)* | `LegalProcessService.assertCloseable` — bloquea `close()` si: el estado no es ACTIVE/INACTIVE, no se marcó `gopCompletedGateAt`, el saldo de la obligación no es cero, hay algún `GopPaymentConfirmation` fuera de `CONFIRMED` (mensaje distinto si está `DISPUTED`), hay `VerdictBailiffServices` en `PENDING`, hay `VerdictEmbargo` en `IN_PROGRESS`, o hay algún `Agreement` pendiente de decisión. |
| Factura CFSB del 5% del alguacil (`BailiffFeeInvoice`) + gate de cierre | ✅ | `submitBailiffFeeInvoice` / `processBailiffFeePaymentConfirmed`; el gate ahora es uno más de los que valida `assertCloseable` (arriba), no el único. |
| Documentos del expediente post-vonnis | ✅ | `LegalProcessDocument` |

## 8. COP — Collectieve Opvolging (cobro colectivo)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Modelo `CollectiveCollection`/`COLNegotiation`/`COLNotification` en schema | 🟡 solo schema | Sin cambios en esta sesión |
| Módulo `modules/collective-follow-up/` (o equivalente) | 🔴 | No existe — sigue siendo el mayor esfuerzo pendiente de todo el roadmap, no fue parte de los puntos 2–14 |

## 9. Facturación / comisiones CFSB (transversal)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| **Factura del 5% se calcula sobre el importe correcto** (comisión de transferencia a abogado) | ✅ verificado | `CaseTransferService.requestTransfer` calcula el 5% (`GOP_FEE_RATE`) sobre el monto adeudado del `DebtClaim` en el momento de la solicitud, no sobre un importe posterior o parcial |
| Factura del 5% del alguacil, mismo patrón | ✅ | `LegalProcessService.submitBailiffFeeInvoice`/`generateGopFeeInvoice`, calculado sobre el mismo criterio que la del abogado |
| Comisión FAR fija ($10, no porcentual) | ✅ *(punto 4)* | `FAR_REGISTRATION_FEE = 10`, independiente del monto del acuerdo — según especificación CFSB |
| BLC ($35 solicitado) | 🟡 | Ver sección 4 — mecanismo listo, valor sembrado sigue en $30 |

## 10. Roles, dinero configurable y experiencia por rol

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| `Plan` con precios de registro/mensualidad/reactivación por `target_role` | ✅ | Dato de configuración, sin cambios de schema |
| **`hasPowerOfAttorney` (volmacht)** | ✅ *(punto 7)* | Ver secciones 6 y 7 |
| **Generador de identidad `CFSBP-xxx`/`CFSB-xxx`** | ✅ *(punto 11)* | Ver sección 1 |
| **Migración `Parameter` (singleton) → `Setting`/`SettingCategory` por isla/tenant** | ✅ *(punto 14)* | Ver sección 1 — jerarquía tenant > isla > global; UI real de Superadministrador con selector de isla en `/admin/settings/parameters` |
| **Multi-isla configurable (Bonaire/Curaçao/Aruba)** | ✅ *(punto 13)* | Ver sección 1 |
| Vistas de dashboard por nivel (Directie/Management/Operationeel) | 🔴 | Sin cambios — no fue parte de los puntos trabajados |
| Notificaciones — regla "máximo 3 importantes" en pantalla | 🔴 | Sin cambios |
| **Dossier central / vista de documentos agregada sin doble carga** | ✅ *(punto 10)* | Ver sección 1 |

## 11. Reportería, auditoría avanzada, alcance de `employee`

Sin cambios respecto a la versión anterior de este documento — no formaron parte de los puntos 2–14.

| Funcionalidad | Estado |
|---|---|
| Reportes directivos/management/operacionales exportables | 🔴 |
| Auditoría inmutable transversal de plataforma (`AuditLog`) | 🔴 |
| Principio de "cuatro ojos" para correcciones críticas de admin | 🔴 |
| `Employee` acotado a su uso real (relaciones de empleador para COP) | 🟡 depende de COP |
| Salud del sistema / indicadores de riesgo y fraude | 🔴 |

---

## 12. Resumen ejecutivo (para pegar rápido en ChatGPT)

**Completo end-to-end tras esta sesión:** Auth/multi-tenant, AOP (con plazos/multas configurables por
isla), BLC, BLK (ruta estándar **y ruta directa**, múltiples razones), Overdracht/`CaseTransfer` completo
(incluida la extensión de plazo sin vencimiento automático y la volmacht sobre acuerdos), GOP/`LegalProcess`
completo (incluida la confirmación dual de pagos, las validaciones de cierre, y las medidas de ejecución en
UI), FAR como servicio independiente, expediente digital centralizado, identidad permanente CFSBP-xxx,
branding CFSB en toda la plataforma, arquitectura multi-isla data-driven, y `Setting` reemplazando al
singleton `Parameter`. Capa SaaS (planes/suscripciones/facturación de plataforma) sin cambios, ya estaba
completa.

**Con modelo pero sin lógica de negocio (0% de código funcional):** COP (`CollectiveCollection`).

**Con lógica pero incompleto:** escalamiento FAR→AOP (`escalatedToDebtClaimId` sin lógica que lo setee),
precio de BLC sembrado en $30 en vez de $35 (cambio de dato), dashboards por rol (3 vistas), auditoría
transversal de plataforma, reportería exportable.

**No iniciado:** pruebas automáticas (**punto 15 — pausado a pedido del usuario, próximo en la cola**),
reportería exportable Fase 3, salud del sistema/fraude, acotamiento de `employee`.
