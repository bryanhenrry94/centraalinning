"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Container,
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import GroupIcon from "@mui/icons-material/Group";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ListAltIcon from "@mui/icons-material/ListAlt";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import {
  ContractPartyInput,
  CreateContractInput,
} from "@/modules/contract/services/contract.types";
import { useSession } from "next-auth/react";

import { NumericFormat } from "react-number-format";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray } from "react-hook-form";

import { ContractSchema } from "@/modules/contract/services/contract.validators";

import { useRouter } from "next/navigation";
import { StatusContractChip } from "../StatusContractChip";
import { IdentificationType } from "@/shared/constants/identification-type";
import { identificationTypeOptions } from "@/modules/collection/components/modal-debtor-form";
import { getInfoPersonAction } from "@/modules/collection/actions/person.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { getContractTypeLabel } from "@/modules/contract/utils/contract-type";

const steps = ["Gegevens", "Overeenkomst", "Documenten", "Overzicht"];

interface Document {
  id: string;
  name: string;
  size: string;
  file: File;
}

const OvereenkomstenRegistrerenPage = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const { data: session } = useSession();

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [pendingFormValues, setPendingFormValues] =
    useState<CreateContractInput>();

  const amountService = 35;

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    getValues,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CreateContractInput>({
    resolver: zodResolver(ContractSchema),
    mode: "onChange",
    defaultValues: {
      contract_date: "",
      start_date: "",
      end_date: "",
      amount: 0,
      installment_count: 0,
      installment_amount: 0,
      description: "",
      parties: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "parties",
  });

  const parties = watch("parties");
  const contractDate = watch("contract_date");

  const [documents, setDocuments] = useState<Document[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-avance: apenas todos los campos de un paso quedan completos y
  // válidos, se salta al siguiente sin esperar clic en "Volgende" (pedido
  // del sponsor). Los refs guardan el último estado de validez conocido
  // por paso, para avanzar solo en la transición inválido → válido — así
  // "Vorige" para revisar un paso ya completo no te vuelve a empujar hacia
  // adelante de inmediato.
  const step0ValidRef = useRef(false);
  const step1ValidRef = useRef(false);

  useEffect(() => {
    const subscription = watch(async (_value, { name }) => {
      // `name` viene undefined en un reset() completo del formulario — no
      // es una edición del usuario, así que no dispara el auto-avance.
      if (!name) return;

      if (name.startsWith("parties")) {
        const isValid = await trigger("parties");

        if (isValid && !step0ValidRef.current) {
          step0ValidRef.current = true;
          setActiveStep((prev) => (prev === 0 ? 1 : prev));
        } else if (!isValid) {
          step0ValidRef.current = false;
        }

        return;
      }

      const step1Fields = [
        "contract_date",
        "start_date",
        "end_date",
        "installment_amount",
        "installment_count",
        "amount",
      ] as const;

      if (step1Fields.includes(name as (typeof step1Fields)[number])) {
        const isValid = await trigger(step1Fields);

        if (isValid && !step1ValidRef.current) {
          step1ValidRef.current = true;
          setActiveStep((prev) => (prev === 1 ? 2 : prev));
        } else if (!isValid) {
          step1ValidRef.current = false;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, trigger]);

  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (!session.user.tenant_id) return;

    const loadedParties = async () => {
      const response = await fetch("/api/tenant");

      if (!response.ok) {
        notifyError("Kon organisatiegegevens niet laden");
        return;
      }

      const tenantResult = await response.json();

      if (!tenantResult) return;

      const partyAContract: ContractPartyInput = {
        person_type: "COMPANY",
        identification_type: "KVK",
        identification: tenantResult?.kvk || "",
        role: "PARTY_A",
        fullname: tenantResult?.name,
        email: session.user?.email || "",
        phone: session.user?.phone || "",
        address: tenantResult?.address || "",
      };

      const partyBContract: ContractPartyInput = {
        person_type: "COMPANY",
        identification_type: "KVK",
        identification: "",
        role: "PARTY_B",
        fullname: "",
        email: "",
        phone: "",
        address: "",
      };

      const initialContractData: CreateContractInput = {
        contract_type: "DELIVERY_OF_GOODS",
        contract_date: "",
        start_date: "",
        end_date: "",
        amount: 0,
        installment_count: 0,
        installment_amount: 0,
        description: "",
        parties: [partyAContract, partyBContract],
        documents: [],
        status: "DRAFT",
        reference_number: "",
      };

      reset(initialContractData);
    };

    loadedParties();
  }, [session]);

  const statusContract = watch("status");

  const handleNext = async () => {
    let isValid = false;

    switch (activeStep) {
      case 0: {
        isValid = await trigger("parties");

        if (!isValid) {
          return;
        }

        break;
      }

      case 1: {
        isValid = await trigger([
          "contract_date",
          "start_date",
          "end_date",
          "installment_amount",
          "installment_count",
          "amount",
          "description",
        ]);

        if (!isValid) {
          return;
        }

        break;
      }

      case 2: {
        isValid = documents.length > 0;

        if (!isValid) {
          return;
        }

        break;
      }

      default:
        isValid = true;
    }

    if (!isValid) {
      return;
    }

    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    const generateUUID = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    };

    const newDocuments: Document[] = files.map((file) => ({
      id: generateUUID(),
      name: file.name,
      size: formatFileSize(file.size),
      file,
    }));

    setDocuments((prev) => [...prev, ...newDocuments]);

    event.target.value = "";

    // Auto-avance: en cuanto hay al menos un documento adjunto, salta al
    // resumen sin esperar clic en "Volgende".
    if (newDocuments.length > 0) {
      setActiveStep((prev) => (prev === 2 ? 3 : prev));
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const onSubmit = async (data: CreateContractInput) => {
    // si ya se generó el pago, solo abrir la url del pago
    if (paymentUrl) {
      window.open(paymentUrl, "_blank");
      return;
    }

    // Validación con react-hook-form + zod ya pasó
    setPendingFormValues(data);
    setShowCostDialog(true);
  };

  const uploadDocuments = async (contractId: string) => {
    const uploads = documents.map(async (document) => {
      const formData = new FormData();

      formData.append("file", document.file);
      formData.append("contractId", contractId);
      formData.append("tenantId", session?.user.tenant_id ?? "");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || `Failed to upload ${document.name}`);
      }

      return response.json();
    });

    return Promise.all(uploads);
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

    if (!session?.user.tenant_id) {
      notifyError("Geen organisatie gevonden");
      return { success: false, error: "Geen organisatie gevonden" };
    }

    if (amountService <= 0) {
      notifyError("Het servicebedrag moet groter zijn dan 0");
      return { success: false, error: "Servicebedrag is 0" };
    }

    try {
      setLoading(true);

      // 1. Registreer het contract als concept (DRAFT)
      const contractResponse = await fetch("/api/contracts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingFormValues,
          tenant_id: session.user.tenant_id,
        }),
      });

      if (!contractResponse.ok) {
        const error = await contractResponse.json();

        return {
          success: false,
          error: error.message || "Kon overeenkomst niet registreren",
        };
      }

      const { contract } = await contractResponse.json();

      // 2. Upload en koppel documenten aan het contract
      if (documents.length > 0) {
        const uploadedFiles = await uploadDocuments(contract.id);

        const documentResponse = await fetch("/api/contracts/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractId: contract.id,
            documents: uploadedFiles,
          }),
        });

        if (!documentResponse.ok) {
          return {
            success: false,
            error: "Documenten konden niet worden gekoppeld",
          };
        }
      }

      // 3. Maak de betaling aan en koppel deze aan het contract.
      // De webhook activeert het contract zodra Sentoo de betaling
      // als "paid" bevestigt.
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountService,
          currency: "USD",
          description: "Financiële Afspraken Registreren (FAR)",
          payment_type: PaymentType.CONTRACT_ACTIVATION,
          contractId: contract.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.error || "Fout bij het aanmaken van de betaling";
        notifyError(message);
        return { success: false, error: message };
      }

      return {
        success: true,
        paymentId: data.paymentId,
        paymentUrl: data.paymentUrl,
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Er is een fout opgetreden",
      };
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    setShowCostDialog(false);
    setOpenDialog(false);
    notifyInfo("Betaling bevestigd. Overeenkomst wordt geactiveerd...");

    // wait a few seconds before redirecting to ensure the user sees the notification
    setTimeout(() => {
      router.push("/workstation");
    }, 3000);
  };

  const handlePaymentFailed = async () => {
    setShowCostDialog(false);
    setOpenDialog(false);
    notifyError("Betaling mislukt. Probeer het opnieuw.");
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Container
          maxWidth="lg"
          disableGutters
          sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
        >
          {/* Header */}
          <Box
            sx={{
              mb: { xs: 2, sm: 4 },
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "flex-start" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Financiële afspraak registreren
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Vul de gegevens van de betrokken partijen in en registreer uw
                financiële afspraak voor meer duidelijkheid, controle en
                bescherming.
              </Typography>
            </Box>
            <Button
              type="button"
              variant="outlined"
              startIcon={<ListAltIcon />}
              onClick={() => router.push("/contracts")}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              Bekijk alle FAR-registraties
            </Button>
          </Box>

          {/* Stepper */}
          <Box sx={{ mb: 4 }}>
            <Stepper activeStep={activeStep}>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                      {label}
                    </Box>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Step Content */}
          {/* <Box component={Paper} elevation={3} sx={{ p: 3, mb: 4 }}> */}
          <>
            {/* Step 1: Gegevens */}
            {activeStep === 0 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <GroupIcon sx={{ mr: 2, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Partijen
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  {fields.map((party, index) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={index}>
                      <Box
                        key={index}
                        component={Paper}
                        elevation={1}
                        sx={{ p: 3, width: "100%", minHeight: "400px" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {index === 0 ? "Partij" : "Wederpartij"}
                            </Typography>
                          </Box>
                          {index > 1 && (
                            <IconButton
                              size="small"
                              onClick={() => remove(index)}
                            >
                              <CloseIcon />
                            </IconButton>
                          )}
                        </Box>

                        <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Controller
                              name={`parties.${index}.person_type`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <FormControl
                                  fullWidth
                                  size="small"
                                  error={!!fieldState.error}
                                >
                                  <InputLabel id={`person-type-label-${index}`}>
                                    Type partij
                                  </InputLabel>

                                  <Select
                                    {...field}
                                    value={field.value ?? ""}
                                    labelId={`person-type-label-${index}`}
                                    label="Type partij"
                                  >
                                    <MenuItem value="">
                                      <em>Selecteer een type</em>
                                    </MenuItem>

                                    <MenuItem value="INDIVIDUAL">
                                      Persoon
                                    </MenuItem>

                                    <MenuItem value="COMPANY">Bedrijf</MenuItem>
                                  </Select>

                                  <FormHelperText>
                                    {fieldState.error?.message}
                                  </FormHelperText>
                                </FormControl>
                              )}
                            />

                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Controller
                                name={`parties.${index}.identification_type`}
                                control={control}
                                render={({ field, fieldState }) => (
                                  <FormControl
                                    fullWidth
                                    size="small"
                                    error={!!fieldState.error}
                                  >
                                    <InputLabel
                                      id={`person-type-label-${index}`}
                                    >
                                      Identificatietype
                                    </InputLabel>

                                    <Select
                                      {...field}
                                      value={field.value ?? ""}
                                      labelId={`person-type-label-${index}`}
                                      label="Identificatietype"
                                    >
                                      <MenuItem value="">
                                        <em>Selecteer een type</em>
                                      </MenuItem>

                                      {(watch(
                                        `parties.${index}.person_type`,
                                      ) === "COMPANY"
                                        ? [
                                            {
                                              value: IdentificationType.KVK,
                                              label: "KVK",
                                            },
                                          ]
                                        : identificationTypeOptions.filter(
                                            (option) =>
                                              option.value !==
                                              IdentificationType.KVK,
                                          )
                                      ).map((option) => (
                                        <MenuItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </MenuItem>
                                      ))}
                                    </Select>

                                    <FormHelperText>
                                      {fieldState.error?.message}
                                    </FormHelperText>
                                  </FormControl>
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Controller
                                name={`parties.${index}.identification`}
                                control={control}
                                render={({ field, fieldState }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Identificatienummer"
                                    size="small"
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    onBlur={async () => {
                                      field.onBlur();
                                      const personType = getValues(
                                        `parties.${index}.person_type`,
                                      );
                                      const identificationType = getValues(
                                        `parties.${index}.identification_type`,
                                      );
                                      const identification = getValues(
                                        `parties.${index}.identification`,
                                      );

                                      if (
                                        identificationType &&
                                        identification
                                      ) {
                                        const personInfo =
                                          await getInfoPersonAction(
                                            identificationType as IdentificationType,
                                            identification,
                                          );
                                        if (personInfo) {
                                          setValue(
                                            `parties.${index}.fullname`,
                                            personType === "INDIVIDUAL"
                                              ? `${personInfo.first_name} ${personInfo.last_name}`
                                              : personInfo.business_name || "",
                                          );
                                          setValue(
                                            `parties.${index}.email`,
                                            personInfo.email || "",
                                          );
                                          setValue(
                                            `parties.${index}.phone`,
                                            personInfo.phone || "",
                                          );
                                          setValue(
                                            `parties.${index}.address`,
                                            personInfo.address || "",
                                          );
                                          if (personType === "INDIVIDUAL") {
                                            setValue(
                                              `parties.${index}.birth_date`,
                                              personInfo.birth_date
                                                ? new Date(
                                                    personInfo.birth_date,
                                                  )
                                                    .toISOString()
                                                    .split("T")[0]
                                                : "",
                                            );
                                            setValue(
                                              `parties.${index}.birth_place`,
                                              personInfo.birth_place || "",
                                            );
                                          }
                                        }
                                      }
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                          </Grid>

                          <Controller
                            name={`parties.${index}.fullname`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Naam"
                                size="small"
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                              />
                            )}
                          />

                          <Controller
                            name={`parties.${index}.address`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Vestigingadres"
                                size="small"
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                              />
                            )}
                          />

                          <Controller
                            name={`parties.${index}.phone`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Telefoonnummer"
                                size="small"
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                              />
                            )}
                          />

                          <Controller
                            name={`parties.${index}.email`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="E-mailadres"
                                type="email"
                                size="small"
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                              />
                            )}
                          />

                          {watch(`parties.${index}.person_type`) ===
                            "INDIVIDUAL" && (
                            <Stack direction="row" spacing={2}>
                              <Controller
                                name={`parties.${index}.birth_date`}
                                control={control}
                                render={({ field, fieldState }) => (
                                  <TextField
                                    label="Geboortedatum"
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={
                                      field.value
                                        ? new Date(field.value)
                                            .toISOString()
                                            .split("T")[0]
                                        : ""
                                    }
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? new Date(
                                              e.target.value,
                                            ).toISOString()
                                          : "",
                                      )
                                    }
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    slotProps={{
                                      inputLabel: { shrink: true },
                                    }}
                                  />
                                )}
                              />

                              <Controller
                                name={`parties.${index}.birth_place`}
                                control={control}
                                render={({ field, fieldState }) => (
                                  <TextField
                                    {...field}
                                    value={field.value || ""}
                                    fullWidth
                                    label="Geboorteplaats"
                                    size="small"
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                  />
                                )}
                              />
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Button
                  variant="outlined"
                  sx={{ mt: 2, textTransform: "none" }}
                  onClick={() => {
                    const newParty: ContractPartyInput = {
                      person_type: "INDIVIDUAL",
                      identification_type: "CEDULA",
                      identification: "",
                      role: "PARTY_B",
                      fullname: "",
                      email: "",
                      phone: "",
                      address: "",
                      birth_date: "",
                      birth_place: "",
                    };

                    append(newParty);
                  }}
                >
                  + Partij toevoegen
                </Button>
              </Box>
            )}

            {/* Step 2: Overeenkomst */}
            {activeStep === 1 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <InsertDriveFileIcon sx={{ mr: 2, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Overeenkomstgegevens
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Controller
                      name="contract_date"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          label="Overeenkomstdatum"
                          type="date"
                          fullWidth
                          size="small"
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);

                            setValue("start_date", e.target.value, {
                              shouldValidate: true,
                            });
                          }}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          slotProps={{
                            inputLabel: { shrink: true },
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Controller
                      name="start_date"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          label="Startdatum"
                          type="date"
                          fullWidth
                          size="small"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          slotProps={{
                            inputLabel: { shrink: true },
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Controller
                      name="end_date"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          label="Vervaldatum"
                          type="date"
                          fullWidth
                          size="small"
                          value={
                            field.value
                              ? new Date(field.value)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value).toISOString()
                                : "",
                            )
                          }
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          slotProps={{
                            inputLabel: { shrink: true },
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Volgorde: eerst het termijnbedrag, dan het aantal
                      termijnen — het totaalbedrag wordt daaruit automatisch
                      berekend (niet meer omgekeerd). */}
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Controller
                      name="installment_amount"
                      control={control}
                      render={({ field, fieldState }) => (
                        <NumericFormat
                          customInput={TextField}
                          fullWidth
                          label="Termijnbedrag"
                          value={field.value ?? ""}
                          thousandSeparator
                          decimalScale={2}
                          fixedDecimalScale
                          allowNegative={false}
                          prefix="$ "
                          size="small"
                          onValueChange={(values) => {
                            const installmentAmount = Number(values.value) || 0;

                            field.onChange(installmentAmount);

                            const installmentCount =
                              getValues("installment_count") || 0;

                            setValue(
                              "amount",
                              installmentAmount * installmentCount,
                              { shouldValidate: true },
                            );
                          }}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Controller
                      name="installment_count"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          fullWidth
                          label="Aantal termijnen"
                          type="number"
                          size="small"
                          value={field.value || ""}
                          onChange={(e) => {
                            const installmentCount =
                              Number(e.target.value) || 0;

                            field.onChange(installmentCount);

                            const installmentAmount =
                              getValues("installment_amount") || 0;

                            setValue(
                              "amount",
                              installmentAmount * installmentCount,
                              { shouldValidate: true },
                            );
                          }}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Controller
                      name="amount"
                      control={control}
                      render={({ field, fieldState }) => (
                        <NumericFormat
                          customInput={TextField}
                          fullWidth
                          label="Totaalbedrag"
                          value={field.value ?? ""}
                          thousandSeparator
                          decimalScale={2}
                          fixedDecimalScale
                          allowNegative={false}
                          prefix="$ "
                          size="small"
                          disabled
                          error={!!fieldState.error}
                          helperText={
                            fieldState.error?.message ||
                            "Automatisch berekend: termijnbedrag × aantal termijnen"
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="contract_type"
                      control={control}
                      render={({ field, fieldState }) => (
                        <FormControl
                          fullWidth
                          size="small"
                          error={!!fieldState.error}
                        >
                          <InputLabel>Type overeenkomst</InputLabel>

                          <Select {...field} label="Type overeenkomst">
                            <MenuItem value="DELIVERY_OF_GOODS">
                              Levering van goederen
                            </MenuItem>
                            <MenuItem value="SERVICES">Diensten</MenuItem>
                            <MenuItem value="RENT">Huur</MenuItem>
                            <MenuItem value="LOAN">Lening</MenuItem>
                            <MenuItem value="PAYMENT_ARRANGEMENT">
                              Betalingsregeling
                            </MenuItem>
                            <MenuItem value="HUURACHTERSTAND">
                              Huurachterstand
                            </MenuItem>
                            <MenuItem value="OTHER">Overig</MenuItem>
                          </Select>

                          <FormHelperText>
                            {fieldState.error?.message}
                          </FormHelperText>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          fullWidth
                          label="Omschrijving"
                          multiline
                          rows={3}
                          size="small"
                          value={field.value || ""}
                          onChange={field.onChange}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 3: Documenten */}
            {activeStep === 2 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <AttachFileIcon sx={{ mr: 2, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Bijlagen
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 2 }}
                >
                  Upload de relevante documenten voor deze overeenkomst.
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    fullWidth
                    sx={{ py: 2, mb: 2 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Document uploaden
                  </Button>
                </Box>

                {(() => {
                  const columns: ListColumn<(typeof documents)[number]>[] = [
                    {
                      key: "name",
                      label: "Bestandsnaam",
                      render: (doc) => doc.name,
                    },
                    {
                      key: "size",
                      label: "Grootte",
                      render: (doc) => doc.size,
                      hideOnMobile: true,
                    },
                    {
                      key: "actions",
                      label: "Acties",
                      render: (doc) => (
                        <>
                          <IconButton size="small" color="primary">
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      ),
                    },
                  ];

                  return (
                    <ResponsiveListTable
                      columns={columns}
                      rows={documents}
                      getRowKey={(doc) => doc.id}
                    />
                  );
                })()}
              </Box>
            )}

            {/* Step 4: Overzicht */}
            {activeStep === 3 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 4 }}>
                  Overeenkomst
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                >
                  Betreft:
                </Typography>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  {getContractTypeLabel(watch("contract_type"))}
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                    >
                      Partijen:
                    </Typography>

                    {parties.map((party, index) => (
                      <Box
                        key={index}
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="textSecondary">
                          {index === 0 ? "Partij A:" : "Partij B:"}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: "#1976d2" }}
                        >
                          {party.fullname || "Onbekende partij"}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                    >
                      Registratiedatum:
                    </Typography>
                    <Typography variant="body2">
                      {contractDate ? formatDate(contractDate) : "Onbekend"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                    >
                      Betalingsperiode:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Startdatum
                        </Typography>
                        <Typography variant="body2">
                          {watch("start_date")
                            ? formatDate(watch("start_date"))
                            : "Onbekend"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Vervaldatum
                        </Typography>
                        <Typography variant="body2">
                          {watch("end_date")
                            ? formatDate(watch("end_date") as string)
                            : "Onbekend"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                    >
                      Betalingsoverzicht:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Aantal termijnen
                        </Typography>
                        <Typography variant="body2">
                          {watch("installment_count") || "Onbekend"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Termijnbedrag
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(watch("installment_amount") || 0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Totaalbedrag
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatCurrency(watch("amount") || 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </>
          {/* </Box> */}

          {/* Navigation Buttons */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 4, justifyContent: "space-between" }}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Vorige
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                sx={{ bgcolor: "#ff9800", "&:hover": { bgcolor: "#f57c00" } }}
                endIcon={<CheckCircleIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Registreren
              </Button>
            ) : (
              <Button
                variant="contained"
                sx={{ bgcolor: "#ff9800", "&:hover": { bgcolor: "#f57c00" } }}
                onClick={handleNext}
              >
                Volgende
              </Button>
            )}
          </Stack>
        </Container>

        {/* Confirmation Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
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
            Financiële afspraak registreren
            <IconButton
              onClick={() => setOpenDialog(false)}
              disabled={loading}
              sx={{ color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Weet u zeker dat u deze financiële afspraak wilt registreren? Deze
              actie kan niet ongedaan worden gemaakt.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Annuleren</Button>
            <Button
              variant="contained"
              sx={{ bgcolor: "#ff9800" }}
              disabled={loading}
              onClick={handleSubmit(onSubmit)}
            >
              {loading ? "Bezig met registreren..." : "Bevestigen"}
            </Button>
          </DialogActions>
        </Dialog>
      </form>

      {/* Dialog de confirmación de costo */}
      <Dialog
        open={showCostDialog}
        onClose={() => setShowCostDialog(false)}
        maxWidth="xs"
        fullWidth
      >
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
            justifyContent: "space-between",
          }}
        >
          <Box flexGrow={1} textAlign="center">
            <Typography variant="h5" fontWeight={700} color="white">
              Betaling bevestigen
            </Typography>
          </Box>
          <IconButton
            onClick={() => setShowCostDialog(false)}
            sx={{ color: "white" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3} alignItems="center">
            {/* Bericht */}
            <Stack spacing={1} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Deze service vereist betaling voordat u de overeenkomst
                registreert.
              </Typography>
            </Stack>

            {/* Prijs */}
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Servicewaarde
              </Typography>

              <Typography variant="h4" fontWeight={700} color="primary.main">
                {formatCurrency(amountService)}
              </Typography>
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
    </Box>
  );
};

export default OvereenkomstenRegistrerenPage;
