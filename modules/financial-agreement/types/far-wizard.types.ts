import { z } from "zod";
import { PersonType } from "@/shared/constants/person-type";
import { IdentificationType } from "@/shared/constants/identification-type";

// Schema propio del wizard cliente: las fechas viajan como string
// (yyyy-mm-dd, tal como las entrega un <input type="date">) y recién se
// convierten a Date al armar el payload real hacia
// CreateFinancialAgreementWithDebtorSchema (financial-agreement.validators.ts).
// "notes" (Aanvullende opmerkingen) no tiene columna propia en el schema —
// se concatena a `description` al enviar, ver far-registration-wizard.tsx.
export const FarWizardDebtorSchema = z.object({
  person_type: z.nativeEnum(PersonType),
  identification_type: z.nativeEnum(IdentificationType),
  identification: z.string().min(1, "Identificatienummer is verplicht."),
  fullname: z.string().min(1, "Naam is verplicht."),
  email: z.email({ message: "Het e-mailadres is niet geldig." }),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const FarWizardAgreementSchema = z.object({
  description: z.string().optional(),
  reference: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  amount: z.number().positive("Vul een geldig bedrag in."),
  currency: z.string().min(1),
  notes: z.string().optional(),
});

export const FarWizardSchema = z.object({
  debtor: FarWizardDebtorSchema,
  agreement: FarWizardAgreementSchema,
});

export type FarWizardFormValues = z.infer<typeof FarWizardSchema>;

export const FAR_WIZARD_DEFAULT_VALUES: FarWizardFormValues = {
  debtor: {
    person_type: PersonType.INDIVIDUAL,
    identification_type: IdentificationType.CEDULA,
    identification: "",
    fullname: "",
    email: "",
    phone: "",
    address: "",
  },
  agreement: {
    description: "",
    reference: "",
    invoiceDate: "",
    dueDate: "",
    amount: 0,
    currency: "USD",
    notes: "",
  },
};

export const IDENTIFICATION_TYPE_LABELS: Record<IdentificationType, string> = {
  [IdentificationType.CEDULA]: "Cédula",
  [IdentificationType.KVK]: "KvK-nummer",
  [IdentificationType.PASSPORT]: "Paspoort",
  [IdentificationType.RIJBEWIJS]: "Rijbewijs",
};
