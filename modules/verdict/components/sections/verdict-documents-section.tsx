"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { useFieldArray, useFormContext } from "react-hook-form";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import { notifyError } from "@/shared/ui/notifications";
import { uploadVerdictSupportingDocument } from "@/modules/legal-process/actions/legal-process.actions";

interface VerdictDocumentsSectionProps {
  uploadContext?: { caseTransferId?: string | null; legalProcessId?: string | null };
}

// Documenten-stap (CCP-scherm): lijst met vrije documenten (geen vaste
// slots meer) — net als LegalProcessDocuments op het GOP-detailscherm:
// uploaden, tonen in een lijst, verwijderen bij vergissing.
const VerdictDocumentsSection: React.FC<VerdictDocumentsSectionProps> = ({ uploadContext }) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<Record<string, any>>();
  const [uploading, setUploading] = useState(false);

  const { fields, append, remove } = useFieldArray({ control, name: "documents" });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !uploadContext) return;

    setUploading(true);
    try {
      for (const file of files) {
        const metadata = await uploadVerdictSupportingDocument(uploadContext, file);
        append({
          storage_key: metadata.document_storage_key,
          original_name: metadata.document_original_name,
          mime_type: metadata.document_mime_type,
          size: metadata.document_size,
        });
      }
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Uploaden mislukt");
    } finally {
      setUploading(false);
    }
  };

  const arrayErrorMessage = (errors as any)?.documents?.message as string | undefined;

  return (
    <Paper component="section" sx={{ elevation: 1, borderRadius: 1, overflow: "hidden", mb: 2 }}>
      <Box
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          px: 2,
          py: 1.5,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
          DOCUMENTEN
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        <Button
          component="label"
          variant="outlined"
          size="small"
          startIcon={<UploadFileIcon />}
          disabled={!uploadContext || uploading}
          sx={{ textTransform: "none" }}
        >
          Document toevoegen
          <input
            type="file"
            hidden
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleUpload}
          />
        </Button>

        {arrayErrorMessage && (
          <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 1 }}>
            {arrayErrorMessage}
          </Typography>
        )}

        {fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Nog geen documenten toegevoegd.
          </Typography>
        ) : (
          <List disablePadding sx={{ mt: 1 }}>
            {fields.map((field, index) => {
              const doc = field as unknown as {
                original_name: string;
                size?: number | null;
              };
              return (
                <Box key={field.id}>
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Verwijderen"
                        onClick={() => remove(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={doc.original_name}
                      secondary={
                        doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : undefined
                      }
                    />
                  </ListItem>
                  {index < fields.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );
};

export default VerdictDocumentsSection;
