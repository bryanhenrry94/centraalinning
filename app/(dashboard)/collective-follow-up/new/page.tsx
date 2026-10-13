"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { DebtorResponse } from "@/modules/collection/services/debtor.validators";
import { getInfoPersonAction } from "@/modules/collection/actions/person.actions";
import { PersonType } from "@/shared/constants/person-type";
import {
  IdentificationType,
  IDENTIFICATION_TYPE_LABELS,
} from "@/shared/constants/identification-type";
import { personTypeOptions } from "@/shared/constants/identification";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ListAltIcon from "@mui/icons-material/ListAlt";
import {
  DirectCopDocument,
  DirectCopSchema,
  CreateDirectCopInput,
} from "@/modules/collective-follow-up/services/collective-collection.validators";
import { createDirectCopAction } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { StartCopDialog } from "@/modules/collective-follow-up/components/start-cop-dialog";
import { notifyError } from "@/shared/ui/notifications";

function SectionHeader({ title }: { title: string }) {
  return (
    <Box
      sx={{
        bgcolor: "secondary.main",
        color: "white",
        px: 2,
        py: 1.5,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottom: "1px solid #e0e0e0",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
    </Box>
  );
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export default function DirectCopCreatePage() {
  const { tenant } = useTenant();
  const router = useRouter();

  const [documents, setDocuments] = useState<File[]>([]);
  const [debtor, setDebtor] = React.useState<DebtorResponse | null>(null);

  const [debtorSearchQuery, setDebtorSearchQuery] = useState("");
  const [debtorSearchResults, setDebtorSearchResults] = useState<DebtorResponse[]>([]);
  const [searchingDebtor, setSearchingDebtor] = useState(false);
  const [debtorSearchOpen, setDebtorSearchOpen] = useState(false);

  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [createdDebtClaimId, setCreatedDebtClaimId] = useState<string | null>(null);
  const [createdPrincipalAmount, setCreatedPrincipalAmount] = useState(0);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CreateDirectCopInput>({
    resolver: zodResolver(DirectCopSchema),
    defaultValues: {
      debtorId: "",
      newDebtor: {
        person_type: PersonType.INDIVIDUAL,
        identification_type: IdentificationType.CEDULA,
        identification: "",
        fullname: "",
        email: "",
        phone: "",
        address: "",
      },
      outstandingAmount: 0,
      description: "",
      originalObligationDate: undefined,
      confirmed: false,
      documents: [],
    },
  });

  const selectedPersonType = watch("newDebtor.person_type");
  const identificationTypeOptions =
    selectedPersonType === PersonType.COMPANY
      ? [IdentificationType.KVK]
      : Object.values(IdentificationType).filter((type) => type !== IdentificationType.KVK);

  React.useEffect(() => {
    const current = watch("newDebtor.identification_type");
    if (!current || !identificationTypeOptions.includes(current)) {
      setValue("newDebtor.identification_type", identificationTypeOptions[0] as IdentificationType);
    }
  }, [selectedPersonType]);

  const handleSearchPersons = async (query: string) => {
    if (!tenant?.id) return [];
    const response = await fetch(`/api/debtors/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.data;
  };

  const getDebtorFullName = (found: DebtorResponse) =>
    found.person?.person_type === "COMPANY"
      ? found.person?.business_name || ""
      : `${found.person?.first_name ?? ""} ${found.person?.last_name ?? ""}`.trim();

  const handleSearchDebtor = async () => {
    if (!debtorSearchQuery.trim()) return;
    try {
      setSearchingDebtor(true);
      const results = await handleSearchPersons(debtorSearchQuery.trim());
      setDebtorSearchResults(results);
      setDebtorSearchOpen(true);
    } finally {
      setSearchingDebtor(false);
    }
  };

  const handleSelectExistingDebtor = (found: DebtorResponse) => {
    setDebtor(found);
    setValue("debtorId", found.id, { shouldValidate: true });
    setValue("newDebtor.person_type", (found.person?.person_type as PersonType) || PersonType.INDIVIDUAL);
    setValue(
      "newDebtor.identification_type",
      (found.person?.identification_type as IdentificationType) || IdentificationType.CEDULA,
    );
    setValue("newDebtor.identification", found.person?.identification || "");
    setValue("newDebtor.fullname", getDebtorFullName(found));
    setValue("newDebtor.email", found.email || "");
    setValue("newDebtor.phone", found.person?.phone || "");
    setValue("newDebtor.address", found.person?.address || "");
    setDebtorSearchQuery(getDebtorFullName(found));
    setDebtorSearchOpen(false);
  };

  const clearSelectedExistingDebtor = () => {
    if (debtor) setDebtor(null);
    if (watch("debtorId")) setValue("debtorId", "");
  };

  const handleIdentificationBlur = async () => {
    const identificationType = watch("newDebtor.identification_type");
    const identification = watch("newDebtor.identification");
    if (!identificationType || !identification) return;

    const personInfo = await getInfoPersonAction(identificationType, identification);
    if (!personInfo) return;

    if (!watch("newDebtor.fullname")) {
      setValue(
        "newDebtor.fullname",
        personInfo.person_type === "COMPANY"
          ? personInfo.business_name || ""
          : `${personInfo.first_name ?? ""} ${personInfo.last_name ?? ""}`.trim(),
      );
    }
    if (!watch("newDebtor.email") && personInfo.email) setValue("newDebtor.email", personInfo.email);
    if (!watch("newDebtor.phone") && personInfo.phone) setValue("newDebtor.phone", personInfo.phone);
    if (!watch("newDebtor.address") && personInfo.address) setValue("newDebtor.address", personInfo.address);
  };

  const mapFileToDocument = (file: File): DirectCopDocument => ({
    file,
    fileName: file.name,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
  });

  const processFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    const validFiles = files.filter((file) => ALLOWED_TYPES.includes(file.type));
    const invalidFiles = files.filter((file) => !ALLOWED_TYPES.includes(file.type));

    if (invalidFiles.length > 0) {
      notifyError("Alleen PDF-, Word-, Excel-bestanden en afbeeldingen zijn toegestaan.");
    }
    if (validFiles.length === 0) return;

    setDocuments((prevFiles) => {
      const updatedFiles = [...prevFiles, ...validFiles];
      setValue("documents", updatedFiles.map(mapFileToDocument), {
        shouldValidate: true,
        shouldDirty: true,
      });
      return updatedFiles;
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
    event.target.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments((prevFiles) => {
      const updatedFiles = prevFiles.filter((_, i) => i !== index);
      setValue("documents", updatedFiles.map(mapFileToDocument), {
        shouldValidate: true,
        shouldDirty: true,
      });
      return updatedFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onSubmit = async (data: CreateDirectCopInput) => {
    try {
      const result = await createDirectCopAction(data);
      if (!result.success || !result.debtClaimId) {
        notifyError(result.message || "Fout bij het registreren van de Collectieve Opvolging.");
        return;
      }
      setCreatedDebtClaimId(result.debtClaimId);
      setCreatedPrincipalAmount(result.principalAmount ?? 0);
      setStartDialogOpen(true);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Onbekende fout");
    }
  };

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "flex-start" },
          justifyContent: "space-between",
          gap: 2,
          mb: { xs: 1, sm: 1.5 },
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Directe Collectieve Opvolging (COP)
          </Typography>
          <Typography color="text.secondary">
            Start een collectieve opvolging binnen de samenwerking om een gerechtelijke procedure te voorkomen.
          </Typography>
        </Box>

        <Button
          type="button"
          variant="outlined"
          startIcon={<ListAltIcon />}
          onClick={() => router.push("/collective-follow-up")}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Bekijk alle COP-dossiers
        </Button>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} sx={{ pt: { xs: 0.5, sm: 1 }, pb: { xs: 2, sm: 6 } }}>
          {/* 1. Debiteur informatie */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="1. DEBITEUR INFORMATIE" />
            <Box sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Zoek bestaande debiteur
              </Typography>

              <Stack direction="row" spacing={1} sx={{ position: "relative" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Zoek op naam, identificatienummer of e-mailadres..."
                  value={debtorSearchQuery}
                  onChange={(e) => setDebtorSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchDebtor();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearchDebtor}
                  disabled={searchingDebtor || !debtorSearchQuery.trim()}
                  startIcon={<SearchIcon />}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  Zoeken
                </Button>

                {debtorSearchOpen && (
                  <Paper
                    variant="outlined"
                    sx={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      mt: 0.5,
                      zIndex: 10,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {debtorSearchResults.length === 0 ? (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Geen debiteuren gevonden.
                        </Typography>
                      </Box>
                    ) : (
                      debtorSearchResults.map((found) => (
                        <Box
                          key={found.id}
                          onClick={() => handleSelectExistingDebtor(found)}
                          sx={{
                            p: 1.5,
                            cursor: "pointer",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {getDebtorFullName(found)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {found.person?.identification} · {found.email}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Paper>
                )}
              </Stack>

              <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mt: 2, mb: 2 }}>
                Zoek een bestaande debiteur of vul de gegevens in. Een bestaande registratie wordt automatisch
                gekoppeld.
              </Alert>

              {errors.debtorId && (
                <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
                  {errors.debtorId.message}
                </Typography>
              )}

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="newDebtor.person_type"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        required
                        size="small"
                        label="Persoonstype"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(e) => {
                          field.onChange(e);
                          clearSelectedExistingDebtor();
                        }}
                      >
                        {personTypeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="newDebtor.identification_type"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        required
                        size="small"
                        label="Identificatietype"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(e) => {
                          field.onChange(e);
                          clearSelectedExistingDebtor();
                        }}
                      >
                        {identificationTypeOptions.map((type) => (
                          <MenuItem key={type} value={type}>
                            {IDENTIFICATION_TYPE_LABELS[type]}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="newDebtor.identification"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        fullWidth
                        required
                        size="small"
                        label="Identificatienummer"
                        placeholder="Bijv. 12345678"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(e) => {
                          field.onChange(e);
                          clearSelectedExistingDebtor();
                        }}
                        onBlur={() => {
                          field.onBlur();
                          handleIdentificationBlur();
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="newDebtor.fullname"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        fullWidth
                        required
                        size="small"
                        label="Naam"
                        placeholder="Volledige naam"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(e) => {
                          field.onChange(e);
                          clearSelectedExistingDebtor();
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="newDebtor.email"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        fullWidth
                        required
                        type="email"
                        size="small"
                        label="E-mailadres"
                        placeholder="voorbeeld@e-mail.com"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(e) => {
                          field.onChange(e);
                          clearSelectedExistingDebtor();
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="newDebtor.phone"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        fullWidth
                        size="small"
                        label="Telefoonnummer"
                        placeholder="Bijv. +599 700 0000"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="newDebtor.address"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        fullWidth
                        size="small"
                        label="Adres"
                        placeholder="Volledig adres"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* 2. Vordering informatie */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="2. VORDERING INFORMATIE" />
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="outstandingAmount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        required
                        label="Openstaand saldo (USD)"
                        value={field.value ?? ""}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        prefix="$ "
                        size="small"
                        onValueChange={(values) => field.onChange(Number(values.value) || 0)}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="originalObligationDate"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        fullWidth
                        required
                        type="date"
                        size="small"
                        label="Datum oorspronkelijke betalingsverplichting"
                        InputLabelProps={{ shrink: true }}
                        value={field.value ? field.value.toISOString().slice(0, 10) : ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                        }
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        label="Omschrijving / grondslag"
                        placeholder="Geef een korte omschrijving van de vordering (bijv. factuurnummer, overeenkomst, geleverde diensten, etc.)."
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* 3. Bewijsstukken */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="3. BEWIJS VAN EERDERE ADMINISTRATIEVE OPVOLGING" />
            <Box sx={{ p: 2 }}>
              <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mb: 2 }}>
                Voeg minimaal één document toe waaruit blijkt dat deze betalingsachterstand eerder administratief
                is opgevolgd, bijvoorbeeld een aanmaning, sommatie, ingebrekestelling of andere relevante
                correspondentie.
              </Alert>

              <Button
                variant="outlined"
                component="label"
                color="secondary"
                startIcon={<AttachFileIcon />}
                sx={{ textTransform: "none" }}
              >
                Documenten toevoegen
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={handleFileChange}
                />
              </Button>

              {documents.length > 0 && (
                <Stack spacing={1.5} mt={2}>
                  {documents.map((file, index) => (
                    <Box
                      key={`${file.name}-${index}`}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      border={1}
                      borderColor="divider"
                      borderRadius={1}
                      p={1.5}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error" type="button" onClick={() => removeDocument(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}

              {errors.documents && (
                <Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>
                  {errors.documents.message}
                </Typography>
              )}
            </Box>
          </Paper>

          {/* 4. Bevestiging */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="4. BEVESTIGING" />
            <Box sx={{ p: 2 }}>
              <Controller
                name="confirmed"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Ik bevestig dat de bovenstaande gegevens en bewijsstukken juist zijn en dat de vordering eerder administratief is opgevolgd."
                  />
                )}
              />
              {errors.confirmed && (
                <Typography color="error" variant="caption" sx={{ display: "block", mt: 0.5 }}>
                  {errors.confirmed.message}
                </Typography>
              )}
            </Box>
          </Paper>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mt: 2 }}>
            <Button
              type="button"
              color="inherit"
              onClick={() => router.push("/workstation")}
              sx={{ textTransform: "none" }}
            >
              Annuleren
            </Button>

            <Button
              variant="contained"
              type="submit"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              sx={{ textTransform: "none" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Bezig met registreren..." : "Volgende"}
            </Button>
          </Box>
        </Stack>
      </form>

      {createdDebtClaimId && (
        <StartCopDialog
          open={startDialogOpen}
          onClose={() => setStartDialogOpen(false)}
          debtClaimId={createdDebtClaimId}
          principalAmount={createdPrincipalAmount}
          onStarted={(collectionId) => router.push(`/collective-follow-up/${collectionId}`)}
        />
      )}
    </Container>
  );
}
