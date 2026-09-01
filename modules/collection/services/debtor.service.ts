import { prisma } from "@/lib/prisma";
import {
  DebtorInput,
  DebtorCreate,
  DebtorPickerResponse,
  DebtorResponse,
  DebtorSearchParams,
} from "./debtor.type";
import {
  DebtorResponseSchema,
  DebtorSchema,
  DebtorCreateSchema,
} from "./debtor.validators";
import { Prisma } from "@prisma/client";
import { IdentificationType } from "@/shared/constants/identification-type";
import { PersonType } from "@/shared/constants/person-type";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { PersonService } from "@/modules/collection/services/person.service";

interface FindOrCreateDebtorParams {
  person_type: string;
  identification_type: string;
  identification: string;
  fullname: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  birth_date?: Date | null;
  birth_place?: string | null;
}

export class DebtorService {
  static findOrCreate = async (
    debtorData: FindOrCreateDebtorParams,
    tenant_id: string,
  ) => {
    return prisma.$transaction(async (tx) => {
      // 1. Buscar persona existente. `Person.email` es único en el schema,
      // así que además de la identificación hay que buscar por email: si no
      // se hace, dos registros con la misma identificación mal tipeada pero
      // el mismo correo terminan chocando contra `person_email_key` al
      // intentar crear una persona "nueva" que en realidad ya existe.
      let person = await tx.person.findFirst({
        where: {
          OR: [
            {
              identification_type: debtorData.identification_type as any,
              identification: debtorData.identification,
            },
            ...(debtorData.email ? [{ email: debtorData.email }] : []),
          ],
        },
      });

      // 2. Crear persona si no existe
      if (!person) {
        const names = debtorData.fullname.trim().split(" ");
        const tenant = await tx.tenant.findUnique({ where: { id: tenant_id } });
        const jurisdictionId =
          tenant?.jurisdictionId ?? (await PersonService.resolveDefaultJurisdictionId());
        const personal_number = await PersonService.generatePersonalNumber(
          debtorData.person_type,
          tx,
        );

        person = await tx.person.create({
          data: {
            person_type: debtorData.person_type as any,
            first_name: names[0] ?? "",
            last_name: names.slice(1).join(" "),
            identification_type: debtorData.identification_type as any,
            identification: debtorData.identification,
            email: debtorData.email,
            phone: debtorData.phone,
            address: debtorData.address,
            birth_date: debtorData.birth_date,
            birth_place: debtorData.birth_place,
            country_code: tenant?.country_code,
            jurisdictionId,
            personal_number,
          },
        });
      }

      // 3. Buscar deudor asociado a esa persona
      let debtor = await tx.debtor.findFirst({
        where: {
          person_id: person.id,
          tenant_id,
        },
      });

      // 4. Crear deudor si no existe
      if (!debtor) {
        debtor = await tx.debtor.create({
          data: {
            person_id: person.id,
            email: debtorData.email,
            total_income: 0,
            tenant_id: tenant_id,
          },
        });
      }

      return {
        person,
        debtor,
      };
    });
  };

  static getAll = async (tenant_id: string): Promise<DebtorResponse[]> => {
    try {
      const debtors = await prisma.debtor.findMany({
        where: {
          tenant_id,
        },
        include: {
          person: true,
          user: true,
        },
      });

      const debtorsParsed: DebtorResponse[] = debtors.map((debtor) =>
        DebtorResponseSchema.parse({
          id: debtor.id,
          tenant_id: debtor.tenant_id,
          person_id: debtor.person_id,
          user_id: debtor.user_id,
          email: debtor.email,
          total_income: debtor.total_income,
          person: debtor.person
            ? {
                person_type: debtor.person.person_type as
                  | "INDIVIDUAL"
                  | "COMPANY",
                identification_type: debtor.person.identification_type as
                  | "KVK"
                  | "CEDULA"
                  | "PASSPORT"
                  | "RIJBEWIJS",
                identification: debtor.person.identification,
                id: debtor.person.id,
                first_name: debtor.person.first_name,
                last_name: debtor.person.last_name,
                business_name: debtor.person.business_name,
              }
            : undefined,
          user: debtor.user
            ? {
                id: debtor.user.id,
                email: debtor.user.email,
                created_at: debtor.user.created_at,
                updated_at: debtor.user.updated_at,
                password_hash: debtor.user.password_hash,
                fullname: debtor.user.fullname,
                phone: debtor.user.phone,
                is_active: debtor.user.is_active,
              }
            : undefined,
        }),
      );

      return debtorsParsed;
    } catch (error) {
      console.error("Error fetching debtors:", error);
      throw new Error("Error fetching debtors");
    }
  };

