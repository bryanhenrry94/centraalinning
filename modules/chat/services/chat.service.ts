import { prisma } from "@/lib/prisma";
import { IChatMessage, IChatMessageCreate } from "@/modules/chat/services/chat.validators";

export class ChatService {
  static async createRoom(name: string, debtClaimId: string, tenant_id: string) {
    return prisma.chatRoom.create({ data: { name, debtClaimId, tenant_id } });
  }

  static async deleteRoom(chatRoomId: string) {
    return prisma.chatRoom.delete({ where: { id: chatRoomId } });
  }

  static async saveMessage(params: IChatMessageCreate) {
    return prisma.chatMessage.create({
      data: {
        room_id: params.room_id,
        sender_id: params.sender_id,
        message: params.message,
        file_url: params.file_url,
        file_name: params.file_name,
      },
    });
  }

  static async deleteMessage(messageId: string) {
    return prisma.chatMessage.delete({ where: { id: messageId } });
  }

  static async getRoomsByTenantId(tenant_id: string) {
    return prisma.chatRoom.findMany({
      where: { tenant_id },
      include: {
        messages: {
          include: { sender: true },
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: { updated_at: "desc" },
    });
  }

  static async getRoomById(chatRoomId: string) {
    return prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: {
        messages: {
          include: { sender: true },
          orderBy: { created_at: "asc" },
        },
      },
    });
  }

  static async getMessagesByRoomId(chatRoomId: string): Promise<IChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { room_id: chatRoomId },
      include: { sender: true },
      orderBy: { created_at: "asc" },
    });

    return messages.map((msg: any) => ({
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
  }
}
