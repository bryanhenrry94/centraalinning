"use server";
import prisma from "@/lib/prisma";
import {
  DebtorBase,
  DebtorBaseSchema,
  DebtorCreate,
  DebtorCreateSchema,
  IdentificationType,
} from "@/lib/validations/debtor";
import { getUserByEmail } from "@/app/actions/user";
import { roleEnum } from "@/prisma/generated/prisma";

export const getAllDebtorsByTenantId = async (
  tenant_id: string
): Promise<DebtorBase[]> => {
  try {
    const debtors = await prisma.debtor.findMany({
      where: {
        tenant_id,
      },
    });

    return debtors.map((debtor) => debtor as DebtorBase);
  } catch (error) {
    throw new Error("Error fetching debtors");
  }
};

export const getAllDebtors = async (): Promise<DebtorBase[]> => {
  try {
    const debtors = await prisma.debtor.findMany();

    return debtors.map((debtor) => debtor as DebtorBase);
  } catch (error) {
    throw new Error("Error fetching debtors");
  }
};

export const getDebtorById = async (id: string): Promise<DebtorBase | null> => {
  try {
    const debtor = await prisma.debtor.findFirst({
      where: { id },
      include: {
        incomes: true, // Include incomes if needed
      },
    });

    return debtor as DebtorBase | null;
  } catch (error) {
    throw new Error("Error fetching debtor");
  }
};

export const getDebtorByUserId = async (
  user_id: string
): Promise<DebtorBase | null> => {
  try {
    const debtor = await prisma.debtor.findFirst({
      where: { user_id },
      include: {
        incomes: true, // Include incomes if needed
      },
    });

    return debtor as DebtorBase | null;
  } catch (error) {
    throw new Error("Error fetching debtor by user ID");
  }
};

export const createDebtor = async (
  debtor: DebtorCreate,
  tenant_id: string
): Promise<DebtorBase> => {
  try {
    const debtorFormatted = DebtorCreateSchema.parse(debtor);

    if (!debtorFormatted) {
      throw new Error("Invalid debtor data");
    }

    console.log("Creating debtor:", debtorFormatted);

    const newDebtor = await prisma.debtor.create({
      data: {
        identification_type: debtorFormatted.identification_type,
        identification: debtorFormatted.identification || "",
        fullname: debtorFormatted.fullname || "",
        email: debtorFormatted.email || "",
        phone: debtorFormatted.phone || "",
        address: debtorFormatted.address || "",
        person_type: debtorFormatted.person_type || "INDIVIDUAL",
        tenant_id,
        total_income: debtorFormatted.total_income || 0,
        incomes: {
          create: debtorFormatted.incomes?.map((income) => ({
            debtor_id: tenant_id,
            source: income.source,
            amount: income.amount,
          })),
        },
      },
    });

    return newDebtor as DebtorBase;
  } catch (error) {
    console.error("Error creating debtor:", error);
    throw new Error("Error creating debtor");
  }
};

export const updateDebtor = async (
  debtor: DebtorCreate,
  tenant_id: string,
  id: string
): Promise<DebtorBase | null> => {
  try {
    const updatedDebtor = await prisma.$transaction(async (tx) => {
      // Update debtor
      const debtorResult = await tx.debtor.update({
        where: { id },
        data: {
          identification_type:
            (debtor.identification_type as IdentificationType) ||
            IdentificationType.DNI,
          identification: debtor.identification || "",
          fullname: debtor.fullname || "",
          email: debtor.email || "",
          phone: debtor.phone || "",
          address: debtor.address || "",
          person_type: debtor.person_type || "INDIVIDUAL",
          tenant_id,
        },
      });

      // Handle incomes
      const existingIncomes = await tx.debtorIncome.findMany({
        where: { debtor_id: id },
      });

      const incomingIncomes = debtor.incomes ?? [];

      // Delete all incomes for this debtor
      await tx.debtorIncome.deleteMany({
        where: {
          debtor_id: id,
        },
      });

      // Re-create all incomes from incomingIncomes
      for (const income of incomingIncomes) {
        await tx.debtorIncome.create({
          data: {
            debtor_id: id,
            source: income.source,
            amount: income.amount,
          },
        });
      }

      return debtorResult;
    });

    return updatedDebtor as DebtorBase;
  } catch (error) {
    console.error("Error updating debtor:", error);
    throw new Error("Error updating debtor");
  }
};

export const getDebtorInfo = async (
  tenant_id: string,
  identification: string
): Promise<DebtorBase> => {
  const debtor = await prisma.debtor.findFirst({
    where: {
      tenant_id: tenant_id,
      identification: identification,
    },
    include: {
      user: true, // Assuming there is a relation named 'user' in the Prisma schema
    },
  });

  if (!debtor) {
    throw new Error(
      `Debtor with ID ${identification} not found for tenant ${tenant_id}`
    );
  }

  // Validate the debtor data against the schema
  const parsedDebtor = DebtorBaseSchema.parse(debtor);

  // Ensure the return type matches IDebtor
  return parsedDebtor as DebtorBase;
};