  static async getAllByTenantId(tenant_id: string): Promise<DebtorResponse[]> {
    const debtors = await prisma.debtor.findMany({
      where: { tenant_id },
      include: { person: true },
    });
    return debtors.map((d: any) =>
      DebtorResponseSchema.parse(d),
    ) as DebtorResponse[];
  }

  static async getAllDebtors(): Promise<DebtorInput[]> {
    const debtors = await prisma.debtor.findMany();
    return debtors.map((d: any) => d as DebtorInput);
  }

  static async getById(id: string): Promise<DebtorInput | null> {
    const debtor = await prisma.debtor.findFirst({
      where: { id },
      include: { incomes: true },
    });
    return debtor as DebtorInput | null;
  }

  static async getByUserId(
    user_id: string,
    tenant_id: string,
  ): Promise<DebtorInput | null> {
    const debtor = await prisma.debtor.findFirst({
      where: { user_id, tenant_id },
      include: { incomes: true },
    });
    return debtor as DebtorInput | null;
  }

  static async getPersonalNumberByUserId(
    user_id: string,
    tenant_id: string,
  ): Promise<string | null> {
    const debtor = await prisma.debtor.findFirst({
      where: { user_id, tenant_id },
      include: { person: { select: { personal_number: true } } },
    });
    return debtor?.person?.personal_number ?? null;
  }

