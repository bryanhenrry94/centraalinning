"use server";
import prisma from "@/lib/prisma";
import {
  DebtorBase,
  DebtorBaseSchema,
  DebtorCreate,
  DebtorCreateSchema,
  DebtorResponse,
  DebtorResponseSchema,
} from "@/lib/validations/debtor";
import { $Enums } from "@prisma/client";
import { DebtorSummary } from "@/types/DebtorSummary";

export const getAllDebtorsByTenantId = async (
  tenant_id: string,
): Promise<DebtorResponse[]> => {
  try {
    const debtors = await prisma.debtor.findMany({
      where: {
        tenant_id,
      },
      include: {
        person: true,
      },
    });

    const debtorsParsed = debtors.map((debtor) =>
      DebtorResponseSchema.parse(debtor),
    ) as DebtorResponse[];

    console.log("Debtors parsed:", debtorsParsed);

    return debtorsParsed;
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
  user_id: string,
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
  tenant_id: string,
): Promise<{ success: boolean; error?: string; data?: DebtorBase }> => {
  try {
    const debtorFormatted = DebtorCreateSchema.parse(debtor);

    if (!debtorFormatted) {
      throw new Error("Invalid debtor data");
    }

    console.log("Creating debtor:", debtorFormatted);

    // valida si existe la persona con el mismo identification en el tenant
    const existingPerson = await prisma.person.findFirst({
      where: {
        identification: debtorFormatted.person?.identification,
      },
    });

    if (!existingPerson) {
      // Crear la persona si no existe
      const newPerson = await prisma.person.create({
        data: {
          person_type: debtorFormatted.person?.person_type as $Enums.PersonType,
          identification_type:
            debtorFormatted.person?.identification_type || "DNI",
          identification: debtorFormatted.person?.identification || "",
          first_name: debtorFormatted.person?.first_name || "",
          last_name: debtorFormatted.person?.last_name || "",
          business_name: debtorFormatted.person?.business_name || "",
          address: debtorFormatted.person?.address || "",
          phone: debtorFormatted.person?.phone || "",
        },
      });

      const newDebtor = await prisma.debtor.create({
        data: {
          tenant_id: tenant_id,
          person_id: newPerson.id,
          email: debtorFormatted.email,
          total_income: debtorFormatted.total_income || 0,
        },
      });

      return { success: true, data: newDebtor };
    } else {
      // Si la persona ya existe consultar si el deudor ya existe
      const existingDebtor = await prisma.debtor.findFirst({
        where: {
          tenant_id: tenant_id,
          person_id: existingPerson.id,
        },
      });

      if (existingDebtor) {
        return {
          success: false,
          error: "Debtor already exists",
        };
      }

      // Crear el deudor asociado a la persona existente
      const newDebtor = await prisma.debtor.create({
        data: {
          tenant_id: tenant_id,
          person_id: existingPerson.id,
          email: debtorFormatted.email,
          total_income: debtorFormatted.total_income || 0,
        },
      });

      return { success: true, data: newDebtor };
    }
  } catch (error) {
    console.error("Error creating debtor:", error);
    return { success: false, error: "Error creating debtor" };
  }
};

export const updateDebtor = async (
  debtor: DebtorCreate,
  tenant_id: string,
  id: string,
): Promise<{ success: boolean; error?: string; data?: DebtorBase }> => {
  try {
    const updatedDebtor = await prisma.$transaction(async (tx) => {
      // Update debtor
      const debtorResult = await tx.debtor.update({
        where: { id },
        data: {
          person_id: debtor.person_id,
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

    return { success: true, data: updatedDebtor };
  } catch (error) {
    console.error("Error updating debtor:", error);
    return { success: false, error: "Error updating debtor" };
  }
};

export const getDebtorInfo = async (
  tenant_id: string,
  identification: string,
): Promise<DebtorBase> => {
  const debtor = await prisma.debtor.findFirst({
    where: {
      tenant_id: tenant_id,
      person: {
        identification: identification,
      },
    },
    include: {
      user: true, // Assuming there is a relation named 'user' in the Prisma schema
    },
  });

  if (!debtor) {
    throw new Error(
      `Debtor with ID ${identification} not found for tenant ${tenant_id}`,
    );
  }

  // Validate the debtor data against the schema
  const parsedDebtor = DebtorBaseSchema.parse(debtor);

  // Ensure the return type matches IDebtor
  return parsedDebtor as DebtorBase;
};

export const createDebtorIfNotExists = async (
  tenant_id: string,
  debtor: DebtorCreate,
): Promise<DebtorCreate | null> => {
  return null;

  // let user_id: string | null = null;

  // // Check if the debtor already exists
  // const existingDebtor = await getDebtorInfo(
  //   tenant_id,
  //   debtor.identification ?? ""
  // ).catch(() => null);

  // if (existingDebtor) {
  //   throw new Error(
  //     `Debtor with identification ${debtor.identification} already exists`
  //   );
  // }

  // if (await validaEmailDebtorUserExist(debtor.email || "", tenant_id, "")) {
  //   throw new Error(`A user with email ${debtor.email} already exists`);
  // }

  // const userExist = await getUserByEmail(debtor.email);

  // if (!userExist) {
  //   // const newUser = await prisma.user.create({
  //   //   data: {
  //   //     email: debtor.email,
  //   //     fullname: debtor.fullname,
  //   //     phone: debtor.phone,
  //   //     tenant_id: tenant_id,
  //   //     role: UserRole.DEBTOR,
  //   //     is_active: true,
  //   //   },
  //   // });
  //   // user_id = newUser.id;
  // } else {
  //   user_id = userExist.id;
  // }

  // // Create the debtor and link it to the user
  // const newDebtor = await prisma.debtor.create({
  //   data: {
  //     tenant_id: tenant_id,
  //     identification: debtor.identification,
  //     user_id: user_id, // Assuming the debtor has a user_id field to link to the user
  //     fullname: debtor.fullname,
  //     email: debtor.email,
  //     phone: debtor.phone,
  //     address: debtor.address,
  //     identification_type: debtor.identification_type as IdentificationType,
  //     person_type: debtor.person_type,
  //   },
  // });

  // // Validate the debtor data against the schema
  // const parsedDebtor = DebtorBaseSchema.parse(newDebtor);

  // // Ensure the return type matches IDebtor
  // return parsedDebtor as DebtorBase;
};

export const validaEmailDebtorUserExist = async (
  email: string,
  tenant_id: string,
  debtor_id: string,
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
  debtor_id: string,
): Promise<boolean> => {
  try {
    const debtor = await prisma.debtor.findUnique({
      where: { id: debtor_id },
      include: { person: true },
    });

    if (!debtor) return false;

    if (debtor.email) {
      const debtorEmail = debtor.email;
      const subject = `Financieel overzicht - ${new Date().getFullYear()}`;

      const dataMail = {
        recipientName: debtor?.person?.first_name || "Dear User",
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

interface DebtFilters {
  tenant_id?: string;
  debtor_id?: string;
  person_id?: string;
}

export const getDebts = async (
  filters: DebtFilters,
): Promise<{ success: boolean; data?: DebtorSummary[]; message?: string }> => {
  try {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.tenant_id) {
      whereClauses.push(`tenant_id = ?`);
      params.push(filters.tenant_id);
    }

    if (filters.debtor_id) {
      whereClauses.push(`debtor_id = ?`);
      params.push(filters.debtor_id);
    }

    if (filters.person_id) {
      whereClauses.push(`person_id = ?`);
      params.push(filters.person_id);
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
      SELECT * 
      FROM vw_debtor_summary
      ${whereSQL}
    `;

    const raw = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const summary = raw.map((row) => {
      const result: any = {};

      for (const key of Object.keys(row)) {
        const value = row[key];

        if (value && typeof value === "object" && "toNumber" in value) {
          result[key] = value.toNumber();
        } else {
          result[key] = value;
        }
      }

      return result;
    });

    summary.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error fetching debts:", error);
    return { success: false, message: "Error fetching debts" };
  }
};
