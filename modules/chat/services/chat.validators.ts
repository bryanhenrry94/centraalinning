import { z } from "zod";

export const SenderSchema = z.object({
  id: z.uuid(),
  fullname: z.string(),
  email: z.string(),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  sender_id: z.string(),
  sender: SenderSchema,
  message: z.string(),
  file_url: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  timestamp: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const ChatMessageCreateSchema = ChatMessageSchema.omit({
  id: true,
  timestamp: true,
  created_at: true,
  updated_at: true,
});

export const ChatMessageResponseSchema = ChatMessageSchema.extend({
  fullname: z.string(),
  email: z.string().email(),
});

export const ChatRoomSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  collection_case_id: z.string(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  messages: z.array(ChatMessageSchema),
});

export type IChatMessage = z.infer<typeof ChatMessageSchema>;
export type IChatMessageCreate = z.infer<typeof ChatMessageCreateSchema>;
export type ChatRoom = z.infer<typeof ChatRoomSchema>;
