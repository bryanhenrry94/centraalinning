import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Box, Chip, Container, Paper, Stack, Typography } from "@mui/material";
import { formatDate } from "@/shared/utils/formatters";
import { getDebtorByUserId } from "@/modules/collection/actions/debtor.actions";
import { getBlockadesByDebtorAction } from "@/modules/blockade/actions/get-blockades-by-debtor";

const statusLabel: Record<string, { label: string; color: "default" | "warning" | "error" | "success" }> = {
  DRAFT: { label: "In behandeling", color: "warning" },
  ACTIVE: { label: "Actief", color: "error" },
  SUSPENDED: { label: "Opgeheven", color: "success" },
};

export default async function BlockStatusPage() {
  const session = await getServerSession(authOptions);

  const userId = session?.user?.id;
  const tenantId = session?.user?.tenant_id;

  const debtor = userId && tenantId ? await getDebtorByUserId(userId, tenantId) : null;

  const blockades =
    debtor && tenantId ? await getBlockadesByDebtorAction(debtor.id, tenantId) : [];

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: { xs: 1.5, sm: 4 }, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Status economische blokkade
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overzicht van uw blokkadestatus.
        </Typography>
      </Box>

      {blockades.length === 0 && (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">
            Er is geen blokkade geregistreerd op uw naam.
          </Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        {blockades.map((blockade) => {
          const status = statusLabel[blockade.status] ?? {
            label: blockade.status,
            color: "default" as const,
          };

          return (
            <Paper key={blockade.id} sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6">Blokkade</Typography>
                <Chip label={status.label} color={status.color} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Geregistreerd op: {formatDate(blockade.registeredAt.toString())}
              </Typography>
              {blockade.releasedAt && (
                <Typography variant="body2" color="text.secondary">
                  Opgeheven op: {formatDate(blockade.releasedAt.toString())}
                </Typography>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Container>
  );
}
