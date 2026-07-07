"use server";
import { prisma } from "@/lib/prisma";
import {
  Bailiff,
  BailiffCreate,
  bailiffCreateSchema,
  BailiffUpdate,
} from "@/modules/bailiff/services/bailiff.validators";

export async function createBailiff(
  data: BailiffCreate,
  tenantId: string
): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
  try {
    const parsedData = bailiffCreateSchema.parse(data);

    if (!parsedData) {
      throw new Error("Invalid data");
    }

    if (!parsedData.fullname || !parsedData.email) {
      throw new Error("Name and email are required");
    }

    const bailiff = await prisma.bailiff.create({
      data: {
        ...parsedData,
        tenant_id: tenantId,
      },
    });

    // revalidatePath("/bailiffs");
    return { success: true, data: bailiff };
  } catch (error) {
    console.error("Error creating bailiff:", error);
    return { success: false, error: "Failed to create bailiff" };
  }
}

export async function getBailiffById(
  id: string
): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
  try {
    if (!id) {
      throw new Error("Bailiff ID is required");
    }

    const bailiff = await prisma.bailiff.findUnique({
      where: { id },
    });

    if (!bailiff) {
      throw new Error("Bailiff not found");
    }

    return { success: true, data: bailiff };
  } catch (error) {
    console.error("Error getting bailiff:", error);
    return { success: false, error: "Failed to get bailiff" };
  }
}

export async function updateBailiff(
  id: string,
  data: Partial<BailiffUpdate>
): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
  try {
    if (!id) {
      throw new Error("Bailiff ID is required");
    }

    const { fullname, email, phone } = data;

    const updateData: any = {};
    if (fullname) updateData.fullname = fullname;
    if (email) updateData.email = email;
    if (phone !== null) updateData.phone = phone;

    const bailiff = await prisma.bailiff.update({
      where: { id },
      data: updateData,
    });

    // revalidatePath("/bailiffs");
    // revalidatePath(`/bailiffs/${id}`);
    return { success: true, data: bailiff };
  } catch (error) {
    console.error("Error updating bailiff:", error);
    return { success: false, error: "Failed to update bailiff" };
  }
}

export async function getAllBailiffs(tenant_id: string): Promise<Bailiff[]> {
  const bailiffs = await prisma.bailiff.findMany({
    where: { tenant_id },
    orderBy: {
      created_at: "desc",
    },
  });
  return bailiffs;
}

export const getBailiffByUserId = async (
  user_id: string
): Promise<{ success: boolean; data?: Bailiff; error?: string }> => {
  try {
    const bailiff = await prisma.bailiff.findFirst({
      where: { user_id },
    });

    if (!bailiff) {
      throw new Error(
        "Alguacil no encontrado para el ID de usuario proporcionado"
      );
    }

    return { success: true, data: bailiff };
  } catch (error) {
    console.error("Error getting bailiff by user ID:", error);
    return {
      success: false,
      error: "Error al obtener el alguacil por ID de usuario",
    };
  }
};
