"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { notifyError } from "@/shared/ui/notifications";
import LoadingUI from "@/shared/ui/loading-ui";
import { AgreementReviewDialog } from "@/modules/agreement/components/agreement-review-dialog";
import { getMyDossiers } from "@/modules/dossier/actions/dossier.actions";
import { DossierRow } from "@/modules/dossier/types/dossier.types";
import { DOSSIER_SERVICE_SHORTCUTS } from "@/modules/dossier/constants/dossier-shortcuts";
import {
  DossierFilters,
  DossierFiltersValue,
} from "@/modules/dossier/components/dossier-filters";
import { DossierTable } from "@/modules/dossier/components/dossier-table";

const SHORTCUT_COLORS: Record<string, string> = {
  FAR: "#2E7D32",
  BLC: "#F59E0B",
  AOP: "#1450C4",
  BLK: "#D32F2F",
  COP: "#C8961E",
  GOP: "#1E3A5F",
};

const INITIAL_FILTERS: DossierFiltersValue = {
  search: "",
  serviceType: "ALL",
  statusLabel: "ALL",
  dateFrom: "",
  dateTo: "",
};

export const DossiersPage = () => {
  const [rows, setRows] = useState<DossierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DossierFiltersValue>(INITIAL_FILTERS);
  const [agreementClaimId, setAgreementClaimId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setRows(await getMyDossiers());
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Kon de dossiers niet laden",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.statusLabel))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

    return rows.filter((row) => {
      if (filters.serviceType !== "ALL" && row.serviceType !== filters.serviceType)
        return false;
      if (filters.statusLabel !== "ALL" && row.statusLabel !== filters.statusLabel)
        return false;
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      if (
        term &&
        !row.reference.toLowerCase().includes(term) &&
        !row.debtorName.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [rows, filters]);

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {DOSSIER_SERVICE_SHORTCUTS.map((shortcut) => (
            <Button
              key={shortcut.type}
              component="a"
              href={shortcut.href}
              variant="contained"
              size="small"
              sx={{
                bgcolor: SHORTCUT_COLORS[shortcut.type],
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "999px",
                px: 2.5,
                "&:hover": { bgcolor: SHORTCUT_COLORS[shortcut.type], opacity: 0.9 },
              }}
            >
              {shortcut.label}
            </Button>
          ))}
        </Stack>

        <Box>
          <Typography variant="h4" fontWeight={700}>
            Mijn dossiers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hier vindt u een overzicht van al uw dossiers en de status.
          </Typography>
        </Box>

        <DossierFilters
          value={filters}
          onChange={setFilters}
          statusOptions={statusOptions}
        />

        <DossierTable
          rows={filteredRows}
          onReviewAgreement={setAgreementClaimId}
          onRefresh={load}
        />
      </Stack>

      <AgreementReviewDialog
        open={!!agreementClaimId}
        onClose={() => setAgreementClaimId(null)}
        debtClaimId={agreementClaimId || ""}
        onUpdated={load}
      />
    </Container>
  );
};
