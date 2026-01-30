"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { IChatMessage, IChatMessageCreate } from "@/lib/validations/chat";

export const createChatRoom = async (
  name: string,
  collection_case_id: string,
  tenant_id: string
) => {
  await prisma.chatRoom.create({
    data: {
      name,
      collection_case_id,
      tenant_id,
    },
  });
  revalidatePath("/dashboard/chat");
};

export const deleteChatRoom = async (chatRoomId: string) => {
  await prisma.chatRoom.delete({
    where: {
      id: chatRoomId,
    },
  });
  revalidatePath("/dashboard/chat");
};

export const saveMessage = async (params: IChatMessageCreate) => {
  await prisma.chatMessage.create({
    data: {
      room_id: params.room_id,
      sender_id: params.sender_id,
      message: params.message,
      file_url: params.file_url,
      file_name: params.file_name,
    },
  });
  revalidatePath("/dashboard/chat");
};

export const deleteMessage = async (messageId: string) => {
  await prisma.chatMessage.delete({
    where: {
      id: messageId,
    },
  });
  revalidatePath("/dashboard/chat");
};

export const getAllChatRoomsByTenantId = async (tenant_id: string) => {
  return await prisma.chatRoom.findMany({
    where: {
      tenant_id,
    },
    include: {
      messages: {
        include: {
          sender: true,
        },
        orderBy: {
          created_at: "asc",
        },
      },
    },
    orderBy: {
      updated_at: "desc",
    },
  });
};

export const getChatRoomById = async (chatRoomId: string) => {
  return await prisma.chatRoom.findUnique({
    where: {
      id: chatRoomId,
    },
    include: {
      messages: {
        include: {
          sender: true,
        },
        orderBy: {
          created_at: "asc",
        },
      },
    },
  });
};

export const getMessagesByRoomId = async (
  chatRoomId: string
): Promise<IChatMessage[]> => {
  const messages = await prisma.chatMessage.findMany({
    where: {
      room_id: chatRoomId,
    },
    include: {
      sender: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  return messages.map((msg) => ({
    id: msg.id,
    room_id: msg.room_id,
    sender_id: msg.sender_id,
    message: msg.message,
    file_url: msg.file_url,
    file_name: msg.file_name,
    timestamp: msg.created_at,
    created_at: msg.created_at,
    updated_at: msg.updated_at,
    sender: {
      id: msg.sender.id,
      fullname: msg.sender.fullname ? msg.sender.fullname : "Usuario",
      email: msg.sender.email,
    },
  }));
};
