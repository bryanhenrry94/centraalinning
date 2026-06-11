import { prisma } from "@/lib/prisma";
import { CreateContractInput } from "@/services/contract/contract.types";
import { Prisma } from "@prisma/client";

export class ContractService {
  static async generateContractReference() {
    const year = new Date().getFullYear();

    const total = await prisma.contract.count();

    return `FAR-${year}-${String(total + 1).padStart(3, "0")}`;
  }

  static async list(
    tenantId: string,
    status: string,
    search: string,
    page: string,
  ) {
    const whereClause: any = {
      tenant_id: tenantId,
    };

    if (status !== "ALL") {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { reference_number: { contains: search } },
        {
          parties: {
            some: { full_name: { contains: search } },
          },
        },
      ];
    }

    console.log("Where clause for contract query:", whereClause);

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = 10;
    const skip = (pageNumber - 1) * pageSize;

    return await prisma.contract.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      include: {
        parties: true,
        documents: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  static async create(tenantId: string, contract: CreateContractInput) {
    const reference_number = await this.generateContractReference();

    return prisma.$transaction(async (tx) => {
      const createdContract = await tx.contract.create({
        data: {
          tenant_id: tenantId,
          reference_number: reference_number,
          amount: Prisma.Decimal(contract.amount),
          contract_type: contract.contract_type,
          contract_date: contract.contract_date,
          start_date: contract.start_date,
        },
      });

      await tx.contractParty.createMany({
        data: contract.parties.map((party) => ({
          contract_id: createdContract.id,
          role: party.role,
          person_type: party.person_type,
          full_name: party.full_name,
          identification: party.identification,
          email: party.email,
          phone: party.phone,
        })),
      });

      await tx.contractDocument.createMany({
        data: contract.documents.map((document) => ({
          contract_id: createdContract.id,
          file_name: document.file_name,
          file_path: document.file_path,
          mime_type: document.mime_type,
          file_size: document.file_size,
        })),
      });

      return createdContract;
    });
  }

  static async findById(id: string) {
    return await prisma.contract.findUnique({
      where: { id },
      include: {
        parties: true,
        documents: true,
      },
    });
  }

  static async update(id: string, data: Prisma.ContractUpdateInput) {
    return await prisma.contract.update({
      where: { id },
      data,
    });
  }
}
