"use server";
import { revalidatePath } from "next/cache";
import { IChatMessage, IChatMessageCreate } from "@/modules/chat/services/chat.validators";
import { ChatService } from "@/modules/chat/services/chat.service";

export const createChatRoom = async (
  name: string,
  debtClaimId: string,
  tenant_id: string,
) => {
  await ChatService.createRoom(name, debtClaimId, tenant_id);
  revalidatePath("/dashboard/chat");
};

export const deleteChatRoom = async (chatRoomId: string) => {
  await ChatService.deleteRoom(chatRoomId);
  revalidatePath("/dashboard/chat");
};

export const saveMessage = async (params: IChatMessageCreate) => {
  await ChatService.saveMessage(params);
  revalidatePath("/dashboard/chat");
};

export const deleteMessage = async (messageId: string) => {
  await ChatService.deleteMessage(messageId);
  revalidatePath("/dashboard/chat");
};

export const getAllChatRoomsByTenantId = async (tenant_id: string) => {
  return ChatService.getRoomsByTenantId(tenant_id);
};

export const getChatRoomById = async (chatRoomId: string) => {
  return ChatService.getRoomById(chatRoomId);
};

export const getMessagesByRoomId = async (
  chatRoomId: string,
): Promise<IChatMessage[]> => {
  return ChatService.getMessagesByRoomId(chatRoomId);
};
