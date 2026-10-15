"use client";
import React from "react";
import { Box, Divider, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { notifyError } from "@/shared/ui/notifications";
import { uploadVerdictSupportingDocument } from "@/modules/legal-process/actions/legal-process.actions";

interface VerdictDocumentsSectionProps {
  uploadContext?: { caseTransferId?: string | null; legalProcessId?: string | null };
}

type DocumentFieldPrefix = "verdict_document" | "service_document" | "other_document";

interface SlotConfig {
  prefix: DocumentFieldPrefix;
  label: string;
  required?: boolean;
}

const SLOTS: SlotConfig[] = [
  { prefix: "verdict_document", label: "Vonnisdocument", required: true },
  { prefix: "service_document", label: "Betekening vonnis (optioneel)" },
  { prefix: "other_document", label: "Overige documenten (optioneel)" },
];

// Documenten-stap (CCP-scherm): 3 vaste slots, cada uno un solo documento.
// Reusa exactamente el mismo mecanismo de upload-antes-de-que-exista-la-fila
// que ya usan AttachmentSection/ServiceCostsSection por renglón.
const VerdictDocumentsSection: React.FC<VerdictDocumentsSectionProps> = ({ uploadContext }) => {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Record<string, any>>();

  const handleUpload = async (prefix: DocumentFieldPrefix, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadContext) return;

    try {
      const metadata = await uploadVerdictSupportingDocument(uploadContext, file);
      setValue(`${prefix}_storage_key`, metadata.document_storage_key, { shouldValidate: true });
      setValue(`${prefix}_original_name`, metadata.document_original_name);
      setValue(`${prefix}_mime_type`, metadata.document_mime_type);
      setValue(`${prefix}_size`, metadata.document_size);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Uploaden mislukt");
    }
  };

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
      <Box sx={{ px: 2, pb: 1 }}>
        <Stack divider={<Divider flexItem />}>
          {SLOTS.map((slot) => (
            <Controller
              key={slot.prefix}
              name={`${slot.prefix}_original_name`}
              control={control}
              render={({ field }) => {
                const hasFile = Boolean(field.value);
                const errorMessage = slot.required
                  ? (errors as any)[`${slot.prefix}_storage_key`]?.message
                  : undefined;

                return (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.5 }}>
                    <Tooltip title={hasFile ? "Bestand vervangen" : "Bestand kiezen"}>
                      <span>
                        <IconButton
                          component="label"
                          size="small"
                          disabled={!uploadContext}
                          color={hasFile ? "success" : errorMessage ? "error" : "default"}
                          sx={{
                            border: "1px solid",
                            borderColor: hasFile
                              ? "success.main"
                              : errorMessage
                                ? "error.main"
                                : "divider",
                          }}
                        >
                          <AttachFileIcon fontSize="small" />
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={(e) => handleUpload(slot.prefix, e)}
                          />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {slot.label}
                        {slot.required && (
                          <Box component="span" sx={{ color: "error.main" }}>
                            {" "}
                            *
                          </Box>
                        )}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={errorMessage ? "error.main" : "text.secondary"}
                        noWrap
                        sx={{ display: "block" }}
                      >
                        {errorMessage
                          ? String(errorMessage)
                          : field.value || "Geen bestand geselecteerd"}
                      </Typography>
                    </Box>
                  </Stack>
                );
              }}
            />
          ))}
        </Stack>
      </Box>
    </Paper>
  );
};

export default VerdictDocumentsSection;
