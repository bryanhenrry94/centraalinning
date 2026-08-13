import React, { useState, useEffect } from "react";
import CheckIcon from "@mui/icons-material/Check";

import {
  Modal,
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import { getAllDebtors } from "@/modules/collection/actions/debtor.actions";
import {
  DebtorInput,
  DebtorCreate as DebtorCreateBase,
  DebtorResponse,
} from "@/modules/collection/services/debtor.type";

type DebtorCreate = DebtorCreateBase & { id: string };

type ModalSearchDebtorProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (debtor: DebtorInput) => void;
  onEdit: (id: string) => void;
};

const style = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  display: "inline-block",
};

const ModalSearchDebtor: React.FC<ModalSearchDebtorProps> = ({
  open,
  onClose,
  onSelect,
  onEdit,
}) => {
  const [search, setSearch] = useState("");
  const [debtors, setDebtors] = useState<DebtorResponse[]>([]);

  useEffect(() => {
    // Simulate fetching debtors
    // setDebtors(mockDebtors);
    handleGetAllDebtors(); // Fetch debtors from the service
  }, [open == true]);

  const handleGetAllDebtors = async () => {
    try {
      const fetchedDebtors = await getAllDebtors();
      setDebtors(fetchedDebtors);
    } catch (error) {
      console.error("Error fetching debtors:", error);
    }
  };

  const filteredDebtors = debtors.filter(
    (debtor) =>
      debtor.person?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      debtor.person?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      debtor.person?.identification ||
      debtor.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" mb={2}>
          Selecteer Debiteur
        </Typography>
        <TextField
          label="Zoek debiteur"
          variant="outlined"
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Naam</TableCell>
                <TableCell>Identificatie</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell align="center">Bewerken</TableCell>
                <TableCell align="center">Selecteren</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDebtors.map((debtor) => (
                <TableRow key={debtor.id}>
                  <TableCell>
                    {debtor.person?.first_name} {debtor.person?.last_name}
                  </TableCell>
                  <TableCell>{debtor.person?.identification}</TableCell>
                  <TableCell>{debtor.email}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => {
                        onEdit(debtor.id);
                        onClose();
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => {
                        onSelect(debtor);
                        onClose();
                      }}
                    >
                      <CheckIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDebtors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Geen debiteuren gevonden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button onClick={onClose}>Sluiten</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ModalSearchDebtor;
