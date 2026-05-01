"use client";

import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  Alert,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const BlokCheckPage = () => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | boolean>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!search.trim()) {
      setError("Ingrese un valor para buscar");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    // Simulación API
    setTimeout(() => {
      setResult(Math.random() > 0.5);
      setLoading(false);
    }, 1500);
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* HEADER & INFO CARD */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          backgroundColor: "#f5f7fb",
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ display: "flex", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} mb={1}>
              Blok-Check
            </Typography>
            <Typography color="text.secondary" mb={2}>
              Controleer of een debiteur een actieve blokkade heeft.
            </Typography>

            <Typography color="text.secondary">
              De Blok-Check is een controlemiddel waarmee u kunt nagaan of een
              debiteur een actieve economische blokkade of registraties heeft
              binnen de CFSB-samenwerking.{" "}
              <strong>Kosten: $30 per controle</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* SEARCH CARD */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Debiteur zoeken
          </Typography>

          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              placeholder="Voer cedula-, KVK-, paspoort- of rijbewijsnummer in"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setError("");
              }}
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              sx={{
                px: 4,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {loading ? <CircularProgress size={20} /> : "Controleren"}
            </Button>
          </Box>

          {/* ERROR */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* RESULT */}
          {result !== null && (
            <Box mt={3}>
              {result ? (
                <Alert severity="error">
                  ⚠️ Er is een blokkade gevonden voor deze debiteur
                </Alert>
              ) : (
                <Alert severity="success">✅ Geen blokkade gevonden</Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Card Uw Blok-Check aanvragen */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          mt: 4,
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Uw Blok-Check aanvragen
          </Typography>

          <TableContainer sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell>Referentie</TableCell>
                  <TableCell>Identificatie</TableCell>
                  <TableCell>Datum</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Kosten</TableCell>
                  <TableCell align="right">Actie</TableCell>
                </TableRow>
              </TableHead>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default BlokCheckPage;
