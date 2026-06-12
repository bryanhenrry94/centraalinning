import { prisma } from "@/lib/prisma";

export class ContractDocumentService {
  static async getById(id: string) {
    return prisma.contractDocument.findUnique({
      where: {
        id,
      },
      include: {
        contract: {
          select: {
            id: true,
            tenant_id: true,
          },
        },
      },
    });
  }
}
