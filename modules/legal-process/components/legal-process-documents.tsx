"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  deleteLegalProcessDocument,
  getLegalProcessDocuments,
  uploadLegalProcessDocument,
} from "@/modules/legal-process/actions/legal-process.actions";
import { formatDateTime } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";

const CATEGORY_OPTIONS = [
  { value: "SENTENCIA", label: "Vonnis" },
  { value: "NOTIFICACION", label: "Akte of proces-verbaal van betekening" },
  { value: "EMBARGO", label: "Executiedocumenten" },
  { value: "CORRESPONDENCIA", label: "Correspondentie" },
  { value: "ACUERDO", label: "Betalingsregeling" },
  { value: "OTRO", label: "Overig procesdocument" },
];

type LegalProcessDocument = Awaited<ReturnType<typeof getLegalProcessDocuments>>[number];

export const LegalProcessDocuments: React.FC<{
  legalProcessId: string;
  canUpload: boolean;
}> = ({ legalProcessId, canUpload }) => {
  const [documents, setDocuments] = useState<LegalProcessDocument[]>([]);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setDocuments(await getLegalProcessDocuments(legalProcessId));
    } catch (error) {
      notifyError("Kon documenten niet laden");
    }
  }, [legalProcessId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setUploading(true);
      await uploadLegalProcessDocument(legalProcessId, file, category);
      notifySuccess("Document geüpload");
      await load();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Upload mislukt");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    const confirmed = await AlertService.showConfirm(
      "Document verwijderen?",
      "Deze actie kan niet ongedaan worden gemaakt.",
      "Ja, verwijderen",
      "Annuleren",
    );
    if (!confirmed) return;

    try {
      await deleteLegalProcessDocument(documentId);
      notifySuccess("Document verwijderd");
      await load();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Verwijderen mislukt");
    }
  };

  return (
    <Stack spacing={2}>
      {canUpload && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
          <TextField
            select
            size="small"
            label="Type document"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={uploading}
          >
            Document uploaden
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
        </Stack>
      )}

      {documents.length === 0 ? (
        <Box sx={{ color: "text.secondary", py: 1 }}>Nog geen documenten.</Box>
      ) : (
        <List disablePadding>
          {documents.map((doc, index) => (
            <Box key={doc.id}>
              <ListItem
                disablePadding
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={`/api/legal-processes/documents/${doc.id}/download`}
                    >
                      Downloaden
                    </Button>
                    {canUpload && (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Verwijderen"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                }
              >
                <ListItemText
                  primary={doc.originalName}
                  secondary={`${doc.category ?? ""} · ${formatDateTime(doc.createdAt.toString())}`}
                />
              </ListItem>
              {index < documents.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Stack>
  );
};
