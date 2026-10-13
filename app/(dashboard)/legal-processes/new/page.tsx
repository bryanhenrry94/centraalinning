"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
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
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { formatCurrency } from "@/shared/utils/formatters";
import {
  DirectGopTransferSchema,
  CreateDirectGopTransferInput,
} from "@/modules/legal-process/services/case-transfer.validators";
import { createDirectGopTransferAction } from "@/modules/legal-process/actions/case-transfer.actions";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";

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
  "image/png",
  "image/jpeg",
];

export default function DirectGopCreatePage() {
  const { tenant } = useTenant();
  const router = useRouter();

  const [verdictFile, setVerdictFile] = useState<File | null>(null);
  const [debtor, setDebtor] = React.useState<DebtorResponse | null>(null);
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);

  // Flow sponsor: bevestigen -> overzicht -> verzenden. "Naar overzicht"
  // verstuurt nog niets — pas de knop "Verzenden" in het overzichtscherm
  // roept createDirectGopTransferAction aan.
  const [overzichtOpen, setOverzichtOpen] = useState(false);
  const [pendingData, setPendingData] = useState<CreateDirectGopTransferInput | null>(null);
  const [sending, setSending] = useState(false);

  const [debtorSearchQuery, setDebtorSearchQuery] = useState("");
  const [debtorSearchResults, setDebtorSearchResults] = useState<DebtorResponse[]>([]);
  const [searchingDebtor, setSearchingDebtor] = useState(false);
  const [debtorSearchOpen, setDebtorSearchOpen] = useState(false);

  useEffect(() => {
    getActiveBailiffsDirectory()
      .then(setBailiffs)
      .catch(() => notifyError("Kon deurwaarders niet laden"));
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CreateDirectGopTransferInput>({
    resolver: zodResolver(DirectGopTransferSchema),
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
      verdictNumber: "",
      verdictDate: undefined,
      sentenceAmount: 0,
      legalInterest: undefined,
      bailiffId: "",
      confirmed: false,
    },
  });

  const selectedPersonType = watch("newDebtor.person_type");
  const identificationTypeOptions =
    selectedPersonType === PersonType.COMPANY
      ? [IdentificationType.KVK]
      : Object.values(IdentificationType).filter((type) => type !== IdentificationType.KVK);

  useEffect(() => {
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      notifyError("Alleen PDF, Word of een afbeelding is toegestaan voor het vonnis.");
      return;
    }

    setVerdictFile(file);
    setValue(
      "verdictDocument",
      { file, fileName: file.name, originalName: file.name, mimeType: file.type, size: file.size },
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // "Naar overzicht" verstuurt niets — toont enkel het overzichtscherm. Het
  // daadwerkelijke verzenden gebeurt pas via handleConfirmSend.
  const onSubmit = async (data: CreateDirectGopTransferInput) => {
    setPendingData(data);
    setOverzichtOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!pendingData) return;
    try {
      setSending(true);
      const result = await createDirectGopTransferAction(pendingData);
      if (!result.success) {
        notifyError(result.message || "Fout bij het registreren van het vonnis.");
        return;
      }
      setOverzichtOpen(false);
      notifySuccess(
        "Vonnis geregistreerd. Het dossier staat nu bij de gekozen deurwaarder, in afwachting van acceptatie.",
      );
      router.push("/legal-processes");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Onbekende fout");
    } finally {
      setSending(false);
    }
  };

  const selectedBailiffName = bailiffs.find((b) => b.id === pendingData?.bailiffId)?.fullname ?? "-";

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
            Directe Gerechtelijke Opvolging (GOP)
          </Typography>
          <Typography color="text.secondary">
            Registreer uw vonnis voor verdere opvolging.
          </Typography>
        </Box>

        <Button
          type="button"
          variant="outlined"
          startIcon={<ListAltIcon />}
          onClick={() => router.push("/legal-processes")}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Bekijk alle GOP-dossiers
        </Button>
      </Box>

      <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mb: 3 }}>
        Gebruik dit formulier als u al over een gerechtelijk vonnis beschikt uit een procedure die buiten CFSB
        heeft plaatsgevonden. U betaalt nog niet nu — eerst moet de gekozen deurwaarder het dossier accepteren.
        Pas wanneer zowel u als de deurwaarder de CFSB-kosten betaald hebben, wordt het GOP officieel actief.
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} sx={{ pt: { xs: 0.5, sm: 1 }, pb: { xs: 2, sm: 6 } }}>
          {/* 1. Debiteur informatie */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="1. DEBITEUR" />
            <Box sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Zoek debiteur *
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
                Zoek een bestaande debiteur of voeg een nieuwe debiteur toe. Een bestaande registratie wordt
                automatisch gekoppeld.
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
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* 2. Vonnisgegevens */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="2. VONNISGEGEVENS" />
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="verdictNumber"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        required
                        size="small"
                        label="Vonnisnummer / Zaaknummer"
                        placeholder="Bijv. 2024/00123"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="verdictDate"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        fullWidth
                        required
                        type="date"
                        size="small"
                        label="Datum vonnis"
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

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="sentenceAmount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        required
                        label="Veroordelingsbedrag (USD)"
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
                    name="legalInterest"
                    control={control}
                    render={({ field, fieldState }) => (
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        label="Wettelijke rente (USD)"
                        value={field.value ?? ""}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        prefix="$ "
                        size="small"
                        onValueChange={(values) => field.onChange(values.value ? Number(values.value) : undefined)}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message ?? "Indien van toepassing."}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* 3. Deurwaarder selecteren */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="3. DEURWAARDER SELECTEREN" />
            <Box sx={{ p: 2 }}>
              <Controller
                name="bailiffId"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    required
                    size="small"
                    label="Kies een aangesloten deurwaarder"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  >
                    {bailiffs.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.fullname}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mt: 2 }}>
                De gekozen deurwaarder ontvangt uw verzoek en controleert het vonnis voordat de registratie wordt
                geëffectueerd.
              </Alert>
            </Box>
          </Paper>

          {/* 4. Documenten */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="4. DOCUMENTEN" />
            <Box sx={{ p: 2 }}>
              <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mb: 2 }}>
                Upload het gerechtelijke vonnis (verplicht) en eventueel aanvullende documenten.
              </Alert>

              <Button
                variant="outlined"
                component="label"
                color="secondary"
                startIcon={<AttachFileIcon />}
                sx={{ textTransform: "none" }}
              >
                Document(en) toevoegen
                <input type="file" hidden accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileChange} />
              </Button>

              {verdictFile && (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  border={1}
                  borderColor="divider"
                  borderRadius={1}
                  p={1.5}
                  mt={2}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {verdictFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(verdictFile.size)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    type="button"
                    onClick={() => {
                      setVerdictFile(null);
                      setValue("verdictDocument", undefined as any, { shouldValidate: true });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}

              {errors.verdictDocument && (
                <Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>
                  Het gerechtelijk vonnis is verplicht.
                </Typography>
              )}
            </Box>
          </Paper>

          {/* 5. Bevestiging */}
          <Paper component="section" sx={{ elevation: 1, borderRadius: 1, mb: 2, overflow: "hidden" }}>
            <SectionHeader title="5. BEVESTIGING" />
            <Box sx={{ p: 2 }}>
              <Controller
                name="confirmed"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Ik bevestig dat de bovenstaande gegevens en documenten juist zijn en dat er een geldig gerechtelijk vonnis bestaat."
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
              {isSubmitting ? "Bezig met registreren..." : "Naar overzicht"}
            </Button>
          </Box>
        </Stack>
      </form>

      {/* Overzicht — pas hier wordt daadwerkelijk verzonden (sponsor-flow:
          bevestigen -> overzicht -> verzenden -> GOP-concept). */}
      <Dialog open={overzichtOpen} onClose={() => setOverzichtOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "secondary.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 600,
          }}
        >
          Overzicht
          <IconButton onClick={() => setOverzichtOpen(false)} sx={{ color: "white" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {pendingData && (
            <Stack spacing={2}>
              <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info">
                Controleer de gegevens voordat u verzendt. U betaalt nog niet — eerst moet de gekozen deurwaarder
                het dossier accepteren.
              </Alert>

              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Debiteur
                </Typography>
                <Typography variant="body2">{pendingData.newDebtor?.fullname}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {pendingData.newDebtor?.identification} · {pendingData.newDebtor?.email}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Vonnisgegevens
                </Typography>
                <Typography variant="body2">Vonnisnummer / Zaaknummer: {pendingData.verdictNumber}</Typography>
                <Typography variant="body2">
                  Datum vonnis: {pendingData.verdictDate ? pendingData.verdictDate.toLocaleDateString("nl-NL") : "-"}
                </Typography>
                <Typography variant="body2">
                  Veroordelingsbedrag: {formatCurrency(pendingData.sentenceAmount)}
                </Typography>
                <Typography variant="body2">
                  Wettelijke rente: {pendingData.legalInterest ? formatCurrency(pendingData.legalInterest) : "-"}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Deurwaarder
                </Typography>
                <Typography variant="body2">{selectedBailiffName}</Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Gerechtelijk vonnis
                </Typography>
                <Typography variant="body2">{verdictFile?.name}</Typography>
              </Box>

              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 1 }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setOverzichtOpen(false)}
                  sx={{ textTransform: "none" }}
                >
                  Terug
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  onClick={handleConfirmSend}
                  disabled={sending}
                  sx={{ textTransform: "none" }}
                >
                  {sending ? "Bezig met verzenden..." : "Verzenden"}
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
