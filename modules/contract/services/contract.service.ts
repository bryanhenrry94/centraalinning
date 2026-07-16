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
        activation_payment: {
          select: { id: true, status: true, payment_url: true },
        },
        debtClaim: {
          select: { id: true, status: true },
        },
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
          contract_date: new Date(contract.contract_date),
          start_date: new Date(contract.start_date),
          description: contract.description,
          end_date: contract.end_date ? new Date(contract.end_date) : null,
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
    status: "DRAFT" | "REGISTERED",
  ) => {
    const existing = await prisma.contract.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error("Contract not found");
    return prisma.contract.update({ where: { id }, data: { status } });
  };

  static deleteById = async (id: string, tenantId: string) => {
    const existing = await prisma.contract.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error("Contract not found");

    if (existing.status !== "DRAFT") {
      throw new Error(
        "Alleen overeenkomsten in concept kunnen worden verwijderd",
      );
    }

    return prisma.contract.delete({ where: { id } });
  };

  /**
   * Start het administratieve vervolgingsproces (AOP) voor een geregistreerde
   * overeenkomst: zoekt/creëert de debiteur op basis van PARTY_B en maakt een
   * DebtClaim + betaalverplichting aan (status OPEN, nog niet geactiveerd).
   * De activatie (charges, AOP-stappen, aanmaning) gebeurt pas wanneer de
   * webhook de betaling van de verplichting als "paid" bevestigt
   * (zie `processCollectionPayment`).
   *
   * Idempotent: als er al een DebtClaim gekoppeld is en deze nog OPEN is
   * (betaling nog niet bevestigd), wordt dezelfde verplichting hergebruikt
   * i.p.v. een duplicaat aan te maken.
   */
  static async initiateFollowUp(contractId: string): Promise<{
    claimId: string;
    obligationId: string;
    amount: number;
  }> {
    const contract = await this.getById(contractId);

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.status !== "REGISTERED") {
      throw new Error(
        "Alleen geregistreerde overeenkomsten kunnen het administratieve vervolgingsproces starten",
      );
    }

    if (contract.debtClaim_id) {
      const existingClaim = await prisma.debtClaim.findUnique({
        where: { id: contract.debtClaim_id },
        include: {
          obligations: {
            where: { beneficiary: "CFSB", type: "COLLECTION", status: "PENDING" },
            take: 1,
          },
        },
      });

      const pendingObligation = existingClaim?.obligations[0];

      if (existingClaim?.status === "OPEN" && pendingObligation) {
        return {
          claimId: existingClaim.id,
          obligationId: pendingObligation.id,
          amount: Number(pendingObligation.balanceAmount),
        };
      }

      throw new Error(
        "Voor deze overeenkomst is het vervolgingsproces al gestart",
      );
    }

    const partyB = contract.parties.find((party) => party.role === "PARTY_B");

    if (!partyB) {
      throw new Error("Geen tegenpartij gevonden op deze overeenkomst");
    }

    const { debtor } = await DebtorService.findOrCreate(
      {
        person_type: partyB.person_type,
        identification_type: partyB.identification_type,
        identification: partyB.identification,
        fullname: partyB.fullname,
        email: partyB.email,
        phone: partyB.phone,
        address: partyB.address,
        birth_date: partyB.birth_date,
        birth_place: partyB.birth_place,
      },
      contract.tenant_id,
    );

    const pending = await CollectionService.createPendingFromContract(
      contract,
      debtor.id,
    );

    if (!pending.success || !pending.claimId || !pending.obligationId) {
      throw new Error(pending.error || "Kon het vervolgingsproces niet starten");
    }

    await prisma.contract.update({
      where: { id: contractId },
      data: { debtClaim_id: pending.claimId },
    });

    return {
      claimId: pending.claimId,
      obligationId: pending.obligationId,
      amount: pending.amount ?? 0,
    };
  }
}
