-- Fase 1 de la unificación "Mijn dossiers" (ver docs/plan-alineacion-cfsb.md):
-- backfill de la tabla `dossier` para datos EXISTENTES en un entorno con
-- registros previos a este cambio (no hace falta en una base nueva — ahí
-- la tabla nace vacía y las filas se crean junto con cada servicio desde el
-- día uno, ver DossierRecordService).
--
-- Orden de ejecución: correr esto DESPUÉS de `prisma db push`/`migrate` con
-- el modelo Dossier ya creado, pero ANTES de que el schema agregue la FK
-- compartida (`debt_claim.id REFERENCES dossier.id`, etc.) — si ya existen
-- filas en debt_claim/financial_agreement/blockade/block_check sin su
-- Dossier padre, Postgres rechaza la FK hasta que este backfill corra.
--
-- Idempotente: ON CONFLICT (id) DO NOTHING, seguro de correr más de una vez.

INSERT INTO dossier (id, "tenantId", "debtorId", "serviceType", reference, "registeredAt", "createdAt", "updatedAt")
SELECT id, "tenantId", "debtorId", 'DEBT_CLAIM', reference, "createdAt", "createdAt", "updatedAt"
FROM debt_claim
ON CONFLICT (id) DO NOTHING;

INSERT INTO dossier (id, "tenantId", "debtorId", "serviceType", reference, "registeredAt", "createdAt", "updatedAt")
SELECT id, "tenantId", "debtorId", 'FAR', "farNumber", "createdAt", "createdAt", "updatedAt"
FROM financial_agreement
ON CONFLICT (id) DO NOTHING;

INSERT INTO dossier (id, "tenantId", "debtorId", "serviceType", reference, "registeredAt", "createdAt", "updatedAt")
SELECT id, "tenantId", "debtorId", 'BLK', NULL, "registeredAt", "createdAt", "updatedAt"
FROM blockade
ON CONFLICT (id) DO NOTHING;

INSERT INTO dossier (id, "tenantId", "debtorId", "serviceType", reference, "registeredAt", "createdAt", "updatedAt")
SELECT id, "tenantId", "debtorId", 'BLC', NULL, "checkedAt", "checkedAt", "checkedAt"
FROM block_check
ON CONFLICT (id) DO NOTHING;
