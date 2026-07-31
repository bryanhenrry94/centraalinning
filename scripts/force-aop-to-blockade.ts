/**
 * Utilidad de desarrollo: retrocede las fechas del AOP de un DebtClaim y
 * dispara el job de notificaciones repetidamente hasta que llegue a
 * BLK_NOTIFICATION (lo que crea el Blockade automáticamente).
 *
 * Requiere que el servidor Next.js esté corriendo (usa la ruta real del
 * job, no reimplementa su lógica) y que CRON_SECRET_TOKEN esté seteado.
 *
 * Uso:
 *   npx tsx scripts/force-aop-to-blockade.ts <debtClaimId> [baseUrl]
 */
import { prisma } from "../lib/prisma";

const TOKEN = process.env.CRON_SECRET_TOKEN;
const MAX_ITERATIONS = 6;

async function callJob(baseUrl: string) {
  const res = await fetch(
    `${baseUrl}/api/jobs/process-collection-case-workflow?token=${TOKEN}`,
  );
  return res.json();
}

async function main() {
  const debtClaimId = process.argv[2];
  const baseUrl = process.argv[3] || process.env.APP_BASE_URL || "http://localhost:3000";

  if (!debtClaimId) {
    console.error("Uso: npx tsx scripts/force-aop-to-blockade.ts <debtClaimId> [baseUrl]");
    process.exit(1);
  }
  if (!TOKEN) {
    console.error("Falta CRON_SECRET_TOKEN en el entorno (.env)");
    process.exit(1);
  }

  const debtClaim = await prisma.debtClaim.findUnique({
    where: { id: debtClaimId },
    include: { debtor: { include: { person: true } } },
  });
  if (!debtClaim) throw new Error(`DebtClaim ${debtClaimId} no encontrado`);

  const parameter = await prisma.parameter.findFirst();
  if (!parameter) throw new Error("No hay ninguna fila en la tabla parameter");

  const isCompany = debtClaim.debtor.person?.person_type === "COMPANY";
  const daysMap: Record<string, number> = {
    REMINDER: isCompany
      ? parameter.company_aanmaning_term_days
      : parameter.consumer_aanmaning_term_days,
    FINAL_NOTICE: isCompany
      ? parameter.company_sommatie_term_days
      : parameter.consumer_sommatie_term_days,
    DEFAULT_NOTICE: 0,
  };

  console.log(`DebtClaim ${debtClaim.reference} — persona: ${isCompany ? "COMPANY" : "INDIVIDUAL"}`);
  console.log(`Umbrales (días): REMINDER=${daysMap.REMINDER} FINAL_NOTICE=${daysMap.FINAL_NOTICE} DEFAULT_NOTICE=${daysMap.DEFAULT_NOTICE}`);
  console.log(`Job endpoint: ${baseUrl}/api/jobs/process-collection-case-workflow\n`);

  let lastStepId: string | null = null;

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    const collection = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId },
      include: { steps: { orderBy: { id: "desc" }, take: 1 } },
    });
    if (!collection) {
      throw new Error(
        "No hay AdministrativeCollection para este DebtClaim (¿el AOP todavía no se activó?)",
      );
    }

    const currentStep = collection.steps[0];
    if (!currentStep) {
      throw new Error("El AOP no tiene ningún step registrado todavía");
    }

    console.log(`[${i}] Step actual: ${currentStep.step} (status ${currentStep.status})`);

    if (currentStep.step === "BLK_NOTIFICATION") {
      const blockade = await prisma.blockade.findFirst({
        where: { debtorId: debtClaim.debtorId, tenantId: debtClaim.tenantId, status: "ACTIVE" },
      });
      console.log(
        blockade
          ? `✅ Listo: Blockade activo creado (${blockade.id})`
          : "⚠️  Llegó a BLK_NOTIFICATION pero no encontré el Blockade activo todavía",
      );
      break;
    }

    if (currentStep.status !== "IN_PROGRESS") {
      console.log("El step actual no está IN_PROGRESS, no hay nada que avanzar. Deteniendo.");
      break;
    }

    if (currentStep.id === lastStepId) {
      console.log("⚠️  El step no avanzó en la última vuelta. Deteniendo para evitar loop infinito.");
      break;
    }
    lastStepId = currentStep.id;

    const backdateDays = (daysMap[currentStep.step] ?? 0) + 1;
    const newSentAt = new Date();
    newSentAt.setDate(newSentAt.getDate() - backdateDays);

    await prisma.administrativeCollectionStep.update({
      where: { id: currentStep.id },
      data: { sentAt: newSentAt },
    });
    console.log(`   sentAt retrocedido ${backdateDays} día(s) -> ${newSentAt.toISOString()}`);

    const result = await callJob(baseUrl);
    console.log("   Resultado del job:", result);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
