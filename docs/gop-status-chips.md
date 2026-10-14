# Estados y colores de chip — pantalla "Mijn dossiers" (GOP / legal-processes)

> Decisión CCP aplicada. Ver `modules/legal-process/utils/case-transfer-status.ts` y
> `modules/legal-process/utils/legal-process-status.ts`.

Esta pantalla combina dos entidades distintas en una sola tabla:

- **Transfer** = `CaseTransferStatus` (dossier antes de que exista un GOP activo)
- **GOP** = `LegalProcessStatus` (dossier después de que el vonnis fue registrado y entró en fase de activación/GOP)

## Transfer (CaseTransferStatus)

| Estado (enum) | Label final | Color | Nota |
|---|---|---|---|
| `PENDING_PAYMENT` | Wacht op overdrachtsbetaling | warning (amarillo) | Legacy — ya no se genera para transferencias nuevas |
| `PENDING_ACCEPTANCE` | In afwachting van acceptatie | warning (amarillo) | |
| `ACCEPTED` | In behandeling | success (verde) | |
| `REJECTED` | Afgewezen | error (rojo) | |
| `WORK_COMPLETED` | Behandeling afgerond | warning (amarillo) | No es un cierre del dossier — solo terminó la fase/profesional actual, puede seguir el proceso (p. ej. falta que el alguacil registre el vonnis) |
| `CANCELLED` | Geannuleerd | default (gris) | |

## GOP (LegalProcessStatus)

| Estado (enum) | Label final | Color | Nota |
|---|---|---|---|
| `GOP_DRAFT` | Conceptregistratie – betaling in afwachting | warning (amarillo) | La registratie del deurwaarder ya está completa; falta uno o ambos pagos de activación. **Nunca tiene número GOP oficial.** |
| `GOP_ACTIVE` | GOP actief | success (verde) | Acá se genera el número oficial `GOP-2026-xxx` |
| `GOP_INACTIVE` | In onderzoek naar executiemogelijkheden | warning (amarillo) | Sin bienes embargables por ahora, el dossier sigue abierto |
| `CLOSED` | GOP afgerond | success (verde) | |

## Regla de numeración (técnica, absoluta)

**Un número GOP oficial (`GOP-2026-xxx`) solo nace cuando `LegalProcessStatus` pasa a `GOP_ACTIVE`.**

- Transfer / Direct GOP antes de la activación → usa la referencia interna del `DebtClaim` (nunca `GOP-2026-xxx`).
- `GOP_DRAFT` → todavía sin número oficial (`referenceNumber` es `null`).
- `GOP_ACTIVE` → recién acá se genera el número, dentro de la misma transacción que fija el status (`LegalProcessService.tryActivateGop`).

Implementado en `LegalProcessService.generateReferenceNumber` (ahora acepta el cliente de transacción) y `tryActivateGop` — se eliminó la generación prematura que antes ocurría en `registerFirstVerdict` (al crear el `GOP_DRAFT`).

## Flujo GOP Directo (confirmado, sin entidad nueva)

No se necesita una tercera entidad para "GOP Directo" — reutiliza la misma estructura Transfer → GOP ya existente:

```
Direct GOP enviado
  → PENDING_ACCEPTANCE   ("In afwachting van acceptatie")
  → ACCEPTED             ("In behandeling")                — deurwaarder acepta y revisa el vonnis
  → GOP_DRAFT             ("Conceptregistratie – betaling in afwachting") — registratie completa, pagos pendientes
  → GOP_ACTIVE             ("GOP actief") — se asigna GOP-2026-xxx
```

## Regla de color (CCP, vigente en todo el sistema)

- **Amarillo (warning)** — requiere todavía una acción, decisión, pago o siguiente fase
- **Verde (success)** — activo correctamente o finalizado correctamente
- **Rojo (error)** — rechazado / error crítico
- **Gris (default)** — cancelado / no activo

Las pantallas de CFSB Admin (`modules/admin/utils/admin-status.ts`) usan sus propias etiquetas (más cortas, para contexto cross-tenant) pero deben respetar el mismo color por estado — ya alineado (`TRANSFER_ADMIN_STATUS.WORK_COMPLETED` pasó a warning).
