import { z } from "zod";
import { SupportMessageType } from "@/modules/support/constants/support-message";

export const CreateSupportMessageSchema = z.object({
  type: z.nativeEnum(SupportMessageType),
  subject: z.string().min(1, "Onderwerp is verplicht"),
  caseReference: z.string().nullable().optional(),
  message: z.string().min(1, "Bericht is verplicht").max(2000, "Maximaal 2000 tekens"),
});
export type CreateSupportMessageInput = z.infer<typeof CreateSupportMessageSchema>;

export const AnswerSupportMessageSchema = z.object({
  supportMessageId: z.string().min(1),
  response: z.string().min(1, "Antwoord is verplicht"),
});
export type AnswerSupportMessageInput = z.infer<typeof AnswerSupportMessageSchema>;
