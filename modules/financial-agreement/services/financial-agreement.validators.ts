import { z } from "zod";
import { PersonType } from "@/shared/constants/person-type";
import { IdentificationType } from "@/shared/constants/identification-type";

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
  // Factuurdatum / Vervaldatum — ver FinancialAgreement.invoiceDate/dueDate
  // en prisma/schema.prisma.
  invoiceDate: z.date().nullable().optional(),
  dueDate: z.date().nullable().optional(),
});
export type CreateFinancialAgreementInput = z.infer<typeof CreateFinancialAgreementSchema>;

// Datos del deudor (Wederpartij) tal como se piden en el paso 1 ("Gegevens")
// del wizard de alta — el FAR de hoy solo admitía un debtorId ya existente
// (DebtorPicker); esto permite además crear uno nuevo en el momento, vía
// DebtorService.findOrCreate (modules/collection/services/debtor.service.ts).
// El e-mail queda obligatorio (a diferencia del mockup) porque
// Debtor.email es una columna NOT NULL en el schema y findOrCreate no
// admite deudores sin e-mail — ver nota en el reporte final del wizard.
export const FinancialAgreementDebtorInputSchema = z.object({
  person_type: z.nativeEnum(PersonType),
  identification_type: z.nativeEnum(IdentificationType),
  identification: z.string().min(1, "Identificatienummer is verplicht."),
  fullname: z.string().min(1, "Naam is verplicht."),
  email: z.email({ message: "Het e-mailadres is niet geldig." }),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});
export type FinancialAgreementDebtorInput = z.infer<typeof FinancialAgreementDebtorInputSchema>;

// Submit combinado del wizard: crea/reusa el deudor y registra el FAR en un
// solo paso ("Registreren en betalen").
export const CreateFinancialAgreementWithDebtorSchema = z.object({
  debtor: FinancialAgreementDebtorInputSchema,
  agreement: CreateFinancialAgreementSchema.omit({ debtorId: true }),
});
export type CreateFinancialAgreementWithDebtorInput = z.infer<
  typeof CreateFinancialAgreementWithDebtorSchema
>;
