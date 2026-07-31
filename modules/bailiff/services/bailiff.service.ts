import { prisma } from "@/lib/prisma";
import {
  Bailiff,
  BailiffCreate,
  bailiffCreateSchema,
  BailiffUpdate,
} from "@/modules/bailiff/services/bailiff.validators";

export class BailiffService {
  static async create(
    data: BailiffCreate,
    tenantId: string,
  ): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
    try {
      const parsedData = bailiffCreateSchema.parse(data);

      if (!parsedData.fullname || !parsedData.email) {
        throw new Error("Name and email are required");
      }

      const bailiff = await prisma.bailiff.create({
        data: { ...parsedData, tenant_id: tenantId },
      });

      return { success: true, data: bailiff };
    } catch (error) {
      console.error("Error creating bailiff:", error);
      return { success: false, error: "Failed to create bailiff" };
    }
  }

  static async getById(
    id: string,
  ): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
    try {
      if (!id) throw new Error("Bailiff ID is required");

      const bailiff = await prisma.bailiff.findUnique({ where: { id } });

      if (!bailiff) throw new Error("Bailiff not found");

      return { success: true, data: bailiff };
    } catch (error) {
      console.error("Error getting bailiff:", error);
      return { success: false, error: "Failed to get bailiff" };
    }
  }

  static async update(
    id: string,
    data: Partial<BailiffUpdate>,
  ): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
    try {
      if (!id) throw new Error("Bailiff ID is required");

      const { fullname, email, phone } = data;
      const updateData: any = {};
      if (fullname) updateData.fullname = fullname;
      if (email) updateData.email = email;
      if (phone !== null) updateData.phone = phone;

      const bailiff = await prisma.bailiff.update({ where: { id }, data: updateData });

      return { success: true, data: bailiff };
    } catch (error) {
      console.error("Error updating bailiff:", error);
      return { success: false, error: "Failed to update bailiff" };
    }
  }

  static async getAll(tenant_id: string): Promise<Bailiff[]> {
    return prisma.bailiff.findMany({
      where: { tenant_id },
      orderBy: { created_at: "desc" },
    }) as Promise<Bailiff[]>;
  }

  // Directorio platform-wide: cualquier alguacil autorregistrado (plan
  // Deurwaarder) y con la suscripción al día, sin filtrar por tenant — así
  // lo puede elegir cualquier participante al transferir un expediente a GOP.
  static async getAllActive(): Promise<Bailiff[]> {
    return prisma.bailiff.findMany({
      where: { status: "ACTIVE", user_id: { not: null } },
      orderBy: { fullname: "asc" },
    }) as Promise<Bailiff[]>;
  }

  static async getByUserId(
    user_id: string,
  ): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
    try {
      const bailiff = await prisma.bailiff.findFirst({ where: { user_id } });

      if (!bailiff) {
        throw new Error("Alguacil no encontrado para el ID de usuario proporcionado");
      }

      return { success: true, data: bailiff };
    } catch (error) {
      console.error("Error getting bailiff by user ID:", error);
      return { success: false, error: "Error al obtener el alguacil por ID de usuario" };
    }
  }
}
