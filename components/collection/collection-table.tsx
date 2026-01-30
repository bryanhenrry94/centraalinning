"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Modal,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useTenant } from "@/hooks/useTenant";
import { CollectionCaseResponse } from "@/lib/validations/collection";
import SearchIcon from "@mui/icons-material/Search";
import RefresIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import CollectionForm from "./collection-form";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { getAllCollectionCases } from "@/actions/collection-case";
import { notifyError, notifyInfo, notifyWarning } from "@/lib/notifications";
import { createSentooPayment } from "@/actions/sentoo.actions";

const CollectionTable = () => {
  const router = useRouter();
  const { tenant } = useTenant();
  const [collectionCases, setCollectionCases] = React.useState<
    CollectionCaseResponse[]
  >([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const fetchInvoices = async () => {
    if (!tenant?.id) return;

    try {
      setLoading(true);
      const params = {
        tenant_id: tenant.id,
      };
      const data = await getAllCollectionCases(params);
      setCollectionCases(data);
    } catch (error) {
      console.error("Error fetching collection cases:", error);
      notifyError("Fout bij het ophalen van vorderingen.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!tenant?.id) return;

    fetchInvoices();
  }, [tenant?.id]);

  const handleEdit = (id: string) => {
    router.push(`/dashboard/collections/${id}`);
  };

  const handleSave = () => {
    fetchInvoices();
  };

  const handleNewPayment = async () => {
    const res = await createSentooPayment({
      amount: 2500,
      description: "Pago suscripción",
      reference: crypto.randomUUID(),
    });

    if (!res.success) {
      notifyWarning("El banco rechazó el pago. Intenta otro monto.");
      return;
    }

    console.log("payment created:", res.payment);

    notifyInfo("Redirigiendo al portal de pagos...");
    window.location.href = res.payment?.url || "";
  };

  return (
    <Box mt={2}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography variant="h5" gutterBottom>
            OVERZICHT VORDERING
          </Typography>
          <Box display="flex" alignItems="center">
            <TextField
              variant="outlined"
              size="small"
              placeholder="Zoek naar..."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
          </Box>
        </Box>
        <Box>
          <Stack spacing={2} direction="row">
            <IconButton onClick={fetchInvoices} color="primary">
              <RefresIcon />
            </IconButton>
            <Button
              onClick={handleNewPayment}
              variant="contained"
              color="primary"
            >
              NUEVO PAGO
            </Button>
            <Button onClick={handleOpen} variant="contained" color="primary">
              NIEUWE VORDERING
            </Button>
          </Stack>
          <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Paper
              component="section"
              sx={{
                mt: 2,
                elevation: 1,
                borderRadius: 1,
                overflow: "hidden",
                mb: 2,
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 400,
              }}
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
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600 }}
                >
                  NIEUWE VORDERING
                </Typography>
                <IconButton onClick={handleClose} sx={{ color: "white" }}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <CollectionForm onSave={handleSave} />
            </Paper>
          </Modal>
        </Box>
      </Box>
      {loading && <Typography>Loading...</Typography>}
      <TableContainer component={"div"}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Datum vordering
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Referentienummer
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Reactietermijn
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Debiteurnaam
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Vordering
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Te betalen
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Te ontvangen
              </TableCell>

              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Status
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Actie
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {collectionCases.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell sx={{ textAlign: "center" }}>
                  {formatDate(invoice.issue_date?.toString() || "")}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  {invoice.reference_number}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  {formatDate(invoice.due_date?.toString() || "")}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  {invoice.debtor.email}
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  {formatCurrency(invoice.amount_original)}
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  {formatCurrency(invoice.fee_amount + invoice.abb_amount)}
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  {formatCurrency(invoice.total_to_receive)}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  {invoice.status}
                </TableCell>
                {/* <TableCell>{actions(invoice)}</TableCell> */}
                <TableCell sx={{ textAlign: "center" }}>
                  <IconButton
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                      handleEdit(invoice.id)
                    }
                  >
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CollectionTable;
