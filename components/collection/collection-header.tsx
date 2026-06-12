import React from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Modal,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import CollectionForm from "@/components/collection/collection-form";

interface CollectionHeaderProps {
  onRefresh?: () => void;
}

export const CollectionHeader = ({ onRefresh }: CollectionHeaderProps) => {
  const [open, setOpen] = React.useState(false);

  const handleOpenModal = () => setOpen(true);
  const handleCloseModal = () => setOpen(false);

  const handleSave = () => {};

  return (
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
          <IconButton onClick={onRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
          <Button onClick={handleOpenModal} variant="contained" color="primary">
            NIEUWE VORDERING
          </Button>
        </Stack>
        <Modal
          open={open || false}
          onClose={handleCloseModal}
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
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                NIEUWE VORDERING
              </Typography>
              <IconButton onClick={handleCloseModal} sx={{ color: "white" }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <CollectionForm onSave={handleSave} />
          </Paper>
        </Modal>
      </Box>
    </Box>
  );
};
