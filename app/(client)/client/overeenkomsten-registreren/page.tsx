"use client";

import React, { useState } from "react";
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
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import GroupIcon from "@mui/icons-material/Group";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckIcon from "@mui/icons-material/Check";
import AttachFileIcon from "@mui/icons-material/AttachFile";

const steps = ["Gegevens", "Overeenkomst", "Documenten", "Overzicht"];

interface Party {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  kvk?: string;
}

interface Document {
  id: string;
  name: string;
  size: string;
  date: string;
}

const OvereenkomstenRegistrerenPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [partyA, setPartyA] = useState<Party>({
    name: "DAZZSOFT S.A.S.",
    contactPerson: "Bryan Navarrete",
    email: "bryan.navarrete@dazzsoft.com",
    kvk: "0993385366001",
    phone: "+593 96 943 7708",
  });

  //   const [partyB, setPartyB] = useState<Party>({
  //     name: "XYZ Construction N.V.",
  //     contactPerson: "Maria Martis",
  //     email: "info@xyzconstruction.bq",
  //     phone: "+599 796 5432",
  //     kvk: "87654321",
  //   });

  const [partyB, setPartyB] = useState<Party>({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    kvk: "",
  });

  const [agreementData, setAgreementData] = useState({
    amount: "$ 15.000,00",
    date: "07-06-2026",
    startDate: "07-06-2026",
    endDate: "01-08-2028",
    quantity: "3",
    duration: "$ 5.000,00",
    description: "",
  });

  const [documents, setDocuments] = useState<Document[]>([
    { id: "1", name: "Overeenkomst.pdf", size: "256 KB", date: "2025-01-15" },
    { id: "2", name: "Factuur.pdf", size: "125 KB", date: "2025-01-14" },
    { id: "3", name: "Offerte.pdf", size: "89 KB", date: "2025-01-13" },
    { id: "4", name: "Extra document.pdf", size: "310 KB", date: "2025-01-12" },
  ]);

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

  const handlePartyAChange = (field: keyof Party, value: string) => {
    setPartyA({ ...partyA, [field]: value });
  };

  const handlePartyBChange = (field: keyof Party, value: string) => {
    setPartyB({ ...partyB, [field]: value });
  };

  const handleAgreementChange = (field: string, value: string) => {
    setAgreementData({ ...agreementData, [field]: value });
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
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

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 3,
                }}
              >
                {/* Participante A */}
                <Box
                  component={Paper}
                  elevation={1}
                  sx={{ p: 3, width: "100%" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Partij A&nbsp;
                        <Typography variant="caption" color="textSecondary">
                          (Uw onderneming)
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                  <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Bedrijfsnaam"
                      value={partyA.name}
                      onChange={(e) =>
                        handlePartyAChange("name", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="KvK-nummer (optioneel)"
                      value={partyA.kvk || ""}
                      onChange={(e) =>
                        handlePartyAChange("kvk", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="Contactperson"
                      value={partyA.contactPerson}
                      onChange={(e) =>
                        handlePartyAChange("contactPerson", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="Telefoonnummer"
                      value={partyA.phone}
                      onChange={(e) =>
                        handlePartyAChange("phone", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="E-mailadres"
                      type="email"
                      value={partyA.email}
                      onChange={(e) =>
                        handlePartyAChange("email", e.target.value)
                      }
                      size="small"
                    />
                  </Stack>
                </Box>

                {/* Participante B */}
                <Box
                  component={Paper}
                  elevation={1}
                  sx={{ p: 3, width: "100%" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Partij B &nbsp;
                        <Typography variant="caption" color="textSecondary">
                          (Wederpartij)
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                  <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Bedrijfsnaam"
                      value={partyB.name}
                      onChange={(e) =>
                        handlePartyBChange("name", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="KvK-nummer (optioneel)"
                      value={partyB.kvk || ""}
                      onChange={(e) =>
                        handlePartyBChange("kvk", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="Contactperson"
                      value={partyB.contactPerson}
                      onChange={(e) =>
                        handlePartyBChange("contactPerson", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="Telefoonnummer"
                      value={partyB.phone}
                      onChange={(e) =>
                        handlePartyBChange("phone", e.target.value)
                      }
                      size="small"
                    />

                    <TextField
                      fullWidth
                      label="E-mailadres"
                      type="email"
                      value={partyB.email}
                      onChange={(e) =>
                        handlePartyBChange("email", e.target.value)
                      }
                      size="small"
                    />
                  </Stack>
                </Box>
              </Box>

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
                        fullWidth
                        label="Datum overeenkomst"
                        value={agreementData.date}
                        onChange={(e) =>
                          handleAgreementChange("date", e.target.value)
                        }
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Overeenkomstbedrag"
                        value={agreementData.amount}
                        onChange={(e) =>
                          handleAgreementChange("amount", e.target.value)
                        }
                        size="small"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Startdatum"
                        value={agreementData.startDate}
                        onChange={(e) =>
                          handleAgreementChange("startDate", e.target.value)
                        }
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Vervaldatum"
                        value={agreementData.endDate}
                        onChange={(e) =>
                          handleAgreementChange("endDate", e.target.value)
                        }
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Aantal termijnen"
                        value={agreementData.quantity}
                        onChange={(e) =>
                          handleAgreementChange("quantity", e.target.value)
                        }
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        label="Termijnbedrag"
                        value={agreementData.duration}
                        onChange={(e) =>
                          handleAgreementChange("duration", e.target.value)
                        }
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 12 }}>
                      <TextField
                        fullWidth
                        label="Omschrijving overeenkomst"
                        value={agreementData.description}
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
                  <Typography variant="body2">{partyA.name}</Typography>
                  <Typography variant="body2">{partyB.name}</Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1, color: "#666" }}
                  >
                    Bedrag en periode
                  </Typography>
                  <Typography variant="body2">
                    {agreementData.amount} • {agreementData.startDate} tot{" "}
                    {agreementData.endDate}
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
