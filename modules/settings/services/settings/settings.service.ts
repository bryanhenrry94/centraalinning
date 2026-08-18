import { prisma } from "@/lib/prisma";

export class SettingsService {
  // Filas de una categoría para la pantalla del Superadministrador (punto 14
  // del análisis CFSB): siempre valores por defecto de la plataforma
  // (tenantId null, nunca overrides de un tenant puntual), combinando los
  // valores globales de la categoría (jurisdictionId null, p.ej.
  // email_sender) con los específicos de la isla seleccionada (p.ej.
  // collection_fee_rate). Sin isla seleccionada, solo se ven los globales.
  static async getByCategoryForAdmin(categoryId: string, jurisdictionId?: string | null) {
    return prisma.setting.findMany({
      where: {
        categoryId,
        tenantId: null,
        OR: jurisdictionId ? [{ jurisdictionId: null }, { jurisdictionId }] : [{ jurisdictionId: null }],
      },
      include: { jurisdiction: { select: { id: true, islandCode: true, islandName: true } } },
      orderBy: [{ jurisdictionId: "asc" }, { name: "asc" }],
    });
  }

  static async updateSettings(settings: { id: string; value: string }[]) {
    await Promise.all(
      settings.map((setting) =>
        prisma.setting.update({
          where: {
            id: setting.id,
          },
          data: {
            value: setting.value,
          },
        }),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Resolución jerárquica (punto 14 del análisis CFSB): reemplaza al
  // singleton global Parameter. Un valor puede definirse a 3 niveles, del
  // más específico al más general — el Superadministrador cambia
  // comportamiento editando datos, nunca código:
  //   1) override de un tenant puntual (tenantId = X)
  //   2) valor por defecto de la isla/jurisdicción (jurisdictionId = Y)
  //   3) valor global de la plataforma (tenantId = null, jurisdictionId = null)
  // ---------------------------------------------------------------------

  static async resolveValue(
    key: string,
    scope: { tenantId?: string | null; jurisdictionId?: string | null },
  ): Promise<string | null> {
    if (scope.tenantId) {
      const tenantSetting = await prisma.setting.findFirst({
        where: { tenantId: scope.tenantId, key },
      });
      if (tenantSetting) return tenantSetting.value;
    }

    if (scope.jurisdictionId) {
      const jurisdictionSetting = await prisma.setting.findFirst({
        where: { tenantId: null, jurisdictionId: scope.jurisdictionId, key },
      });
      if (jurisdictionSetting) return jurisdictionSetting.value;
    }

    const globalSetting = await prisma.setting.findFirst({
      where: { tenantId: null, jurisdictionId: null, key },
    });
    return globalSetting?.value ?? null;
  }

  static async resolveNumber(
    key: string,
    scope: { tenantId?: string | null; jurisdictionId?: string | null },
    fallback = 0,
  ): Promise<number> {
    const value = await this.resolveValue(key, scope);
    const parsed = value !== null ? Number(value) : NaN;
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  static async resolveBoolean(
    key: string,
    scope: { tenantId?: string | null; jurisdictionId?: string | null },
    fallback = false,
  ): Promise<boolean> {
    const value = await this.resolveValue(key, scope);
    if (value === null) return fallback;
    return value === "true" || value === "1";
  }

  // Upsert de un override booleano a nivel de un tenant puntual — a
  // diferencia de updateSettings (solo Superadministrador, edita filas ya
  // sembradas por id), esta fila puede no existir todavía para el tenant.
  // Prisma no acepta `null` dentro de la where compuesta única
  // (tenantId_jurisdictionId_key) en esta versión — mismo patrón
  // findFirst + create/update que usa prisma/seed.ts, no upsert directo.
  static async upsertTenantBooleanSetting(
    tenantId: string,
    categoryId: string,
    key: string,
    name: string,
    value: boolean,
  ) {
    const stringValue = value ? "true" : "false";
    const existing = await prisma.setting.findFirst({
      where: { tenantId, jurisdictionId: null, key },
    });

    if (existing) {
      return prisma.setting.update({
        where: { id: existing.id },
        data: { value: stringValue },
      });
    }

    return prisma.setting.create({
      data: { tenantId, jurisdictionId: null, categoryId, key, name, value: stringValue },
    });
  }

  // Resuelve TODAS las keys visibles para un scope en 3 consultas (en vez
  // de una por key): global → isla → tenant, cada nivel pisa al anterior.
  static async getResolvedSettings(scope: {
    tenantId?: string | null;
    jurisdictionId?: string | null;
  }): Promise<Record<string, string>> {
    const [globalRows, jurisdictionRows, tenantRows] = await Promise.all([
      prisma.setting.findMany({ where: { tenantId: null, jurisdictionId: null } }),
      scope.jurisdictionId
        ? prisma.setting.findMany({ where: { tenantId: null, jurisdictionId: scope.jurisdictionId } })
        : Promise.resolve([]),
      scope.tenantId
        ? prisma.setting.findMany({ where: { tenantId: scope.tenantId } })
        : Promise.resolve([]),
    ]);

    const result: Record<string, string> = {};
    for (const row of globalRows) result[row.key] = row.value;
    for (const row of jurisdictionRows) result[row.key] = row.value;
    for (const row of tenantRows) result[row.key] = row.value;
    return result;
  }
}
