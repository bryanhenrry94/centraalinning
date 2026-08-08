"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SupportService } from "@/modules/support/services/support.service";
import {
  requirePlatformOwner,
  requireOwnerOrPlatformOwner,
} from "@/modules/support/services/support-guards";
import {
  CreateSupportMessageInput,
  CreateSupportMessageSchema,
  AnswerSupportMessageSchema,
} from "@/modules/support/services/support.validators";
import { SupportMessageStatus } from "@/modules/support/constants/support-message";

async function getSessionOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }
  return session;
}

export const submitSupportMessage = async (
  data: CreateSupportMessageInput,
  file?: File,
) => {
  const session = await getSessionOrThrow();
  const parsed = CreateSupportMessageSchema.parse(data);

  const fileInput = file
    ? {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        buffer: Buffer.from(await file.arrayBuffer()),
      }
    : undefined;

  return SupportService.create(parsed, session, fileInput);
};

export const getMySupportMessages = async () => {
  const session = await getSessionOrThrow();
  return SupportService.getMine(session.user.id);
};

export const getSupportMessageById = async (id: string) => {
  await requireOwnerOrPlatformOwner(id);
  return SupportService.getById(id);
};

export const getAllSupportMessagesForPlatform = async (status?: SupportMessageStatus) => {
  await requirePlatformOwner();
  return SupportService.getAllForPlatform(status);
};

export const markSupportMessageInProgress = async (id: string) => {
  await requirePlatformOwner();
  return SupportService.markInProgress(id);
};

export const answerSupportMessage = async (data: {
  supportMessageId: string;
  response: string;
}) => {
  const { session } = await requirePlatformOwner();
  const parsed = AnswerSupportMessageSchema.parse(data);
  return SupportService.answer(parsed.supportMessageId, parsed.response, session.user.id);
};

export const closeSupportMessage = async (id: string) => {
  await requirePlatformOwner();
  return SupportService.close(id);
};
