// lib/validations/contract.ts

import { z } from "zod";
import { ContractPartySchema } from "./contract_party";

export const CreateContractSchema = z.object({
  contractDate: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),

  amount: z.number(),
  installmentCount: z.number().optional(),
  installmentAmount: z.number().optional(),

  description: z.string().optional(),

  parties: ContractPartySchema.array(),

  documents: z.array(
    z.object({
      fileName: z.string(),
      filePath: z.string(),
      mimeType: z.string(),
      fileSize: z.number(),
    }),
  ),
});

export type CreateContractInput = z.infer<typeof CreateContractSchema>;
