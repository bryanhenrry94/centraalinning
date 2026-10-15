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

  // Rentetarief-geschiedenis (InterestDetail): de enige manier om een wettelijk
  // tarief te actualiseren was tot nu toe prisma/seed.ts opnieuw draaien — dit
  // maakt het beheerbaar vanuit CFSB Admin (ajuste sponsor, sectie Wettelijke
  // rente: "poder ajustar las tasas").
  static async createDetail(interestTypeId: string, data: { date: string; rate: number }) {
    return prisma.interestDetail.create({
      data: { interest_type_id: interestTypeId, date: data.date, rate: data.rate },
    });
  }

  static async updateDetail(id: string, data: { date: string; rate: number }) {
    return prisma.interestDetail.update({ where: { id }, data });
  }

  static async deleteDetail(id: string) {
    return prisma.interestDetail.delete({ where: { id } });
  }
}
