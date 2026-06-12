import { z } from "zod";
import {
  MembershipSchema,
  MembershipCreateSchema,
  MembershipUpdateSchema,
} from "./membership.validators";

export type MembershipInput = z.infer<typeof MembershipSchema>;
export type MembershipCreate = z.infer<typeof MembershipCreateSchema>;
export type MembershipUpdate = z.infer<typeof MembershipUpdateSchema>;
