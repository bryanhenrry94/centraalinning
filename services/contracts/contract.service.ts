// lib/services/contract.service.ts

import { prisma } from "@/lib/prisma";

export async function generateContractReference() {
  const year = new Date().getFullYear();

  const total = await prisma.contract.count();

  return `FAR-${year}-${String(total + 1).padStart(3, "0")}`;
}
