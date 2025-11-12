"use client";

import React from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import { useSession } from "next-auth/react";
import { notifyInfo } from "@/lib/notifications";

interface EmployeeImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void; // opcional: refrescar la lista
}

export const EmployeeImportDialog: React.FC<EmployeeImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { data: session } = useSession();
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleDownloadTemplate = async () => {
    const response = await fetch("/api/employees/template");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-template.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.name.endsWith(".xlsx")) {
      setFile(selected);
    } else {
      notifyInfo("Selecteer een geldig .xlsx-bestand");
    }
  };

  const handleUpload = async () => {
    if (!file) return notifyInfo("Selecteer eerst een bestand");
    if (!session?.user?.tenant_id)
      return notifyInfo("❌ Tenant ID niet gevonden");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", session.user.tenant_id);

      const response = await fetch("/api/employees/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Import mislukt");

      const result = await response.json();
      notifyInfo(`${result.count} medewerkers geïmporteerd`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      notifyInfo("Er is een fout opgetreden bij het uploaden");
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Medewerkers importeren</DialogTitle>
      <DialogContent>
        <Typography variant="body2" mb={2}>
          Download de Excel-sjabloon, vul de gegevens in en upload het bestand
          om medewerkers massaal te importeren.
        </Typography>

        <Stack spacing={2} alignItems="center" mt={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
          >
            Download Sjabloon
          </Button>

          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
          >
            {file ? "Bestand geselecteerd" : "Bestand selecteren"}
            <input
              type="file"
              accept=".xlsx"
              hidden
              onChange={handleFileChange}
            />
          </Button>

          {file && (
            <Typography variant="caption" color="textSecondary">
              📄 {file.name}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Annuleren
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Importeren"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
