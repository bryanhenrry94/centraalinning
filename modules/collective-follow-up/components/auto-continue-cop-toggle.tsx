"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FormControlLabel, Switch, Stack, Typography, CircularProgress } from "@mui/material";

import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { UserRole } from "@/shared/constants/user-role";
import {
  getAutoContinueSetting,
  setAutoContinueSetting,
} from "@/modules/collective-follow-up/actions/collective-collection.actions";

// Toggle self-service para el TENANT_ADMIN: preconfigurar que AOP continúe
// automáticamente a COP en cuanto el expediente llegue al punto de decisión
// (BLK_NOTIFICATION), sin tener que hacer clic manualmente en "Collectieve
// Opvolging starten". No aparece para otros roles.
export const AutoContinueCopToggle: React.FC = () => {
  const { data: session } = useSession();
  const isTenantAdmin = !!session?.user?.roles?.includes(UserRole.TENANT_ADMIN);

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isTenantAdmin || !session?.user?.tenant_id) {
      setLoading(false);
      return;
    }
    getAutoContinueSetting(session.user.tenant_id)
      .then(setEnabled)
      .catch(() => notifyError("Kon de instelling niet laden"))
      .finally(() => setLoading(false));
  }, [isTenantAdmin, session?.user?.tenant_id]);

  if (!isTenantAdmin) return null;
  if (loading) return <CircularProgress size={20} />;

  const handleChange = async (checked: boolean) => {
    setSaving(true);
    try {
      await setAutoContinueSetting({ enabled: checked });
      setEnabled(checked);
      notifySuccess("Instelling opgeslagen");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Kon de instelling niet opslaan";
      notifyError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            disabled={saving}
            onChange={(e) => handleChange(e.target.checked)}
          />
        }
        label="Automatisch doorgaan naar Collectieve Opvolging (COP)"
      />
      <Typography variant="caption" color="text.secondary">
        Als deze optie actief is, wordt COP automatisch aangevraagd zodra een AOP-dossier het
        beslispunt bereikt — de startvergoeding (5%) moet nog steeds betaald worden voordat COP
        actief wordt.
      </Typography>
    </Stack>
  );
};
