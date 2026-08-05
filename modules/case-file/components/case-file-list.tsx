"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

import { getCaseFileForDebtClaim } from "@/modules/case-file/actions/case-file.actions";
import { CASE_FILE_CATEGORY_LABEL } from "@/modules/case-file/constants/case-file-category";
import { formatDateTime } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";

type CaseFileItem = Awaited<ReturnType<typeof getCaseFileForDebtClaim>>[number];

function formatSize(bytes?: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CaseFileListProps {
  debtClaimId: string;
}

// Interfaz única del expediente digital: reúne, para el mismo dossier,
// documentos y registros que hoy viven en tablas separadas (contrato, FAR,
// AOP, BLK, overdracht, GOP, sentencias, facturas, comprobantes de pago).
// No sube ni duplica nada — cada fila enlaza a la descarga original.
export const CaseFileList: React.FC<CaseFileListProps> = ({ debtClaimId }) => {
  const [items, setItems] = useState<CaseFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await getCaseFileForDebtClaim(debtClaimId));
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon het dossier niet laden");
    } finally {
      setLoading(false);
    }
  }, [debtClaimId]);

  useEffect(() => {
    load();
  }, [load]);

  const categoriesPresent = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items],
  );

  const filteredItems = useMemo(
    () => (categoryFilter === "ALL" ? items : items.filter((item) => item.category === categoryFilter)),
    [items, categoryFilter],
  );

  if (loading) return null;

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nog geen documenten of registraties in dit dossier.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <TextField
        select
        size="small"
        label="Categorie"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        sx={{ maxWidth: 280 }}
      >
        <MenuItem value="ALL">Alle categorieën ({items.length})</MenuItem>
        {categoriesPresent.map((category) => (
          <MenuItem key={category} value={category}>
            {CASE_FILE_CATEGORY_LABEL[category]} (
            {items.filter((item) => item.category === category).length})
          </MenuItem>
        ))}
      </TextField>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Categorie</TableCell>
            <TableCell>Naam</TableCell>
            <TableCell>Bron</TableCell>
            <TableCell>Datum</TableCell>
            <TableCell align="right">Grootte</TableCell>
            <TableCell align="right">Actie</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredItems.map((item) => (
            <TableRow key={`${item.category}-${item.id}`} hover>
              <TableCell>
                <Chip size="small" label={item.categoryLabel} />
              </TableCell>
              <TableCell>{item.title}</TableCell>
              <TableCell>{item.sourceLabel ?? "-"}</TableCell>
              <TableCell>{formatDateTime(item.createdAt.toString())}</TableCell>
              <TableCell align="right">{formatSize(item.size)}</TableCell>
              <TableCell align="right">
                {item.downloadUrl ? (
                  <Button size="small" startIcon={<DownloadIcon />} href={item.downloadUrl}>
                    Downloaden
                  </Button>
                ) : (
                  <Box component="span" sx={{ color: "text.secondary", fontSize: 12 }}>
                    Geen bestand
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
};
