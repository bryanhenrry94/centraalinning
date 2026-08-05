import { prisma } from "@/lib/prisma";

export class SettingsCategoryService {
  // El conteo por categoría respeta el mismo alcance que
  // SettingsService.getByCategoryForAdmin: valores globales (jurisdictionId
  // null) más los de la isla seleccionada, nunca overrides de un tenant.
  static async getAll(jurisdictionId?: string | null) {
    return prisma.settingCategory.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        sortOrder: "asc",
      },

      include: {
        _count: {
          select: {
            settings: {
              where: {
                tenantId: null,
                OR: jurisdictionId
                  ? [{ jurisdictionId: null }, { jurisdictionId }]
                  : [{ jurisdictionId: null }],
              },
            },
          },
        },
      },
    });
  }

  static async getById(id: string) {
    return prisma.settingCategory.findUnique({
      where: {
        id,
      },
    });
  }
}
