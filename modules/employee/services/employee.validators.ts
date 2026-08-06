import { z } from "zod";

// Base employee schema with all fields
export const employeeSchema = z.object({
  id: z.string().uuid(),
  identification: z.string().min(1, "Het identificatienummer is verplicht"),
  first_name: z.string().min(1, "El nombre es obligatorio"),
  last_name: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Ongeldig e-mailadresformaat"),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  tenant_id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Schema for creating a new employee (without id, created_at, updated_at)
export const createEmployeeSchema = employeeSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
});

// Schema for updating an employee (all fields optional except id)
export const updateEmployeeSchema = employeeSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .partial();

// Schema for employee query parameters
export const employeeQuerySchema = z.object({
  id: z.string().uuid().optional(),
  identification: z.string().optional(),
  email: z.string().email().optional(),
  tenant_id: z.string().uuid().optional(),
});

// Type exports
export type Employee = z.infer<typeof employeeSchema>;
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;
export type EmployeeQuery = z.infer<typeof employeeQuerySchema>;
