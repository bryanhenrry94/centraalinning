"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import {
  getAllInterestTypes,
  createInterestDetail,
  updateInterestDetail,
  deleteInterestDetail,
} from "@/modules/settings/actions/interest-type.actions";
import { InterestType } from "@/modules/settings/services/interest-type.validators";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { AlertService } from "@/shared/ui/alerts";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";

type DetailRow = { id: string; date: string; rate: number };

// Beheer van de rentetarief-geschiedenis (InterestDetail) per InterestType —
// voorheen enkel aanpasbaar door prisma/seed.ts opnieuw te draaien. Elke rij
// hier is het tarief dat vanaf die datum geldt; VerdictService.calculateInterestDetail
// gebruikt automatisch het laatst geldende tarief per periode.
export default function InterestRatesPage() {
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRowDraft, setNewRowDraft] = useState<Record<string, { date: string; rate: string }>>({});
  const [editDraft, setEditDraft] = useState<Record<string, { date: string; rate: string }>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { interestTypes } = await getAllInterestTypes();
      setInterestTypes(interestTypes);
    } catch (error) {
      notifyError("Kon rentetarieven niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (interestTypeId: string) => {
    const draft = newRowDraft[interestTypeId];
    if (!draft?.date || !draft?.rate) {
      notifyError("Vul de datum en het tarief in.");
      return;
    }
    try {
      await createInterestDetail(interestTypeId, { date: draft.date, rate: Number(draft.rate) });
      setNewRowDraft((prev) => ({ ...prev, [interestTypeId]: { date: "", rate: "" } }));
      notifySuccess("Tarief toegevoegd.");
      load();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Toevoegen mislukt");
    }
  };

  const handleSaveEdit = async (detailId: string) => {
    const draft = editDraft[detailId];
    if (!draft?.date || !draft?.rate) return;
    try {
      await updateInterestDetail(detailId, { date: draft.date, rate: Number(draft.rate) });
      setEditDraft((prev) => {
        const { [detailId]: _removed, ...rest } = prev;
        return rest;
      });
      notifySuccess("Tarief bijgewerkt.");
      load();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Bijwerken mislukt");
    }
  };

  const handleDelete = async (detailId: string) => {
    const confirmed = await AlertService.showConfirm(
      "Weet je het zeker?",
      "Dit tarief wordt verwijderd uit de geschiedenis. Vonnissen die al berekend zijn, wijzigen niet met terugwerkende kracht.",
      "Ja, verwijderen",
      "Annuleren",
    );
    if (!confirmed) return;
    try {
      await deleteInterestDetail(detailId);
      notifySuccess("Tarief verwijderd.");
      load();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Verwijderen mislukt");
    }
  };

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Rentetarieven
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Beheer de tariefgeschiedenis die het systeem gebruikt om de wettelijke rente te berekenen bij een vonnis
          (zie sectie "Wettelijke rente" op het scherm Vonnis registreren). Een nieuw tarief geldt vanaf de
          opgegeven datum tot het volgende tarief.
        </Typography>
      </Stack>

      <Stack spacing={3}>
        {interestTypes.map((type) => {
          const sortedDetails = [...type.details].sort((a, b) => a.date.localeCompare(b.date));
          const columns: ListColumn<DetailRow>[] = [
            {
              key: "date",
              label: "Geldig vanaf",
              render: (row) =>
                editDraft[row.id] ? (
                  <TextField
                    type="date"
                    size="small"
                    value={editDraft[row.id].date}
                    onChange={(e) =>
                      setEditDraft((prev) => ({ ...prev, [row.id]: { ...prev[row.id], date: e.target.value } }))
                    }
                  />
                ) : (
                  row.date
                ),
            },
            {
              key: "rate",
              label: "Tarief (% per jaar)",
              align: "right",
              render: (row) =>
                editDraft[row.id] ? (
                  <TextField
                    type="number"
                    size="small"
                    inputProps={{ step: "any" }}
                    value={editDraft[row.id].rate}
                    onChange={(e) =>
                      setEditDraft((prev) => ({ ...prev, [row.id]: { ...prev[row.id], rate: e.target.value } }))
                    }
                  />
                ) : (
                  `${row.rate}%`
                ),
            },
            {
              key: "actions",
              label: "Acties",
              align: "right",
              render: (row) => (
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {editDraft[row.id] ? (
                    <IconButton size="small" color="primary" onClick={() => handleSaveEdit(row.id)}>
                      <SaveIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Button
                      size="small"
                      sx={{ textTransform: "none" }}
                      onClick={() =>
                        setEditDraft((prev) => ({ ...prev, [row.id]: { date: row.date, rate: String(row.rate) } }))
                      }
                    >
                      Wijzigen
                    </Button>
                  )}
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ),
            },
          ];

          return (
            <Card key={type.id} variant="outlined">
              <CardHeader
                title={type.name}
                action={
                  <Chip
                    size="small"
                    label={type.calculation_type === "FIXED" ? "Vast tarief per periode" : "Variabel tarief"}
                  />
                }
              />
              <CardContent>
                <ResponsiveListTable
                  columns={columns}
                  rows={sortedDetails}
                  getRowKey={(row) => row.id}
                  emptyMessage="Nog geen tarieven geregistreerd."
                />

                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                  <TextField
                    type="date"
                    size="small"
                    label="Geldig vanaf"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={newRowDraft[type.id]?.date ?? ""}
                    onChange={(e) =>
                      setNewRowDraft((prev) => ({
                        ...prev,
                        [type.id]: { date: e.target.value, rate: prev[type.id]?.rate ?? "" },
                      }))
                    }
                  />
                  <TextField
                    type="number"
                    size="small"
                    label="Tarief (%)"
                    inputProps={{ step: "any" }}
                    value={newRowDraft[type.id]?.rate ?? ""}
                    onChange={(e) =>
                      setNewRowDraft((prev) => ({
                        ...prev,
                        [type.id]: { date: prev[type.id]?.date ?? "", rate: e.target.value },
                      }))
                    }
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    sx={{ textTransform: "none" }}
                    onClick={() => handleAdd(type.id)}
                  >
                    Tarief toevoegen
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}

        {!loading && interestTypes.length === 0 && (
          <Alert severity="info">Er zijn nog geen rentetariefsoorten geconfigureerd.</Alert>
        )}
      </Stack>
    </Container>
  );
}
