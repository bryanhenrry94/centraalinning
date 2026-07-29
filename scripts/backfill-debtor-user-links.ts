// Backfill: vincula deudores sin user_id a un User global existente con el
// mismo email, creando la Membership + rol DEBTOR en el tenant del deudor.
// Corrige los casos generados por el bug de InvitationService.register()
// (versiones previas rechazaban el registro cuando el email ya existía como
// User global, sin crear la Membership ni actualizar debtor.user_id).
//
// Uso:
//   npx tsx scripts/backfill-debtor-user-links.ts            # dry-run (solo reporta)
//   npx tsx scripts/backfill-debtor-user-links.ts --apply    # aplica los cambios

import { prisma } from "@/lib/prisma";
import { InvitationService } from "@/modules/auth/services/invitation.service";
import { UserRole } from "@/shared/constants/user-role";

async function main() {
  const apply = process.argv.includes("--apply");

  const debtors = await prisma.debtor.findMany({
    where: { user_id: null },
    include: { person: true },
  });

  console.log(`Deudores sin user_id: ${debtors.length}`);
  console.log(`Modo: ${apply ? "APPLY (se aplicarán los cambios)" : "DRY-RUN (solo reporte)"}`);
  console.log("");

  let linked = 0;
  let skipped = 0;

  for (const debtor of debtors) {
    const user = await prisma.user.findFirst({ where: { email: debtor.email } });

    if (!user) {
      skipped++;
      continue;
    }

    const fullname =
      `${debtor.person?.first_name ?? ""} ${debtor.person?.last_name ?? ""}`.trim() ||
      debtor.person?.business_name ||
      undefined;

    console.log(
      `[MATCH] debtor=${debtor.id} tenant=${debtor.tenant_id} email=${debtor.email} -> user=${user.id}`,
    );

    if (apply) {
      const result = await InvitationService.register({
        tenantId: debtor.tenant_id,
        email: debtor.email,
        role: UserRole.DEBTOR,
        fullname,
        debtor_id: debtor.id,
      });
      console.log(`  -> ${result.message}`);
    }

    linked++;
  }

  console.log("");
  console.log(`Resumen: ${linked} vinculados${apply ? "" : " (simulado)"}, ${skipped} sin User global coincidente.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
