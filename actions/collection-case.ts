"use server";
import { prisma } from "@/lib/prisma";

import {
  CollectionCase,
  CollectionCaseResponse,
  CollectionCaseSchema,
  CollectionCaseView,
} from "@/lib/validations/collection";
import { CollectionNotificationService } from "@/services/collection/collection-notification.service";
import { CollectionCaseStatus } from "@/constants/collection-case-status";
import { CollectionCaseFilter } from "@/services/collection/collection.type";
import { CollectionService } from "@/services/collection/collection.service";

export const getCollectionById = async (
  id: string,
): Promise<CollectionCase> => {
  const collection = await prisma.collectionCase.findUnique({
    where: { id },
  });
  if (!collection) throw new Error("Collection not found");

  return {
    id: collection.id,
    reference_number: collection.reference_number || "",
    document_number: collection.document_number || "",
    issue_date: collection.issue_date,
    due_date: collection.due_date,
    tenant_id: collection.tenant_id,
    debtor_id: collection.debtor_id,
    amount_original: collection.amount_original.toNumber(),
    fee_rate: collection.fee_rate.toNumber(),
    fee_amount: collection.fee_amount.toNumber(),
    abb_rate: collection.abb_rate.toNumber(),
    abb_amount: collection.abb_amount.toNumber(),
    total_fined: collection.total_fined.toNumber(),
    total_due: collection.total_due.toNumber(),
    total_to_receive: collection.total_to_receive.toNumber(),
    total_paid: collection.total_paid.toNumber(),
    balance: collection.balance.toNumber(),
    status: collection.status as CollectionCaseStatus,
    created_at: collection.created_at,
    updated_at: collection.updated_at,
  };
};

export const getCollectionViewById = async (
  id: string,
): Promise<CollectionCaseView> => {
  const collection = await prisma.collectionCase.findUnique({
    where: { id },
    include: { debtor: { include: { person: true } } },
  });
  if (!collection) throw new Error("Collection not found");

  return {
    ...collection,
    id: collection.id,
    reference_number: collection.reference_number || "",
    document_number: collection.document_number || "",
    issue_date: collection.issue_date,
    due_date: collection.due_date,
    tenant_id: collection.tenant_id,
    debtor_id: collection.debtor_id,
    amount_original: collection.amount_original.toNumber(),
    fee_rate: collection.fee_rate.toNumber(),
    fee_amount: collection.fee_amount.toNumber(),
    abb_rate: collection.abb_rate.toNumber(),
    abb_amount: collection.abb_amount.toNumber(),
    total_fined: collection.total_fined.toNumber(),
    total_due: collection.total_due.toNumber(),
    total_to_receive: collection.total_to_receive.toNumber(),
    total_paid: collection.total_paid.toNumber(),
    balance: collection.balance.toNumber(),
    status: collection.status as CollectionCaseStatus,
    created_at: collection.created_at,
    updated_at: collection.updated_at,
    debtor: {
      id: collection.debtor?.id ?? "",
      fullname:
        (collection.debtor.person?.first_name +
          " " +
          collection.debtor.person?.last_name ||
          collection.debtor?.person?.business_name) ??
        "",
      email: collection.debtor?.email ?? "",
    },
  };
};

export const updateCollection = async (
  id: string,
  data: Partial<typeof CollectionCaseSchema>,
) => {
  const parsedData = CollectionCaseSchema.partial().parse(data);

  // Exclude 'id' from update data
  const { id: _id, ...updateData } = parsedData;

  // Remove undefined properties to match Prisma types
  const filteredUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined),
  );
  const updatedCollection = await prisma.collectionCase.update({
    where: { id },
    data: filteredUpdateData,
  });
  return updatedCollection;
};

export const updateCollectionStatusAndSendNotification = async (
  id: string,
  status: CollectionCaseStatus,
) => {
  await prisma.collectionCase.update({
    where: {
      id: id,
    },
    data: {
      status: status,
    },
  });

  if (status === CollectionCaseStatus.BLOKKADE) {
    // Actualiza la tabla person y cambia el estado de has_blockade a true
    const collectionCase = await prisma.collectionCase.findUnique({
      where: { id },
      include: {
        debtor: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!collectionCase) {
      console.error(`Collection case with ID ${id} not found.`);
      return;
    }

    const personId = collectionCase.debtor?.person?.id;

    if (!personId) {
      console.error(
        `Person associated with collection case ID ${id} not found.`,
      );
      return;
    }

    await prisma.person.update({
      where: { id: personId },
      data: { has_blockade: true },
    });
  }

  await CollectionNotificationService.sendNotification(id);
};

export async function getCollectionsAction(params: CollectionCaseFilter) {
  return CollectionService.getAll(params);
}
