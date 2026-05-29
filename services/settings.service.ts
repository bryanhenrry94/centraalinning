import { prisma } from "@/lib/prisma";

export class SettingsService {
  static async getByCategory(categoryId: string) {
    return prisma.setting.findMany({
      where: {
        categoryId: categoryId,
      },
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
}
