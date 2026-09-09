"use client";

import React, { useRef } from "react";
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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ArticleIcon from "@mui/icons-material/Article";
import DeleteIcon from "@mui/icons-material/Delete";
import { notifyError } from "@/shared/ui/notifications";

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB, ver hint "Toegestane formaten" hieronder
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const ACCEPT_ATTR = "application/pdf,image/jpeg,image/png";

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
// A propósito sin Dropzone (pedido sponsor): ocupaba demasiado espacio —
// un botón simple con input oculto alcanza para este caso de uso.
export const FarWizardStepDocuments: React.FC<FarWizardStepDocumentsProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const accepted: File[] = [];
    let hasInvalidType = false;
    let hasTooLarge = false;

    for (const file of selected) {
      const isValidType = ACCEPTED_EXTENSIONS.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );
      if (!isValidType) {
        hasInvalidType = true;
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        hasTooLarge = true;
        continue;
      }
      accepted.push(file);
    }

    if (hasTooLarge)
      notifyError("Bestand te groot. Maximaal 1 MB per bestand.");
    if (hasInvalidType)
      notifyError(
        "Ongeldig bestandsformaat. Alleen PDF, JPG of PNG toegestaan.",
      );
    if (accepted.length > 0) onAddFiles(accepted);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Documenten
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Voeg eventuele bewijsstukken toe (optioneel).
        </Typography>
        {/* <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Toegestane formaten: PDF, JPG, PNG (max. 1 MB per bestand)
        </Typography> */}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept={ACCEPT_ATTR}
          onChange={handleFileChange}
        />
        <Button
          variant="outlined"
          startIcon={<AttachFileIcon />}
          sx={{ textTransform: "none" }}
          onClick={() => fileInputRef.current?.click()}
        >
          Document toevoegen
        </Button>

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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 1,
                    }}
                  >
                    <ArticleIcon color="action" fontSize="small" />
                    <ListItemText
                      primary={file.name}
                      secondary={formatFileSize(file.size)}
                    />
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
