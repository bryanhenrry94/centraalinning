"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import {
  createAdminJurisdiction,
  getAdminJurisdictions,
  updateAdminJurisdiction,
} from "@/modules/admin/actions/admin.actions";

type Jurisdiction = Awaited<ReturnType<typeof getAdminJurisdictions>>[number];

type FormState = {
  code: string;
  name: string;
  rolloutOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  rolloutOrder: "0",
  isActive: false,
};

function toForm(j: Jurisdiction): FormState {
  return {
    code: j.code,
    name: j.name,
    rolloutOrder: String(j.rolloutOrder),
    isActive: j.isActive,
  };
}

interface JurisdictionFormDialogProps {
  open: boolean;
  jurisdiction: Jurisdiction | null;
  onClose: () => void;
  onSaved: () => void;
}

// Alta/edición de una isla/país (punto 13/14 del análisis CFSB) — el
// formulario es genérico a propósito (código, nombre, país, orden de
// rollout): agregar un país nuevo (Holanda, etc.) es llenar estos campos,
// nunca tocar código.
export function JurisdictionFormDialog({ open, jurisdiction, onClose, onSaved }: JurisdictionFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = !!jurisdiction;

  useEffect(() => {
    if (open) {
      setForm(jurisdiction ? toForm(jurisdiction) : EMPTY_FORM);
    }
  }, [open, jurisdiction]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        rolloutOrder: Number(form.rolloutOrder) || 0,
        isActive: form.isActive,
      };

      if (isEdit && jurisdiction) {
        await updateAdminJurisdiction(jurisdiction.id, payload);
        notifySuccess("Jurisdictie bijgewerkt");
      } else {
        await createAdminJurisdiction(payload);
        notifySuccess("Jurisdictie aangemaakt");
      }
      onSaved();
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Jurisdictie bewerken" : "Nieuwe jurisdictie"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Naam"
              placeholder="bv. Bonaire"
              fullWidth
              size="small"
              value={form.name}
              onChange={set("name")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Code"
              placeholder="bv. BON"
              fullWidth
              size="small"
              value={form.code}
              onChange={set("code")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Rolloutvolgorde"
              type="number"
              fullWidth
              size="small"
              value={form.rolloutOrder}
              onChange={set("rolloutOrder")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="Actief (zichtbaar/bruikbaar als jurisdictie)"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Annuleren
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          Opslaan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
