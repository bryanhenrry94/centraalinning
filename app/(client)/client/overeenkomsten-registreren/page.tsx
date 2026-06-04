"use client";

import React, { useEffect, useState } from "react";
import {
  Container,
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";

import GroupIcon from "@mui/icons-material/Group";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import {
  ContractPartyInput,
  ContractPartySchema,
} from "@/lib/validations/contract_party";
import { useSession } from "next-auth/react";
import { getTenantById } from "@/actions/tenant";
import { CreateContractInput } from "@/lib/validations/contract";

import { NumericFormat } from "react-number-format";

const steps = ["Gegevens", "Overeenkomst", "Documenten", "Overzicht"];

interface Document {
  id: string;
  name: string;
  size: string;
  date: string;
}

const OvereenkomstenRegistrerenPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const { data: session } = useSession();

  // const [contractParties, setContractParties] = useState<ContractPartyInput[]>(
  //   [],
  // );

  const today = new Date().toISOString().split("T")[0];

  const [contractData, setContractData] = useState<CreateContractInput>({
    contractDate: "",
    startDate: "",
    endDate: "",
    amount: 0,
    installmentCount: 0,
    installmentAmount: 0,
    description: "",
    parties: [],
    documents: [],
  });

  useEffect(() => {
    if (!session) return;
    if (!session.user.tenant_id) return;

    const loadedParties = async () => {
      const tenantResult = await getTenantById(session.user.tenant_id);

      if (!tenantResult) return;

      const partyAContract: ContractPartyInput = {
        role: "PARTY_A",
        full_name: tenantResult?.tenant.name,
        identification: tenantResult?.tenant.kvk || "",
        email: session.user?.email || "",
        contact_person: session.user?.fullname || "",
        phone: session.user?.phone || "",
        address: tenantResult?.tenant.address || "",
      };

      const partyBContract: ContractPartyInput = {
        role: "PARTY_B",
        full_name: "",
        identification: "",
        email: "",
        contact_person: "",
        phone: "",
      };

      const initialContractData: CreateContractInput = {
        contractDate: "",
        startDate: "",
        endDate: "",
        amount: 0,
        installmentCount: 0,
        installmentAmount: 0,
        description: "",
        parties: [partyAContract, partyBContract],
        documents: [],
      };

      setContractData(initialContractData);
    };

    loadedParties();
  }, [session]);

  const [documents, setDocuments] = useState<Document[]>([]);

  const [openDialog, setOpenDialog] = useState(false);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleAgreementChange = (field: string, value: any) => {
    setContractData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
  };

  const handleChangeParty = (index: number, field: string, value: string) => {
    const updatedParties = [...contractData.parties];
    updatedParties[index] = {
      ...updatedParties[index],
      [field]: value,
    };
    setContractData({ ...contractData, parties: updatedParties });
  };

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Overeenkomst registreren
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Registreer een financiële overeenkomst binnen de CFSB-samenwerking
          </Typography>
        </Box>

        {/* Stepper */}
        <Box sx={{ mb: 8 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Step Content */}
        <Box sx={{ mb: 4 }}>
          {/* Step 1: Gegevens */}
          {activeStep === 0 && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <GroupIcon sx={{ mr: 2, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Partijen
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Vul de gegevens in van beide partijen die betrokken zijn bij
                deze overeenkomst.
              </Typography>

              <Grid container spacing={3}>
                {contractData.parties.map((party, index) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <Box
                      key={index}
                      component={Paper}
                      elevation={1}
                      sx={{ p: 3, width: "100%", height: "450px" }}
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
                            Partij &nbsp;
                            <Typography variant="caption" color="textSecondary">
                              (Uw onderneming)
                            </Typography>
                          </Typography>
                        </Box>
                        {index > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              const updatedParties = [...contractData.parties];
                              updatedParties.splice(index, 1);
                              setContractData({
                                ...contractData,
                                parties: updatedParties,
                              });
                            }}
                          >
                            <CloseIcon />
                          </IconButton>
                        )}
                      </Box>
                      <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
                        <TextField
                          fullWidth
                          label="KvK-nummer (optioneel)"
                          value={party.identification || ""}
                          onChange={(e) =>
                            handleChangeParty(
                              index,
                              "identification",
                              e.target.value,
                            )
                          }
                          size="small"
                        />

                        <TextField
                          fullWidth
                          label="Bedrijfsnaam"
                          value={party.full_name}
                          onChange={(e) =>
                            handleChangeParty(
                              index,
                              "full_name",
                              e.target.value,
                            )
                          }
                          size="small"
                        />

                        <TextField
                          fullWidth
                          label="Adres"
                          name="address"
                          value={party.address || ""}
                          onChange={(e) =>
                            handleChangeParty(index, "address", e.target.value)
                          }
                          size="small"
                        />

                        <TextField
                          fullWidth
                          label="Contactperson"
                          value={party.contact_person || ""}
                          onChange={(e) =>
                            handleChangeParty(
                              index,
                              "contact_person",
                              e.target.value,
                            )
                          }
                          size="small"
                        />

                        <TextField
                          fullWidth
                          label="Telefoonnummer"
                          value={party.phone || ""}
                          onChange={(e) =>
                            handleChangeParty(index, "phone", e.target.value)
                          }
                          size="small"
                        />

                        <TextField
                          fullWidth
                          label="E-mailadres"
                          type="email"
                          value={party.email || ""}
                          onChange={(e) =>
                            handleChangeParty(index, "email", e.target.value)
                          }
                          size="small"
                        />

                        {index > 0 && (
                          <Stack direction="row" spacing={2}>
                            <TextField
                              label="Geboortedatum"
                              type="date"
                              fullWidth
                              size="small"
                              value={
                                party.birth_date
                                  ? new Date(party.birth_date)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
                              // error={!!errors.birth_date}
                              // helperText={errors.birth_date?.message}
                              onChange={(e) =>
                                handleChangeParty(
                                  index,
                                  "birth_date",
                                  e.target.value
                                    ? new Date(e.target.value).toISOString()
                                    : "",
                                )
                              }
                              slotProps={{
                                inputLabel: { shrink: true },
                              }}
                            />

                            <TextField
                              fullWidth
                              label="Geboorteplaats"
                              value={party.birth_place || ""}
                              onChange={(e) =>
                                handleChangeParty(
                                  index,
                                  "birth_place",
                                  e.target.value,
                                )
                              }
                              size="small"
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
                sx={{ mt: 2 }}
                onClick={() => {
                  const newParty: ContractPartyInput = {
                    role: "PARTY_B",
                    full_name: "",
                    identification: "",
                    email: "",
                    contact_person: "",
                    phone: "",
                    address: "",
                    birth_date: "",
                    birth_place: "",
                  };

                  setContractData({
                    ...contractData,
                    parties: [...contractData.parties, newParty],
                  });
                }}
              >
                + Partij toevoegen
              </Button>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Waarom registreren bij CFSB?
                </Typography>
                <Typography variant="body2">
                  Door uw overeenkomst te registreren binnen de
                  CFSB-samenwerking creëert u zekerheid, controle en
                  bescherming. Bij problemen kunnen wij u snel ondersteunen met
                  administratieve en juridische opvolging.
                </Typography>
              </Alert>
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

              <Card>
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        label="Datum overeenkomst"
                        type="date"
                        fullWidth
                        size="small"
                        value={
                          contractData.contractDate
                            ? new Date(contractData.contractDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value;

                          setContractData((prev) => ({
                            ...prev,
                            contractDate: date,
                            startDate: date,
                          }));
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        label="Overeenkomstbedrag"
                        value={contractData.amount}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        prefix="$ "
                        onValueChange={(values) => {
                          handleAgreementChange("amount", values.value);
                        }}
                        size="small"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        label="Startdatum"
                        type="date"
                        fullWidth
                        size="small"
                        value={
                          contractData.startDate
                            ? new Date(contractData.startDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleAgreementChange(
                            "startDate",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : "",
                          )
                        }
                        slotProps={{
                          inputLabel: { shrink: true },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        label="Vervaldatum"
                        type="date"
                        fullWidth
                        size="small"
                        value={
                          contractData.endDate
                            ? new Date(contractData.endDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleAgreementChange(
                            "endDate",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : "",
                          )
                        }
                        slotProps={{
                          inputLabel: { shrink: true },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Aantal termijnen"
                        value={contractData.installmentCount}
                        type="number"
                        onChange={(e) => {
                          const installmentCount = parseInt(e.target.value, 10);
                          const installmentAmount =
                            installmentCount > 0
                              ? contractData.amount / installmentCount
                              : 0;

                          setContractData((prev) => ({
                            ...prev,
                            installmentCount: installmentCount,
                            installmentAmount: installmentAmount,
                          }));
                        }}
                        size="small"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        label="Termijnbedrag"
                        value={contractData.installmentAmount}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        prefix="$ "
                        onValueChange={(values) => {
                          handleAgreementChange(
                            "installmentAmount",
                            values.value,
                          );
                        }}
                        size="small"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 12 }}>
                      <TextField
                        fullWidth
                        label="Omschrijving overeenkomst"
                        value={contractData.description}
                        onChange={(e) =>
                          handleAgreementChange("description", e.target.value)
                        }
                        multiline
                        rows={3}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
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
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Upload de relevante documenten voor deze overeenkomst.
              </Typography>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    fullWidth
                    sx={{ py: 2, mb: 2 }}
                  >
                    Document uploaden
                  </Button>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    display="block"
                  >
                    Ondersteunde formaten: PDF, PNG, JPG - Max. 10 MB per
                    bestand
                  </Typography>
                </CardContent>
              </Card>

              <TableContainer component={Card}>
                <Table>
                  <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Bestandsnaam
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grootte</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">
                        Acties
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.name}</TableCell>
                        <TableCell>{doc.size}</TableCell>
                        <TableCell align="center">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Step 4: Overzicht */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 4 }}>
                Overzicht
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                  >
                    Partijen
                  </Typography>
                  {/* <Typography variant="body2">{partyA.name}</Typography>
                  <Typography variant="body2">{partyB.name}</Typography> */}
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                  >
                    Bedrag en periode
                  </Typography>
                  <Typography variant="body2">
                    {contractData.amount} • {contractData.startDate} tot{" "}
                    {contractData.endDate}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                  >
                    Documenten
                  </Typography>
                  <Typography variant="body2">
                    {documents.length} document
                    {documents.length !== 1 ? "en" : ""} geüpload
                  </Typography>
                </Box>

                <Box sx={{ pt: 2, borderTop: "1px solid #eee" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 20 }} />
                    <Typography variant="body2">
                      Klaar voor registratie
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
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
              Overeenkomst registreren
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
        </Box>
      </Container>

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Overeenkomst registreren</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Weet u zeker dat u deze overeenkomst wilt registreren? Deze actie
            kan niet ongedaan worden gemaakt.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuleren</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#ff9800" }}
            onClick={() => {
              setOpenDialog(false);
              alert("Overeenkomst succesvol geregistreerd!");
            }}
          >
            Bevestigen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OvereenkomstenRegistrerenPage;
