import { prisma } from "@/lib/prisma";

export async function getParameters() {
  const parameter = await prisma.parameter.findFirst();

  if (!parameter) {
    return await prisma.parameter.create({
      data: {},
    });
  }

  return parameter;
}

export async function updateParameters(data: any) {
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
}
