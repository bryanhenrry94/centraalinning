import { z } from "zod";

// FAR es independiente de cualquier expediente/AOP: solo requiere un
// deudor. contractId es opcional (puede originarse desde un contrato ya
// registrado, ver contract.service.ts) pero no obliga a que exista uno.
export const CreateFinancialAgreementSchema = z.object({
  debtorId: z.string().min(1),
  contractId: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  amount: z.number().positive(),
  currency: z.string().min(1),
});
export type CreateFinancialAgreementInput = z.infer<typeof CreateFinancialAgreementSchema>;
