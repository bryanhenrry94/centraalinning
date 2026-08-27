"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { answerSupportMessage } from "@/modules/support/actions/support.actions";

interface AnswerSupportDialogProps {
  open: boolean;
  onClose: () => void;
  supportMessageId: string;
  onAnswered: () => void;
}

export const AnswerSupportDialog: React.FC<AnswerSupportDialogProps> = ({
  open,
  onClose,
  supportMessageId,
  onAnswered,
}) => {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setResponse("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!response.trim()) {
      notifyError("Vul een antwoord in");
      return;
    }

    setLoading(true);
    try {
      await answerSupportMessage({ supportMessageId, response });
      notifySuccess("Antwoord verzonden");
      onAnswered();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Verzenden mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
        Bericht beantwoorden
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          label="Antwoord"
          fullWidth
          multiline
          minRows={5}
          autoFocus
          sx={{ mt: 1 }}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Verzenden
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnswerSupportDialog;
