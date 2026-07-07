import { z } from "zod";

export const InvitationRegistrationSchema = z.object({
  token: z.string(),
  email: z.string().email(),
  fullname: z.string().min(2),
  password: z.string().min(8),
});

export type InvitationRegistration = z.infer<
  typeof InvitationRegistrationSchema
>;
