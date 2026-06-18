import { prisma } from "@/lib/prisma";
import { CreateBlockadeInput } from "./blockade.validators";

export class BlockadeService {
  static createBlockade = async (
    input: CreateBlockadeInput,
    tenantId: string,
  ) => {
    const blockade = await prisma.blockade.create({
      data: {
        tenantId: tenantId,
        debtorId: input.debtorId,
        amount: input.amount,
        reason: input.reason,
        status: "ACTIVE",
      },
    });

    return blockade;
  };
}
