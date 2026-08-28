import React, { useState, useEffect } from "react";
import CheckIcon from "@mui/icons-material/Check";

import {
  Modal,
  Box,
  Typography,
  TextField,
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
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

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
        {(() => {
          const columns: ListColumn<DebtorResponse>[] = [
            {
              key: "name",
              label: "Naam",
              render: (debtor) => `${debtor.person?.first_name} ${debtor.person?.last_name}`,
            },
            { key: "identification", label: "Identificatie", render: (debtor) => debtor.person?.identification },
            { key: "email", label: "E-mail", render: (debtor) => debtor.email },
            {
              key: "edit",
              label: "Bewerken",
              align: "center",
              render: (debtor) => (
                <IconButton
                  color="primary"
                  onClick={() => {
                    onEdit(debtor.id);
                    onClose();
                  }}
                >
                  <EditIcon />
                </IconButton>
              ),
            },
            {
              key: "select",
              label: "Selecteren",
              align: "center",
              render: (debtor) => (
                <IconButton
                  color="primary"
                  onClick={() => {
                    onSelect(debtor);
                    onClose();
                  }}
                >
                  <CheckIcon />
                </IconButton>
              ),
            },
          ];

          return (
            <ResponsiveListTable
              columns={columns}
              rows={filteredDebtors}
              getRowKey={(debtor) => debtor.id}
              emptyMessage="Geen debiteuren gevonden."
            />
          );
        })()}
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button onClick={onClose}>Sluiten</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ModalSearchDebtor;