  static async create(
    debtor: DebtorCreate,
    tenant_id: string,
  ): Promise<{ success: boolean; error?: string; data?: DebtorInput }> {
    try {
      const debtorFormatted = DebtorCreateSchema.parse(debtor);

      const existingPerson = await prisma.person.findFirst({
        where: { identification: debtorFormatted.person?.identification },
      });

      if (!existingPerson) {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
        const jurisdictionId =
          tenant?.jurisdictionId ?? (await PersonService.resolveDefaultJurisdictionId());
        const personal_number = await PersonService.generatePersonalNumber(
          debtorFormatted.person?.person_type ?? "INDIVIDUAL",
        );

        const newPerson = await prisma.person.create({
          data: {
            person_type: debtorFormatted.person?.person_type as PersonType,
            identification_type:
              debtorFormatted.person?.identification_type ||
              IdentificationType.CEDULA,
            identification: debtorFormatted.person?.identification || "",
            first_name: debtorFormatted.person?.first_name || "",
            last_name: debtorFormatted.person?.last_name || "",
            business_name: debtorFormatted.person?.business_name || "",
            address: debtorFormatted.person?.address || "",
            phone: debtorFormatted.person?.phone || "",
            country_code: tenant?.country_code,
            jurisdictionId,
            personal_number,
          },
        });

        const newDebtor = await prisma.debtor.create({
          data: {
            tenant_id,
            person_id: newPerson.id,
            email: debtorFormatted.email,
            total_income: debtorFormatted.total_income || 0,
          },
        });

        return { success: true, data: newDebtor };
      } else {
        const existingDebtor = await prisma.debtor.findFirst({
          where: { tenant_id, person_id: existingPerson.id },
        });

        if (existingDebtor) {
          return { success: false, error: "Debtor already exists" };
        }

        const newDebtor = await prisma.debtor.create({
          data: {
            tenant_id,
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
  }

  static async update(
    debtor: DebtorCreate,
    tenant_id: string,
    id: string,
  ): Promise<{ success: boolean; error?: string; data?: DebtorInput }> {
    try {
      const updatedDebtor = await prisma.$transaction(async (tx: any) => {
        const debtorResult = await tx.debtor.update({
          where: { id },
          data: { person_id: debtor.person_id, tenant_id },
          include: { person: true },
        });

        await tx.person.update({
          where: { id: debtorResult.person_id },
          data: {
            first_name: debtor.person?.first_name,
            last_name: debtor.person?.last_name,
            business_name: debtor.person?.business_name,
            identification: debtor.person?.identification,
            identification_type: debtor.person
              ? (debtor.person.identification_type as IdentificationType)
              : undefined,
            person_type: debtor.person
              ? (debtor.person.person_type as PersonType)
              : undefined,
            address: debtor.person?.address,
            phone: debtor.person?.phone,
            email: debtor.email,
          },
        });

        await tx.debtorIncome.deleteMany({ where: { debtor_id: id } });

        for (const income of debtor.incomes ?? []) {
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
  }

  static async getInfo(
    tenant_id: string,
    identification: string,
  ): Promise<DebtorInput> {
    const debtor = await prisma.debtor.findFirst({
      where: { tenant_id, person: { identification } },
      include: { user: true },
    });

    if (!debtor) {
      throw new Error(
        `Debtor with identification ${identification} not found for tenant ${tenant_id}`,
      );
    }

    return DebtorSchema.parse(debtor) as DebtorInput;
  }

  static async emailDebtorUserExists(
    email: string,
    tenant_id: string,
    debtor_id: string,
  ): Promise<boolean> {
    if (!email) return false;

    const existingUser = await prisma.user.findFirst({ where: { email } });

    if (!existingUser) return false;

    const existingDebtor = await prisma.debtor.findFirst({
      where: {
        tenant_id,
        user_id: existingUser.id,
        NOT: debtor_id ? { id: debtor_id } : undefined,
      },
    });

    return !!existingDebtor;
  }

  static async getDebts(filters: {
    tenant_id?: string;
    debtor_id?: string;
    person_id?: string;
  }): Promise<{ success: boolean; data?: DebtorSummary[]; message?: string }> {
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
      // if (filters.person_id) {
      //   whereClauses.push(`person_id = ?`);
      //   params.push(filters.person_id);
      // }

      const whereSQL =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
      const query = `SELECT * FROM vw_debtor_summary ${whereSQL}`;

      const raw = (await prisma.$queryRawUnsafe(query, ...params)) as any[];

      const summary = raw.map((row) => {
        const result: any = {};
        for (const key of Object.keys(row)) {
          const value = row[key];
          result[key] =
            value && typeof value === "object" && "toNumber" in value
              ? value.toNumber()
              : value;
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
  }

  static async searchPicker(
    tenant_id: string,
    params: DebtorSearchParams,
  ): Promise<DebtorPickerResponse> {
    const { q, page, pageSize } = params;

    const where: Prisma.DebtorWhereInput = {
      tenant_id,
    };

    if (q?.trim()) {
      where.OR = [
        {
          person: {
            first_name: {
              contains: q.trim(),
            },
          },
        },
        {
          person: {
            last_name: {
              contains: q.trim(),
            },
          },
        },
        {
          person: {
            identification: {
              contains: q.trim(),
            },
          },
        },
        {
          person: {
            phone: {
              contains: q.trim(),
            },
          },
        },
        {
          person: {
            address: {
              contains: q.trim(),
            },
          },
        },
        {
          person: {
            email: {
              contains: q.trim(),
            },
          },
        },
      ];
    }

    const [persons, total] = await prisma.$transaction([
      prisma.debtor.findMany({
        where,
        orderBy: {
          person: {
            first_name: "asc",
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          person: true,
        },
      }),

      prisma.debtor.count({
        where,
      }),
    ]);

    return {
      data: persons,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }
}
