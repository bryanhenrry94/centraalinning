import { prisma } from "@/lib/prisma";

// Registro genérico de auditoría (valor anterior -> nuevo, usuario,
// fecha/hora) — ver el modelo AuditLog en prisma/schema.prisma. Nace acá
// para los ajustes financieros del Vonnis (punto 7 del análisis CFSB), pero
// entityType/entityId lo hacen reusable desde cualquier módulo, igual que
// ClaimTimelineService.
export class AuditLogService {
  static record = async (params: {
    entityType: string;
    entityId: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
    actorUserId?: string;
  }) => {
    return prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        field: params.field,
        oldValue: params.oldValue === undefined || params.oldValue === null ? null : String(params.oldValue),
        newValue: params.newValue === undefined || params.newValue === null ? null : String(params.newValue),
        actorUserId: params.actorUserId,
      },
    });
  };

  static getForEntity = async (entityType: string, entityId: string) => {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      include: { actorUser: { select: { fullname: true, email: true } } },
    });
  };
}
