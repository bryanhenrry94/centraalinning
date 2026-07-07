"use server";
import { SentooService } from "@/infrastructure/sentoo/sentoo.service";

export async function createSentooPayment(input: {
  amount: number;
  description: string;
  reference: string;
}) {
  return SentooService.createTransaction(input);
}

export async function verifySentooPayment(transactionId: string) {
  const res = await SentooService.verifySentooPayment(transactionId);
  if (!res.success) {
    throw new Error("Failed to verify Sentoo payment");
  }
  return { status: res.status };
}
