"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Container,
  Typography,
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  Stack,
  Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";

import { getAllFinancialAgreementsForTenant } from "@/modules/financial-agreement/actions/financial-agreement.actions";
import { getFinancialAgreementStatusInfo } from "@/modules/financial-agreement/utils/financial-agreement-status";

type FinancialAgreementListItem = Awaited<
  ReturnType<typeof getAllFinancialAgreementsForTenant>
>[number];

const FinancialAgreementsPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FinancialAgreementListItem[]>([]);

  const load = useCallback(async () => {
    if (!session?.user?.tenant_id) return;
    try {
      setLoading(true);
      const data = await getAllFinancialAgreementsForTenant(session.user.tenant_id);
      setItems(data);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon FAR-overzicht niet laden");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.tenant_id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "FAR — Financiële Afspraken Registreren" }]} />

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} gap={1} flexWrap="wrap">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            FAR — Financiële Afspraken Registreren
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Servicio independiente: registro + tarifa fija. Sin seguimiento ni recordatorios.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/financial-agreements/new")}
        >
          Nieuwe FAR registreren
        </Button>
      </Stack>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Referentie</TableCell>
              <TableCell>Debiteur</TableCell>
              <TableCell align="right">Bedrag</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Aangemaakt</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ color: "text.secondary", py: 2, textAlign: "center" }}>
                    Nog geen financiële afspraken geregistreerd.
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => {
              const statusInfo = getFinancialAgreementStatusInfo(item.status);
              const debtorName = item.debtor?.person
                ? `${item.debtor.person.first_name ?? ""} ${item.debtor.person.last_name ?? ""}`.trim()
                : "-";
              return (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(`/financial-agreements/${item.id}`)}
                >
                  <TableCell>{item.reference ?? "-"}</TableCell>
                  <TableCell>{debtorName}</TableCell>
                  <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                  <TableCell>
                    <Chip label={statusInfo.label} color={statusInfo.color} size="small" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>{formatDate(item.createdAt.toString())}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Container>
  );
};

export default FinancialAgreementsPage;
