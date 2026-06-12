import { prisma } from "@/lib/prisma";
import { ParameterInput } from "./parameter.type";

export class ParameterService {
  static getParameters = async () => {
    const parameter = await prisma.parameter.findFirst();

    if (!parameter) {
      return await prisma.parameter.create({
        data: {},
      });
    }

    return parameter;
  };

  static updateParameters = async (data: ParameterInput) => {
    console.log("Updating parameters with data:", data);

    const parameter = await prisma.parameter.findFirst();

    if (!parameter) {
      return prisma.parameter.create({
        data,
      });
    }

    return prisma.parameter.update({
      where: {
        id: parameter.id,
      },
      data,
    });
  };

  static getParameter = async (): Promise<ParameterInput | null> => {
    const PARAMETER_ID = process.env.NEXT_PUBLIC_PARAMETER_ID || "";

    const parameter = await prisma.parameter.findUnique({
      where: {
        id: PARAMETER_ID,
      },
    });

    return parameter;
  };
}
