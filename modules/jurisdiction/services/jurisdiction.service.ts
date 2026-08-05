import { prisma } from "@/lib/prisma";

// Isla/jurisdicción operativa de CFSB — servicio de solo lectura sobre la
// tabla Jurisdiction. Los nombres de isla viven como DATOS acá, nunca como
// enum o array hardcodeado en el código fuente (punto 13 del análisis
// CFSB). Bonaire → Curaçao → Aruba es el orden de implementación acordado
// (rolloutOrder), no un orden fijado en código.
export class JurisdictionService {
  static getAll = async () => {
    return prisma.jurisdiction.findMany({ orderBy: { rolloutOrder: "asc" } });
  };

  // Solo las islas ya habilitadas para operar — es lo que debe ofrecerse
  // como opción en el signup, por ejemplo.
  static getActive = async () => {
    return prisma.jurisdiction.findMany({
      where: { isActive: true },
      orderBy: { rolloutOrder: "asc" },
    });
  };

  static getByIslandCode = async (islandCode: string) => {
    return prisma.jurisdiction.findUnique({ where: { islandCode } });
  };

  static getById = async (id: string) => {
    return prisma.jurisdiction.findUnique({ where: { id } });
  };
}
