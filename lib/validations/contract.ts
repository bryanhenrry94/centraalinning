// lib/validations/contract.ts

import { z } from "zod";
import { ContractPartySchema } from "./contract_party";

export const ContractSchema = z.object({
  contract_type: z.enum([
    "DELIVERY_OF_GOODS",
    "SERVICES",
    "RENT",
    "LOAN",
    "PAYMENT_ARRANGEMENT",
    "OTHER",
  ]),
  contract_date: z.string().min(1, "Contractdatum mag niet leeg zijn"),
  start_date: z.string().min(1, "Startdatum mag niet leeg zijn"),
  end_date: z.string().min(1, "Einddatum mag niet leeg zijn"),

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

  status: z.enum(["DRAFT", "PENDING_PAYMENT", "REGISTERED", "CANCELLED"]),
});

export type CreateContractInput = z.infer<typeof ContractSchema>;
export type ContractFormData = z.infer<typeof ContractSchema>;
