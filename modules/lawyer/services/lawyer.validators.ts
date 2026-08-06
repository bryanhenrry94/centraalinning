import { z } from "zod";
import { LawyerStatus } from "@/modules/lawyer/constants/lawyer-status";

export const lawyerBaseSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable().optional(),

  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  companyName: z.string().nullable().optional(),

  identification: z.string().nullable().optional(),
  barRegistration: z.string().nullable().optional(),

  email: z
    .string()
    .email("Ongeldig e-mailadres")
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),

  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),

  status: z.nativeEnum(LawyerStatus),
  notes: z.string().nullable().optional(),

  userId: z.string().nullable().optional(),

  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const lawyerCreateSchema = lawyerBaseSchema
  .omit({
    id: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    status: z.nativeEnum(LawyerStatus).default(LawyerStatus.ACTIVE),
  });

export const lawyerUpdateSchema = lawyerBaseSchema
  .omit({
    createdAt: true,
    updatedAt: true,
  })
  .partial()
  .required({ id: true });

export type Lawyer = z.infer<typeof lawyerBaseSchema>;
export type LawyerCreate = z.infer<typeof lawyerCreateSchema>;
export type LawyerUpdate = z.infer<typeof lawyerUpdateSchema>;
