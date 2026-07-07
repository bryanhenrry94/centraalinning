import { z } from "zod";

export const VerdictAttachmentSchema = z.object({
  id: z.string().uuid(),
  verdict_id: z.string().uuid(),
  file_path: z.string(),
  file_name: z.string(),
  file_size: z.bigint(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type VerdictAttachment = z.infer<typeof VerdictAttachmentSchema>;
