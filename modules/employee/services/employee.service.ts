import { prisma } from "@/lib/prisma";
import { CreateEmployee, Employee } from "@/modules/employee/services/employee.validators";

export class EmployeeService {
  static async getAllByTenantId(tenant_id: string): Promise<{ success: boolean; error?: string; data?: Employee[] }> {
    try {
      const data = await prisma.employee.findMany({ where: { tenant_id } });
      return { success: true, data: data as Employee[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async getById(id: string): Promise<{ success: boolean; error?: string; data?: Employee | null }> {
    try {
      const data = await prisma.employee.findUnique({ where: { id } });
      return { success: true, data: data as Employee | null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async create(data: CreateEmployee, tenant_id: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const employee = await prisma.employee.create({ data: { ...data, tenant_id } });
      return { success: true, data: employee };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async update(id: string, data: CreateEmployee): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const employee = await prisma.employee.update({ where: { id }, data });
      return { success: true, data: employee };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async delete(id: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const employee = await prisma.employee.delete({ where: { id } });
      return { success: true, data: employee };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  // COP: busca si una Person trabaja para algún tenant afiliado. No existe
  // FK entre Person y Employee — la única forma de vincularlos es comparar
  // el número de identificación como string, en TODOS los tenants (sin
  // filtrar por tenant_id), ya que "empleador" puede ser cualquier
  // participante de la red, no necesariamente el que reclama la deuda.
  static async findEmployerTenantForPerson(
    identification: string,
  ): Promise<{ tenantId: string; employeeId: string } | null> {
    if (!identification?.trim()) return null;

    const employee = await prisma.employee.findUnique({
      where: { identification },
      select: { id: true, tenant_id: true },
    });

    return employee ? { tenantId: employee.tenant_id, employeeId: employee.id } : null;
  }
}
