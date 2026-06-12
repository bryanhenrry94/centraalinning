import { prisma } from "@/lib/prisma";
import { DebtorResponse } from "./debtor.type";
import { DebtorResponseSchema } from "./debtor.validators";

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
      // 1. Buscar persona existente
      let person = await tx.person.findFirst({
        where: {
          identification_type: debtorData.identification_type as any,
          identification: debtorData.identification,
        },
      });

      // 2. Crear persona si no existe
      if (!person) {
        const names = debtorData.fullname.trim().split(" ");

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
            has_blockade: false,
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
}
