import { z } from "zod";

const contractTypes = [
  "DELIVERY_OF_GOODS",
  "SERVICES",
  "RENT",
  "LOAN",
  "PAYMENT_ARRANGEMENT",
  "OTHER",
] as const;

const contractStatuses = ["DRAFT", "REGISTERED"] as const;

export const ContractPartySchema = z.object({
  role: z.enum(["PARTY_A", "PARTY_B"]),
  identification_type: z.enum(["KVK", "CEDULA", "PASSPORT", "RIJBEWIJS"]),
  person_type: z.enum(["INDIVIDUAL", "COMPANY"]),
  identification: z.string().trim().min(1, "Identificatie is vereist").max(50),
  fullname: z.string().trim().min(2, "Volledige naam is vereist").max(255),
  email: z.string().trim().email("Ongeldig e-mailadres"),
  phone: z.string().trim().min(5, "Telefoonnummer is vereist").max(50),
  birth_date: z
    .string()
    .datetime("Ongeldige geboortedatum")
    .optional()
    .nullable(),
  birth_place: z.string().trim().max(255).optional().nullable(),
  address: z
    .string()
    .trim()
    .min(1, "Vestigingadres is vereist")
    .max(500, "Vestigingadres is te lang"),
});

export const ContractSchema = z.object({
  contract_type: z.enum(contractTypes),
  // status and reference_number are generated server-side; optional here
  status: z.enum(contractStatuses).optional(),
  reference_number: z.string().trim().optional(),
  contract_date: z.string().min(1, "Contractdatum mag niet leeg zijn"),
  start_date: z.string().min(1, "Startdatum mag niet leeg zijn"),
  end_date: z.string().optional().nullable(),
  amount: z.number().positive("Bedrag moet groter zijn dan 0"),
  installment_count: z
    .number()
    .positive("Aantal termijnen moet groter zijn dan 0")
    .optional(),
  installment_amount: z
    .number()
    .positive("Termijnbedrag moet groter zijn dan 0")
    .optional(),
  description: z.string().optional(),
  parties: ContractPartySchema.array().min(
    1,
    "Minstens één partij is verplicht",
  ),
  documents: z.array(
    z.object({
      file_name: z.string().min(1, "Bestandsnaam mag niet leeg zijn"),
      file_path: z.string().min(1, "Bestandspad mag niet leeg zijn"),
      mime_type: z.string().min(1, "MIME-type mag niet leeg zijn"),
      file_size: z.number().positive("Bestandsgrootte moet groter zijn dan 0"),
    }),
  ),
});
