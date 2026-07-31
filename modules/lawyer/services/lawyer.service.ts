import { prisma } from "@/lib/prisma";
import {
  Lawyer,
  LawyerCreate,
  lawyerCreateSchema,
  LawyerUpdate,
} from "@/modules/lawyer/services/lawyer.validators";

export class LawyerService {
  static async create(
    data: LawyerCreate,
    tenantId: string,
  ): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
    try {
      const parsedData = lawyerCreateSchema.parse(data);

      if (!parsedData.firstName || !parsedData.lastName) {
        throw new Error("First name and last name are required");
      }

      const lawyer = await prisma.lawyer.create({
        data: { ...parsedData, tenantId },
      });

      return { success: true, data: lawyer as Lawyer };
    } catch (error) {
      console.error("Error creating lawyer:", error);
      return { success: false, error: "Failed to create lawyer" };
    }
  }

  static async getById(
    id: string,
  ): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
    try {
      if (!id) throw new Error("Lawyer ID is required");

      const lawyer = await prisma.lawyer.findUnique({ where: { id } });

      if (!lawyer) throw new Error("Lawyer not found");

      return { success: true, data: lawyer as Lawyer };
    } catch (error) {
      console.error("Error getting lawyer:", error);
      return { success: false, error: "Failed to get lawyer" };
    }
  }

  static async update(
    id: string,
    data: Partial<LawyerUpdate>,
  ): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
    try {
      if (!id) throw new Error("Lawyer ID is required");

      const {
        firstName,
        lastName,
        companyName,
        identification,
        barRegistration,
        email,
        phone,
        mobile,
        address,
        city,
        country,
        status,
        notes,
        userId,
      } = data;

      const updateData: Partial<LawyerUpdate> = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (companyName !== undefined) updateData.companyName = companyName;
      if (identification !== undefined) updateData.identification = identification;
      if (barRegistration !== undefined) updateData.barRegistration = barRegistration;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (mobile !== undefined) updateData.mobile = mobile;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (country !== undefined) updateData.country = country;
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (userId !== undefined) updateData.userId = userId;

      const lawyer = await prisma.lawyer.update({
        where: { id },
        data: updateData,
      });

      return { success: true, data: lawyer as Lawyer };
    } catch (error) {
      console.error("Error updating lawyer:", error);
      return { success: false, error: "Failed to update lawyer" };
    }
  }

  static async getAll(tenant_id: string): Promise<Lawyer[]> {
    return prisma.lawyer.findMany({
      where: { tenantId: tenant_id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }) as Promise<Lawyer[]>;
  }

  // Directorio platform-wide: cualquier abogado autorregistrado (plan
  // Advocaat) y con la suscripción al día, sin filtrar por tenant — así lo
  // puede elegir cualquier participante al transferir un expediente a GOP.
  static async getAllActive(): Promise<Lawyer[]> {
    return prisma.lawyer.findMany({
      where: { status: "ACTIVE", userId: { not: null }, deletedAt: null },
      orderBy: { firstName: "asc" },
    }) as Promise<Lawyer[]>;
  }

  static async getByUserId(
    user_id: string,
  ): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
    try {
      const lawyer = await prisma.lawyer.findFirst({ where: { userId: user_id } });

      if (!lawyer) {
        throw new Error("Abogado no encontrado para el ID de usuario proporcionado");
      }

      return { success: true, data: lawyer as Lawyer };
    } catch (error) {
      console.error("Error getting lawyer by user ID:", error);
      return { success: false, error: "Error al obtener el abogado por ID de usuario" };
    }
  }
}
