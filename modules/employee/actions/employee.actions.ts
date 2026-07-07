"use server";
import { prisma } from "@/lib/prisma";
import { CreateEmployee, Employee } from "@/modules/employee/services/employee.validators";

export async function getAllEmployeesByTenantId(
  tenant_id: string
): Promise<{ success: boolean; error?: string; data?: Employee[] }> {
  try {
    const data = await prisma.employee.findMany({
      where: { tenant_id },
    });

    return { success: true, data: data as Employee[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function getEmployeeById(
  id: string
): Promise<{ success: boolean; error?: string; data?: Employee | null }> {
  try {
    const data = await prisma.employee.findUnique({
      where: { id },
    });

    return { success: true, data: data as Employee | null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Create
export async function createEmployee(
  data: CreateEmployee,
  tenant_id: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const employee = await prisma.employee.create({
      data: { ...data, tenant_id },
    });
    return { success: true, data: employee };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Update
export async function updateEmployee(
  id: string,
  data: CreateEmployee
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data,
    });
    return { success: true, data: employee };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Delete
export async function deleteEmployee(
  id: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const employee = await prisma.employee.delete({ where: { id } });
    return { success: true, data: employee };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
