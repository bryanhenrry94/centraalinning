import { prisma } from "@/lib/prisma";

export class SettingsCategoryService {
  static async getAll() {
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
            settings: true,
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
