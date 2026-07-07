import { prisma } from "@/lib/prisma";
import { InterestType } from "@/modules/settings/services/interest-type.validators";

export class InterestTypeService {
  static async getAll(): Promise<InterestType[]> {
    const data = await prisma.interestType.findMany({ include: { details: true } });
    return data as InterestType[];
  }

  static async getById(id: string): Promise<InterestType | null> {
    const data = await prisma.interestType.findUnique({
      where: { id },
      include: { details: true },
    });
    return data as InterestType | null;
  }

  static async create(data: any) {
    return prisma.interestType.create({ data });
  }

  static async update(id: string, data: any) {
    return prisma.interestType.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.interestType.delete({ where: { id } });
  }
}