export const createDebtorIfNotExists = async (
  tenant_id: string,
  debtor: DebtorCreate
): Promise<DebtorCreate> => {
  let user_id: string | null = null;

  // Check if the debtor already exists
  const existingDebtor = await getDebtorInfo(
    tenant_id,
    debtor.identification ?? ""
  ).catch(() => null);

  if (existingDebtor) {
    throw new Error(
      `Debtor with identification ${debtor.identification} already exists`
    );
  }

  if (await validaEmailDebtorUserExist(debtor.email || "", tenant_id, "")) {
    throw new Error(`A user with email ${debtor.email} already exists`);
  }

  const userExist = await getUserByEmail(debtor.email);

  if (!userExist) {
    const newUser = await prisma.user.create({
      data: {
        email: debtor.email,
        fullname: debtor.fullname,
        phone: debtor.phone,
        tenant_id: tenant_id,
        role: roleEnum.DEBTOR,
        is_active: true,
      },
    });

    user_id = newUser.id;
  } else {
    user_id = userExist.id;
  }

  // Create the debtor and link it to the user
  const newDebtor = await prisma.debtor.create({
    data: {
      tenant_id: tenant_id,
      identification: debtor.identification,
      user_id: user_id, // Assuming the debtor has a user_id field to link to the user
      fullname: debtor.fullname,
      email: debtor.email,
      phone: debtor.phone,
      address: debtor.address,
      identification_type: debtor.identification_type as IdentificationType,
      person_type: debtor.person_type,
    },
  });

  // Validate the debtor data against the schema
  const parsedDebtor = DebtorBaseSchema.parse(newDebtor);

  // Ensure the return type matches IDebtor
  return parsedDebtor as DebtorBase;
};

export const validaEmailDebtorUserExist = async (
  email: string,
  tenant_id: string,
  debtor_id: string
): Promise<boolean> => {
  if (email) {
    // Busca el usuario por email y tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      // Busca si existe un deudor relacionado con ese usuario en el tenant
      const existingDebtor = await prisma.debtor.findFirst({
        where: {
          tenant_id: tenant_id,
          user_id: existingUser.id,
          NOT: debtor_id ? { id: debtor_id } : undefined,
        },
      });

      if (existingDebtor) {
        return true;
      }
    }
  }
  return false;
};

export const sendFinancialSummaryEmail = async (
  debtor_id: string
): Promise<boolean> => {
  try {
    const debtor = await prisma.debtor.findUnique({
      where: { id: debtor_id },
    });

    if (!debtor) return false;

    if (debtor.email) {
      const debtorEmail = debtor.email;
      const subject = `Financieel overzicht - ${new Date().getFullYear()}`;

      const dataMail = {
        recipientName: debtor?.fullname || "Dear User",
        currentYear: new Date().getFullYear(),
      };

      console.log("notificacion de debtor enviada al correo: ", debtorEmail);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error sending mail notification:", error);
    return false;
  }
};

export const getAllDebts = async (
  debtor_id: string
): Promise<{ success: boolean; data?: any[]; message?: string }> => {
  try {
    const collections = await prisma.collectionCase.findMany({
      where: {
        debtor_id: debtor_id,
      },
    });

    const verdicts = await prisma.verdict.findMany({
      where: {
        debtor_id: debtor_id,
      },
    });

    const debts: any[] = [];

    collections.forEach((collection) => {
      debts.push({
        type: "Buitengerechtelijk",
        id: collection.id,
        reference: collection.reference_number,
        issueDate: collection.issue_date
          ? collection.issue_date.toISOString()
          : null,
        dueDate: collection.due_date ? collection.due_date.toISOString() : null,
        amount: collection.total_due ? Number(collection.total_due) : 0,
        status: collection.status,
        created_at: collection.created_at
          ? collection.created_at.toISOString()
          : null,
      });
    });

    verdicts.forEach((verdict) => {
      debts.push({
        type: "Vonnis",
        id: verdict.id,
        reference: verdict.registration_number,
        issueDate: verdict.sentence_date
          ? verdict.sentence_date.toISOString()
          : null,
        dueDate: verdict.sentence_date
          ? verdict.sentence_date.toISOString()
          : null,
        amount: verdict.sentence_amount ? Number(verdict.sentence_amount) : 0,
        status: verdict.status,
        created_at: verdict.created_at
          ? verdict.created_at.toISOString()
          : null,
      });
    });

    // Sort debts by created_at date descending
    debts.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { success: true, data: debts };
  } catch (error) {
    console.error("Error fetching debts:", error);
    return { success: false, message: "Error fetching debts" };
  }
};
