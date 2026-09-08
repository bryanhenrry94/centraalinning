"use client";

import React from "react";
import Dropzone from "react-dropzone";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ArticleIcon from "@mui/icons-material/Article";
import DeleteIcon from "@mui/icons-material/Delete";
import { notifyError } from "@/shared/ui/notifications";

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB, ver hint "Toegestane formaten" hieronder
const ACCEPTED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

interface FarWizardStepDocumentsProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Stap 3 van 4 — "Documenten". Optioneel: se puede avanzar sin adjuntar
// nada. Los archivos quedan en memoria (File[]) hasta el submit final del
// wizard ("Registreren en betalen"), porque hasta que no exista el
// FinancialAgreement no hay a qué entidad adjuntarlos en el storage.
export const FarWizardStepDocuments: React.FC<FarWizardStepDocumentsProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Documenten
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Voeg eventuele bewijsstukken toe (optioneel).
        </Typography>

        <Dropzone
          onDrop={(accepted) => onAddFiles(accepted)}
          onDropRejected={(rejections) => {
            const tooLarge = rejections.some((r) =>
              r.errors.some((e) => e.code === "file-too-large"),
            );
            notifyError(
              tooLarge
                ? "Bestand te groot. Maximaal 1 MB per bestand."
                : "Ongeldig bestandsformaat. Alleen PDF, JPG of PNG toegestaan.",
            );
          }}
          accept={ACCEPTED_MIME_TYPES}
          maxSize={MAX_FILE_SIZE_BYTES}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <Box
              {...getRootProps()}
              sx={{
                border: "2px dashed",
                borderColor: isDragActive ? "primary.main" : "divider",
                borderRadius: 2,
                p: { xs: 3, sm: 5 },
                textAlign: "center",
                cursor: "pointer",
                bgcolor: isDragActive ? "action.hover" : "background.default",
                transition: "background-color 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  bgcolor: "action.selected",
                  borderRadius: "50%",
                  width: 64,
                  height: 64,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <CloudUploadOutlinedIcon color="primary" fontSize="large" />
              </Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                Sleep bestanden hiernaartoe of klik om te uploaden
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Toegestane formaten: PDF, JPG, PNG (max. 1 MB per bestand)
              </Typography>
              <Button variant="outlined" sx={{ textTransform: "none" }}>
                Nog een document toevoegen
              </Button>
              <input {...getInputProps()} />
            </Box>
          )}
        </Dropzone>

        {files.length > 0 && (
          <List sx={{ mt: 2 }} disablePadding>
            {files.map((file, index) => (
              <Box key={`${file.name}-${index}`}>
                <ListItem
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      aria-label="Verwijderen"
                      onClick={() => onRemoveFile(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                    <ArticleIcon color="action" fontSize="small" />
                    <ListItemText primary={file.name} secondary={formatFileSize(file.size)} />
                  </Box>
                </ListItem>
                {index < files.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
