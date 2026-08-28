import { prisma } from "@/lib/prisma";
import {
  Bailiff,
  BailiffUpdate,
} from "@/modules/bailiff/services/bailiff.validators";

export class BailiffService {
  static async getById(
    id: string,
  ): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
    try {
      if (!id) throw new Error("Deurwaarder-ID is verplicht");

      const bailiff = await prisma.bailiff.findUnique({ where: { id } });

      if (!bailiff) throw new Error("Deurwaarder niet gevonden");

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
      if (!id) throw new Error("Deurwaarder-ID is verplicht");

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

  // Registro completo para CFSB Admin — a diferencia de getAllActive (solo
  // ACTIVE con user_id), acá se listan todos los alguaciles sin filtrar.
  static async getAllForAdmin(): Promise<Bailiff[]> {
    return prisma.bailiff.findMany({
      orderBy: { created_at: "desc" },
    }) as Promise<Bailiff[]>;
  }

  static async getByUserId(
    user_id: string,
  ): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
    try {
      const bailiff = await prisma.bailiff.findFirst({ where: { user_id } });

      if (!bailiff) {
        throw new Error("Geen deurwaarder gevonden voor de opgegeven gebruikers-ID");
      }

      return { success: true, data: bailiff };
    } catch (error) {
      console.error("Error getting bailiff by user ID:", error);
      return { success: false, error: "Fout bij het ophalen van de deurwaarder via gebruikers-ID" };
    }
  }
}
