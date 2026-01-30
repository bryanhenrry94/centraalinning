"use server";
import prisma from "@/lib/prisma";
import { IParamGeneral } from "@/lib/validations/parameter";

export const getParameter = async () => {
  const PARAMETER_ID = process.env.NEXT_PUBLIC_PARAMETER_ID || "";

  const parameter = await prisma.parameter.findUnique({
    where: {
      id: PARAMETER_ID,
    },
  });

  return parameter;
};

export const createParameter = async (data: IParamGeneral) => {
  const newParameter = await prisma.parameter.create({
    data: {
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  return newParameter;
};

export const updateParameter = async (
  id: string,
  data: Partial<IParamGeneral>
) => {
  const updatedParameter = await prisma.parameter.update({
    where: {
      id: id,
    },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });

  return updatedParameter;
};
