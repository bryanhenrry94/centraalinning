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
  Divider,
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
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  BlockadeDocument,
  BlockadeSchema,
  CreateBlockadeInput,
} from "@/modules/blockade/services/blockade.validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBlockadeAction,
  updatePaymentReference,
} from "@/modules/blockade/actions/create-blockade";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import CloseIcon from "@mui/icons-material/Close";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { formatCurrency } from "@/shared/utils/formatters";
import { useRouter } from "next/navigation";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { getParameterForTenantAction } from "@/modules/settings/actions/parameter.actions";

// Herbruikte sectiekop (donkerblauwe balk) voor de vier genummerde
// stappen van het formulier — zelfde stijl als voorheen alleen op
// "BLOKKADE INFORMATIE" stond, nu consistent op alle vier.
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

  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Imágenes
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export default function BlockCreatePage() {
  const { tenant } = useTenant();

  const router = useRouter();

  // Estados locales para manejar los documentos y el deudor seleccionado
  const [documents, setDocuments] = useState<File[]>([]);

  const [debtor, setDebtor] = React.useState<DebtorResponse | null>(null);

  // Búsqueda de debiteur existente en CFSB (sección 1 del formulario)
  const [debtorSearchQuery, setDebtorSearchQuery] = useState("");
  const [debtorSearchResults, setDebtorSearchResults] = useState<
    DebtorResponse[]
  >([]);
  const [searchingDebtor, setSearchingDebtor] = useState(false);
  const [debtorSearchOpen, setDebtorSearchOpen] = useState(false);

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] =
    useState<CreateBlockadeInput>();

  const [amountService, setAmountService] = useState<number>(35.0);
  const [abbRate, setAbbRate] = useState<number>(0);

  // Prijs in het parameter is exclusief ABB — de eindgebruiker betaalt en
  // ziet altijd prijs + 6% ABB bovenop (nooit ABB die uit het totaal wordt
  // teruggerekend, zelfde regel als BLC/Financieel Rapport/COP).
  const abbAmount = Number(((amountService * abbRate) / 100).toFixed(2));
  const totalAmount = Number((amountService + abbAmount).toFixed(2));

  useEffect(() => {
    if (!tenant?.id) return;

    const fetchParameter = async () => {
      try {
        const parameter = await getParameterForTenantAction();
        setAmountService(parameter?.blockade_registration_pricing ?? 35);
        setAbbRate(parameter?.abb_rate ?? 0);
      } catch (err) {
        console.error("Error fetching parameter:", err);
      }
    };

    fetchParameter();
  }, [tenant?.id]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CreateBlockadeInput>({
    resolver: zodResolver(BlockadeSchema),
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
      amount: 0,
      reason: "UNPAID_PAYMENT",
      reasonNote: "",
      confirmed: false,
      documents: [],
    },
  });

  const selectedReason = watch("reason");
  const reasonNoteRequired =
    selectedReason === "EXTERNAL_PROCEDURE_COMPLETED" ||
    selectedReason === "OTHER";

  const selectedPersonType = watch("newDebtor.person_type");
  const identificationTypeOptions =
    selectedPersonType === PersonType.COMPANY
      ? [IdentificationType.KVK]
      : Object.values(IdentificationType).filter(
          (type) => type !== IdentificationType.KVK,
        );

  useEffect(() => {
    const current = watch("newDebtor.identification_type");
    if (!current || !identificationTypeOptions.includes(current)) {
      setValue(
        "newDebtor.identification_type",
        identificationTypeOptions[0] as IdentificationType,
      );
    }
  }, [selectedPersonType]);

  const onSubmit = async (data: CreateBlockadeInput) => {
    // Validación con react-hook-form + zod ya pasó
    setPendingFormValues(data);
    setShowCostDialog(true);
  };

  const handleSearchPersons = async (query: string) => {
    if (!tenant?.id) return [];

    const response = await fetch(
      `/api/debtors/search?q=${encodeURIComponent(query)}`,
    );
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
    setValue(
      "newDebtor.person_type",
      (found.person?.person_type as PersonType) || PersonType.INDIVIDUAL,
    );
    setValue(
      "newDebtor.identification_type",
      (found.person?.identification_type as IdentificationType) ||
        IdentificationType.CEDULA,
    );
    setValue("newDebtor.identification", found.person?.identification || "");
    setValue("newDebtor.fullname", getDebtorFullName(found));
    setValue("newDebtor.email", found.email || "");
    setValue("newDebtor.phone", found.person?.phone || "");
    setValue("newDebtor.address", found.person?.address || "");

    setDebtorSearchQuery(getDebtorFullName(found));
    setDebtorSearchOpen(false);
  };

  // Elke handmatige wijziging aan de identificatie betekent dat de
  // gebruiker mogelijk een andere persoon bedoelt dan de eerder
  // geselecteerde debiteur — de gekoppelde debtorId vervalt dan, zodat bij
  // het opslaan opnieuw via DebtorService.findOrCreate wordt gezocht/
  // aangemaakt (idempotent: dezelfde identificatie levert dezelfde persoon
  // op, dus dit is veilig).
  const clearSelectedExistingDebtor = () => {
    if (debtor) setDebtor(null);
    if (watch("debtorId")) setValue("debtorId", "");
  };

  // Zelfde patroon als de FAR-wizard (far-wizard-step-debtor.tsx): als de
  // persoon al bestaat in het systeem (cross-tenant, via Person.identification),
  // worden alleen de nog lege velden aangevuld — nooit wat de gebruiker al
  // heeft ingetypt overschrijven.
  const handleIdentificationBlur = async () => {
    const identificationType = watch("newDebtor.identification_type");
    const identification = watch("newDebtor.identification");
    if (!identificationType || !identification) return;

    const personInfo = await getInfoPersonAction(
      identificationType,
      identification,
    );
    if (!personInfo) return;

    if (!watch("newDebtor.fullname")) {
      setValue(
        "newDebtor.fullname",
        personInfo.person_type === "COMPANY"
          ? personInfo.business_name || ""
          : `${personInfo.first_name ?? ""} ${personInfo.last_name ?? ""}`.trim(),
      );
    }
    if (!watch("newDebtor.email") && personInfo.email)
      setValue("newDebtor.email", personInfo.email);
    if (!watch("newDebtor.phone") && personInfo.phone)
      setValue("newDebtor.phone", personInfo.phone);
    if (!watch("newDebtor.address") && personInfo.address)
      setValue("newDebtor.address", personInfo.address);
  };

  const mapFileToDocument = (file: File): BlockadeDocument => {
    return {
      file: file,
      fileName: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    };
  };

  // logica de manejo de documentos (agregar, eliminar, etc.) se puede implementar aquí
  const processFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);

    const validFiles = files.filter((file) =>
      ALLOWED_TYPES.includes(file.type),
    );

    const invalidFiles = files.filter(
      (file) => !ALLOWED_TYPES.includes(file.type),
    );

    if (invalidFiles.length > 0) {
      notifyError(
        "Alleen PDF-, Word-, Excel-bestanden en afbeeldingen zijn toegestaan.",
      );
    }

    if (validFiles.length === 0) {
      return;
    }

    setDocuments((prevFiles) => {
      const updatedFiles = [...prevFiles, ...validFiles];

      const mappedDocuments = updatedFiles.map(mapFileToDocument);

      setValue("documents", mappedDocuments, {
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

      const mappedDocuments = updatedFiles.map(mapFileToDocument);

      setValue("documents", mappedDocuments, {
        shouldValidate: true,
        shouldDirty: true,
      });

      return updatedFiles;
    });
  };

  const downloadDocument = (file: File) => {
    const url = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();

    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePaymentFailed = async (_paymentId: string) => {
    setShowCostDialog(false);
    notifyError("Betaling mislukt. Probeer het opnieuw.");

    // espera 3 segundos antes de resetear el formulario para que el usuario pueda ver la notificación
    setTimeout(() => {
      router.push("/blocks");
    }, 3000);
  };

  const handlePaymentConfirmed = async (paymentId: string) => {
    setShowCostDialog(false);
    notifyInfo("Betaling bevestigd. Blokkade wordt geregistreerd...");

    // espera 3 segundos antes de redirigir a Diensten para que el usuario
    // pueda ver la notificación.
    setTimeout(() => {
      router.push("/workstation");
    }, 3000);
  };

  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (!pendingFormValues) {
      notifyError("Geen formuliergegevens beschikbaar");
      return { success: false, error: "Geen formuliergegevens beschikbaar" };
    }

    if (totalAmount <= 0) {
      notifyError("Het servicebedrag moet groter zijn dan 0");
      return { success: false, error: "Servicebedrag is 0" };
    }

    const resBlockade = await createBlockadeAction(
      pendingFormValues,
      tenant?.id || "",
    );

    if (!resBlockade.success) {
      return {
        success: false,
        error:
          resBlockade.message ||
          "Fout bij het registreren van de blokkade. Probeer het opnieuw.",
      };
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({
        amount: totalAmount,
        currency: "USD",
        description: "Blokkade (BLK)",
        payment_type: PaymentType.BLOK_CHECK,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const message = data.error || "Fout bij het aanmaken van de betaling";
      notifyError(message);
      return { success: false, error: message };
    }

    // relaciona de daadwerkelijke betaling met de blokkade (DRAFT)
    const linkResult = await updatePaymentReference(resBlockade.id!, {
      paymentId: data.paymentId,
    });

    if (!linkResult.success) {
      notifyError(
        linkResult.message || "Kon de betaling niet koppelen aan de blokkade.",
      );
      return {
        success: false,
        error: linkResult.message || "Kon de betaling niet koppelen",
      };
    }

    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
    };
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
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
            Nieuwe blokkade registreren
          </Typography>

          <Typography color="text.secondary">
            Registreer een economische blokkade
          </Typography>
        </Box>

        <Button
          type="button"
          variant="outlined"
          startIcon={<ListAltIcon />}
          onClick={() => router.push("/blocks")}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Bekijk alle blokkades
        </Button>
      </Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack
          spacing={3}
          sx={{ pt: { xs: 0.5, sm: 1 }, pb: { xs: 2, sm: 6 } }}
        >
          {/* 1. Debiteur informatie */}
          <Paper
            component="section"
            sx={{
              elevation: 1,
              borderRadius: 1,
              mb: 2,
              overflow: "hidden",
            }}
          >
            <SectionHeader title="1. DEBITEUR INFORMATIE" />

            <Box sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Zoek debiteur in CFSB *
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

              <Alert
                icon={<InfoOutlinedIcon fontSize="inherit" />}
                severity="info"
                sx={{ mt: 2, mb: 2 }}
              >
                Zoek een bestaande debiteur of vul de gegevens in. CFSB koppelt
                of registreert de debiteur automatisch.
              </Alert>

              {errors.debtorId && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", display: "block", mt: 0.5 }}
                >
                  {errors.debtorId.message}
                </Typography>
              )}

              {debtor && !debtor.email && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Deze debiteur heeft geen e-mailadres geregistreerd. CFSB kan
                  de blokkade dan niet per e-mail bevestigen.
                </Alert>
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
                        placeholder="Vul identificatienummer in"
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
                        placeholder="Wordt automatisch ingevuld (of vul in bij nieuwe debiteur)"
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
                        placeholder="Vul e-mailadres in"
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
                        placeholder="Vul telefoonnummer in"
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
                        placeholder="Vul adres in"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* 2. Blokkade informatie */}
          <Paper
            component="section"
            sx={{
              elevation: 1,
              borderRadius: 1,
              mb: 2,
              overflow: "hidden",
            }}
          >
            <SectionHeader title="2. BLOKKADE INFORMATIE" />

            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        required
                        label="Openstaande vordering (USD)"
                        value={field.value ?? ""}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        prefix="$ "
                        size="small"
                        onValueChange={(values) => {
                          field.onChange(Number(values.value) || 0);
                        }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="reason"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value="Uitblijven van betaling"
                        label="Reden blokkade"
                        fullWidth
                        size="small"
                        disabled
                      />
                    )}
                  />
                </Grid>
                {reasonNoteRequired && (
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="reasonNote"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          value={field.value ?? ""}
                          fullWidth
                          multiline
                          minRows={2}
                          size="small"
                          label="Beschrijf het externe traject / de reden"
                          error={!!errors.reasonNote}
                          helperText={errors.reasonNote?.message}
                        />
                      )}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </Paper>

          {/* 3. Bewijsstukken */}
          <Paper
            component="section"
            sx={{
              elevation: 1,
              borderRadius: 1,
              mb: 2,
              overflow: "hidden",
            }}
          >
            <SectionHeader title="3. BEWIJSSTUKKEN" />

            <Box sx={{ p: 2 }}>
              <Button
                variant="outlined"
                component="label"
                color="secondary"
                startIcon={<AttachFileIcon />}
                sx={{ textTransform: "none" }}
              >
                Document toevoegen
                <input
                  type="file"
                  hidden
                  multiple
                  accept="
                    .pdf,
                    .doc,.docx,
                    .xls,.xlsx,
                    .png,.jpg,.jpeg,.gif,.webp
                  "
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

                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          type="button"
                          onClick={() => downloadDocument(file)}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="error"
                          type="button"
                          onClick={() => removeDocument(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}

              {errors.documents && (
                <Typography
                  color="error"
                  variant="caption"
                  sx={{ mt: 1, display: "block" }}
                >
                  {errors.documents.message}
                </Typography>
              )}
            </Box>
          </Paper>

          {/* 4. Bevestiging */}
          <Paper
            component="section"
            sx={{
              elevation: 1,
              borderRadius: 1,
              mb: 2,
              overflow: "hidden",
            }}
          >
            <SectionHeader title="4. BEVESTIGING" />

            <Box sx={{ p: 2 }}>
              <Controller
                name="confirmed"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Ik bevestig dat de bovenstaande gegevens en eventuele bewijsstukken juist zijn."
                  />
                )}
              />
              {errors.confirmed && (
                <Typography
                  color="error"
                  variant="caption"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  {errors.confirmed.message}
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Botones */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              mt: 2,
            }}
          >
            <Button
              type="button"
              color="inherit"
              onClick={() => router.push("/blocks")}
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
              disabled={isSubmitting || !!(debtor && !debtor.email)}
            >
              {isSubmitting
                ? "Bezig met registreren..."
                : "Blokkade registreren"}
            </Button>
          </Box>
        </Stack>
      </form>

      {/* Dialoogvenster kostenbevesting */}
      <Dialog
        open={showCostDialog}
        onClose={() => setShowCostDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3} alignItems="center">
            {/* Titel */}
            <Stack spacing={1} textAlign="center">
              <Typography variant="h5" fontWeight={700}>
                Betaling bevestigen
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Deze service vereist betaling voordat u de blokkade registreert.
              </Typography>
            </Stack>

            {/* Prijs */}
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                bgcolor: "background.default",
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Servicewaarde (excl. ABB)
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(amountService)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    ABB {abbRate}%
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(abbAmount)}
                  </Typography>
                </Stack>

                <Divider />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    Totaal
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color="primary.main"
                  >
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {/* Bericht */}
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Als u doorgaat, wordt u doorgestuurd naar het beveiligde
              betalingsproces.
            </Typography>

            {/* Acties */}
            <Stack direction="row" spacing={2} width="100%">
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<CloseIcon />}
                onClick={() => setShowCostDialog(false)}
                sx={{ textTransform: "none" }}
              >
                Annuleren
              </Button>

              <PaymentIntent
                onCreateTransaction={handleCreateTransaction}
                onPaymentConfirmed={handlePaymentConfirmed}
                onPaymentFailed={handlePaymentFailed}
              />
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
