import { prisma } from "@/lib/prisma";
import {
  Lawyer,
  LawyerUpdate,
} from "@/modules/lawyer/services/lawyer.validators";

export class LawyerService {
  static async getById(
    id: string,
  ): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
    try {
      if (!id) throw new Error("Advocaat-ID is verplicht");

      const lawyer = await prisma.lawyer.findUnique({ where: { id } });

      if (!lawyer) throw new Error("Advocaat niet gevonden");

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
      if (!id) throw new Error("Advocaat-ID is verplicht");

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

  // Registro completo para CFSB Admin — a diferencia de getAllActive (solo
  // ACTIVE con userId), acá se listan todos los abogados sin filtrar, para
  // que el admin pueda ver también los inactivos/sin cuenta vinculada.
  static async getAllForAdmin(): Promise<Lawyer[]> {
    return prisma.lawyer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    }) as Promise<Lawyer[]>;
  }

  static async getByUserId(
    user_id: string,
  ): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
    try {
      const lawyer = await prisma.lawyer.findFirst({ where: { userId: user_id } });

      if (!lawyer) {
        throw new Error("Geen advocaat gevonden voor de opgegeven gebruikers-ID");
      }

      return { success: true, data: lawyer as Lawyer };
    } catch (error) {
      console.error("Error getting lawyer by user ID:", error);
      return { success: false, error: "Fout bij het ophalen van de advocaat via gebruikers-ID" };
    }
  }
}
