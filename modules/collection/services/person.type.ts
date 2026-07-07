import { z } from "zod";
import {
  PersonCreateSchema,
  PersonSchema,
  PersonSummarySchema,
} from "@/modules/collection/services/person.validators";

export type PersonInput = z.infer<typeof PersonSchema>;
export type PersonSummaryInput = z.infer<typeof PersonSummarySchema>;
export type PersonCreateInput = z.infer<typeof PersonCreateSchema>;
