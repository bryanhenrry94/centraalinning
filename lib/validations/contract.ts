// lib/validations/contract.ts

import { z } from "zod";
import { ContractPartySchema } from "./contract_party";

export const CreateContractSchema = z.object({
  contract_date: z.string(),
  start_date: z.string(),
  end_date: z.string(),

  amount: z.number(),
  installment_count: z.number().optional(),
  installment_amount: z.number().optional(),

  description: z.string().optional(),

  parties: ContractPartySchema.array(),

  documents: z.array(
    z.object({
      file_name: z.string(),
      file_path: z.string(),
      mime_type: z.string(),
      file_size: z.number(),
    }),
  ),
});

export type CreateContractInput = z.infer<typeof CreateContractSchema>;
