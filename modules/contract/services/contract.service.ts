import { prisma } from "@/lib/prisma";
import { CreateContractInput } from "@/modules/contract/services/contract.types";
import { Prisma } from "@prisma/client";
import { DebtorService } from "@/modules/collection/services/debtor.service";
import { CollectionService } from "@/modules/collection/services/collection.service";

export class ContractService {
  static generateContractReference = async () => {
    const year = new Date().getFullYear();

    const total = await prisma.contract.count();

    return `FAR-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  static list = async (
    tenantId: string,
    status: string,
    search: string,
    page: string,
  ) => {
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
            some: { fullname: { contains: search } },
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
  };

  static create = async (tenantId: string, contract: CreateContractInput) => {
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
          description: contract.description,
          end_date: contract.end_date,
          installment_count: contract.installment_count,
          installment_amount: contract.installment_amount
            ? Prisma.Decimal(contract.installment_amount)
            : null,
        },
      });

      await tx.contractParty.createMany({
        data: contract.parties.map((party) => ({
          contract_id: createdContract.id,
          role: party.role,
          person_type: party.person_type,
          identification_type: party.identification_type,
          identification: party.identification,
          fullname: party.fullname,
          email: party.email,
          phone: party.phone,
          address: party.address,
          birth_date: party.birth_date,
          birth_place: party.birth_place,
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
  };

  static getById = async (id: string) => {
    console.log("Fetching contract with ID:", id);
    return await prisma.contract.findUnique({
      where: { id },
      include: {
        parties: true,
        documents: true,
      },
    });
  };

  static update = async (id: string, data: Prisma.ContractUpdateInput) => {
    return await prisma.contract.update({
      where: { id },
      data,
    });
  };

  static getByIdForTenant = async (id: string, tenantId: string) => {
    return prisma.contract.findFirst({
      where: { id, tenant_id: tenantId },
      include: { parties: true, documents: true },
    });
  };

  static listAll = async (tenantId: string) => {
    return prisma.contract.findMany({
      where: { tenant_id: tenantId },
      include: {
        parties: {
          select: { id: true, role: true, fullname: true, email: true, identification: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
  };

  static last = async (tenantId: string, limit: number = 5) => {
    return prisma.contract.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
      take: limit,
      select: { id: true, reference_number: true, status: true, created_at: true, amount: true },
    });
  };

  static updateStatus = async (
    id: string,
    tenantId: string,
    status: "DRAFT" | "PENDING_PAYMENT" | "REGISTERED" | "CANCELLED",
  ) => {
    const existing = await prisma.contract.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error("Contract not found");
    return prisma.contract.update({ where: { id }, data: { status: status as any } });
  };

  static updateFull = async (id: string, tenantId: string, input: CreateContractInput) => {
    const existing = await prisma.contract.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error("Contract not found");

    return prisma.$transaction(async (tx) => {
      return tx.contract.update({
        where: { id },
        data: {
          contract_date: input.contract_date,
          start_date: input.start_date,
          end_date: input.end_date ?? null,
          amount: input.amount,
          installment_count: input.installment_count ?? null,
          installment_amount: input.installment_amount ?? null,
          description: input.description ?? null,
          contract_type: input.contract_type,
          parties: {
            deleteMany: {},
            create: input.parties.map((party) => ({
              person_type: party.person_type as "INDIVIDUAL" | "COMPANY",
              role: party.role,
              fullname: party.fullname,
              identification_type: party.identification_type,
              identification: party.identification,
              email: party.email,
              phone: party.phone,
              birth_date: party.birth_date ?? null,
              birth_place: party.birth_place ?? null,
              address: party.address ?? null,
            })),
          },
          documents: {
            deleteMany: {},
            create: (input.documents ?? []).map((doc) => ({
              file_name: doc.file_name,
              file_path: doc.file_path,
              mime_type: doc.mime_type,
              file_size: doc.file_size,
            })),
          },
        },
        include: { parties: true, documents: true },
      });
    });
  };

  static deleteById = async (id: string, tenantId: string) => {
    const existing = await prisma.contract.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error("Contract not found");
    return prisma.contract.delete({ where: { id } });
  };

  static async startFollowUp(contractId: string) {
    const contract = await this.getById(contractId);

    if (!contract) {
      throw new Error("Contract not found");
    }

    for (const party of contract.parties) {
      if (party.role !== "PARTY_B") continue;

      const { debtor } = await DebtorService.findOrCreate(
        {
          person_type: party.person_type,
          identification_type: party.identification_type,
          identification: party.identification,
          fullname: party.fullname,
          email: party.email,
          phone: party.phone,
          address: party.address,
          birth_date: party.birth_date,
          birth_place: party.birth_place,
        },
        contract.tenant_id,
      );

      const collection = await CollectionService.createFromContract(
        contract,
        debtor.id,
      );

      if (collection) {
        await this.update(contractId, {
          status: "IN_COLLECTION",
        });
      }
    }
  }
}
