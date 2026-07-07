"use server";
import { CreateEmployee, Employee } from "@/modules/employee/services/employee.validators";
import { EmployeeService } from "@/modules/employee/services/employee.service";

export async function getAllEmployeesByTenantId(
  tenant_id: string,
): Promise<{ success: boolean; error?: string; data?: Employee[] }> {
  return EmployeeService.getAllByTenantId(tenant_id);
}

export async function getEmployeeById(
  id: string,
): Promise<{ success: boolean; error?: string; data?: Employee | null }> {
  return EmployeeService.getById(id);
}

export async function createEmployee(
  data: CreateEmployee,
  tenant_id: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  return EmployeeService.create(data, tenant_id);
}

export async function updateEmployee(
  id: string,
  data: CreateEmployee,
): Promise<{ success: boolean; error?: string; data?: any }> {
  return EmployeeService.update(id, data);
}

export async function deleteEmployee(
  id: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  return EmployeeService.delete(id);
}
