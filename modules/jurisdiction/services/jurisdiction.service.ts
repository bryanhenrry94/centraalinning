import { prisma } from "@/lib/prisma";
import {
  jurisdictionCreateSchema,
  jurisdictionUpdateSchema,
  JurisdictionInput,
  JurisdictionUpdateInput,
} from "./jurisdiction.validators";

// Isla/jurisdicción operativa de CFSB — los nombres de isla viven como
// DATOS acá, nunca como enum o array hardcodeado en el código fuente
// (punto 13 del análisis CFSB). Bonaire → Curaçao → Aruba es el orden de
// implementación acordado (rolloutOrder), no un orden fijado en código —
// el mantenimiento (crear/editar/eliminar) de acá abajo es lo que permite
// que un país nuevo (p.ej. Holanda) se agregue sin tocar código.
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

  static getByCode = async (code: string) => {
    return prisma.jurisdiction.findUnique({ where: { code } });
  };

  static getById = async (id: string) => {
    return prisma.jurisdiction.findUnique({ where: { id } });
  };

  // Toggle mínimo para CFSB Admin (Eilanden/landen) — activar/desactivar
  // una isla no cambia rolloutOrder, así que no afecta el orden de
  // rollout ya acordado.
  static setActive = async (id: string, isActive: boolean) => {
    return prisma.jurisdiction.update({ where: { id }, data: { isActive } });
  };

  // Alta de una isla/país nueva desde CFSB Admin. code es único
  // (constraint de BD) — cualquier duplicado revienta acá con un mensaje
  // legible en vez del error crudo de Prisma.
  static create = async (input: JurisdictionInput) => {
    const data = jurisdictionCreateSchema.parse(input);

    const existing = await prisma.jurisdiction.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new Error(`Er bestaat al een jurisdictie met code "${data.code}".`);
    }

    return prisma.jurisdiction.create({ data });
  };

  // Edición de los datos de la isla (nombre, código, orden de rollout) —
  // las tarifas/plazos/ABB de esa isla se editan aparte, como Setting (ver
  // ParameterService), no acá.
  static update = async (id: string, input: JurisdictionUpdateInput) => {
    const data = jurisdictionUpdateSchema.parse(input);

    if (data.code) {
      const existing = await prisma.jurisdiction.findUnique({ where: { code: data.code } });
      if (existing && existing.id !== id) {
        throw new Error(`Er bestaat al een jurisdictie met code "${data.code}".`);
      }
    }

    return prisma.jurisdiction.update({ where: { id }, data });
  };

  // Baja de una isla/país — solo permitida si no quedó ningún tenant o
  // persona registrada bajo esa jurisdicción (nunca se borra en cascada
  // data de negocio real). Los Setting/JurisdictionService asociados sí son
  // pura configuración de esa isla, así que se limpian junto con ella.
  static delete = async (id: string) => {
    const [tenantCount, personCount] = await Promise.all([
      prisma.tenant.count({ where: { jurisdictionId: id } }),
      prisma.person.count({ where: { jurisdictionId: id } }),
    ]);

    if (tenantCount > 0 || personCount > 0) {
      throw new Error(
        "Deze jurisdictie kan niet verwijderd worden: er zijn nog deelnemers of personen aan gekoppeld.",
      );
    }

    await prisma.$transaction([
      prisma.setting.deleteMany({ where: { jurisdictionId: id } }),
      prisma.jurisdictionService.deleteMany({ where: { jurisdictionId: id } }),
      prisma.jurisdiction.delete({ where: { id } }),
    ]);
  };
}
