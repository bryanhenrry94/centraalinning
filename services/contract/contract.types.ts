import z from "zod";
import { ContractPartySchema, ContractSchema } from "./contract.validators";

export type CreateContractInput = z.infer<typeof ContractSchema>;
export type ContractPartyInput = z.infer<typeof ContractPartySchema>;
