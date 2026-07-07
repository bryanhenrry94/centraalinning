"use server";
import { prisma } from "@/lib/prisma";
import { DebtClaim, DebtClaimSchema, DebtClaimView } from "@/lib/validations/collection";
import { DebtClaimFilter } from "@/services/collection/collection.type";
import { CollectionService } from "@/services/collection/collection.service";

function toDebtClaim(raw: any): DebtClaim {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    debtorId: raw.debtorId,
    reference: raw.reference,
    description: raw.description,
    principalAmount: Number(raw.principalAmount),
    currentAmount: Number(raw.currentAmount),
    currency: raw.currency,
    origin: raw.origin,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    closedAt: raw.closedAt,
  };
}

export const getDebtClaimById = async (id: string): Promise<DebtClaim> => {
  const claim = await prisma.debtClaim.findUnique({ where: { id } });
  if (!claim) throw new Error("DebtClaim not found");
  return toDebtClaim(claim);
};

export const getDebtClaimViewById = async (id: string): Promise<DebtClaimView> => {
  const claim = await prisma.debtClaim.findUnique({
    where: { id },
    include: { debtor: { include: { person: true } } },
  });
  if (!claim) throw new Error("DebtClaim not found");

  return {
    ...toDebtClaim(claim),
    debtor: {
      id: claim.debtor.id,
      fullname:
        `${claim.debtor.person?.first_name ?? ""} ${claim.debtor.person?.last_name ?? ""}`.trim() ||
        claim.debtor.person?.business_name ||
        "",
      email: claim.debtor.email ?? "",
    },
  };
};

export const updateDebtClaim = async (
  id: string,
  data: Partial<DebtClaim>,
) => {
  const parsedData = DebtClaimSchema.partial().parse(data);
  const { id: _id, ...rest } = parsedData as any;
  const filtered = Object.fromEntries(
    Object.entries(rest).filter(([_, v]) => v !== undefined),
  );
  return prisma.debtClaim.update({ where: { id }, data: filtered });
};

export const advanceAOPStep = async (debtClaimId: string) => {
  const aop = await prisma.administrativeCollection.findUnique({
    where: { debtClaimId },
    include: {
      steps: { orderBy: { id: "desc" }, take: 1 },
      debtClaim: { include: { debtor: { include: { person: true } } } },
    },
  });

  if (!aop) throw new Error("AdministrativeCollection not found");

  const currentStep = aop.steps[0];

  const stepSequence = [
    "REMINDER",
    "FINAL_NOTICE",
    "DEFAULT_NOTICE",
    "BLK_NOTIFICATION",
  ] as const;

  const nextStepMap: Record<string, (typeof stepSequence)[number] | null> = {
    REMINDER: "FINAL_NOTICE",
    FINAL_NOTICE: "DEFAULT_NOTICE",
    DEFAULT_NOTICE: "BLK_NOTIFICATION",
    BLK_NOTIFICATION: null,
  };

  const nextStep = currentStep ? nextStepMap[currentStep.step] : "REMINDER";

  await prisma.$transaction(async (tx) => {
    if (currentStep) {
      await tx.administrativeCollectionStep.update({
        where: { id: currentStep.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    if (nextStep) {
      await tx.administrativeCollectionStep.create({
        data: {
          collectionId: aop.id,
          step: nextStep,
          sentAt: new Date(),
          status: "IN_PROGRESS",
        },
      });
    } else {
      await tx.administrativeCollection.update({
        where: { id: aop.id },
        data: { status: "CLOSED", finishedAt: new Date() },
      });
    }

    if (nextStep === "BLK_NOTIFICATION" || (!nextStep && currentStep?.step === "DEFAULT_NOTICE")) {
      const personId = aop.debtClaim.debtor.person?.id;
      if (personId) {
        await tx.person.update({
          where: { id: personId },
          data: { has_blockade: true },
        });
      }
    }

    await tx.claimTimeline.create({
      data: {
        debtClaimId,
        event: nextStep ? "AOP_STEP_COMPLETED" : "AOP_COMPLETED",
        description: nextStep
          ? `Stap ${currentStep?.step ?? "start"} voltooid, volgende: ${nextStep}`
          : "AOP-proces afgerond",
      },
    });
  });
};

export async function getDebtClaimsAction(params: DebtClaimFilter) {
  return CollectionService.getAll(params);
}
