import {
  DeleteVerdictAttachment,
  DownloadVerdictAttachment,
  getAttachmentsByVerdictId,
  UploadAttachmentToVerdict,
} from "@/modules/verdict/actions/verdict.actions";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { AlertService } from "@/shared/ui/alerts";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { VerdictAttachment } from "@/modules/verdict/services/verdict-attachments.validators";
import {
  Box,
  Button,
  IconButton,
  Modal,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect } from "react";
import Dropzone from "react-dropzone";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";
import ArticleIcon from "@mui/icons-material/Article";

interface AttachmentsSectionProps {
  verdictId: string;
}

const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({
  verdictId,
}) => {
  const { tenant } = useTenant();

  const [file, setFile] = React.useState<File[]>([]);

  const [open, setOpen] = React.useState(false);
  const [attachments, setAttachments] = React.useState<
    VerdictAttachment[] | []
  >([]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    handleLoadAttachments();
  }, [verdictId]);

  const handleUploadFile = async (files: File[]) => {
    handleClose();

    if (!verdictId) {
      notifyError("El vonnis debe ser creado antes de subir un archivo.");
      return;
    }

    files.forEach(async (file) => {
      const res = await UploadAttachmentToVerdict(
        file,
        verdictId,
        tenant?.subdomain || "default"
      );

      if (res) {
        notifyInfo("Archivo subido exitosamente.");
      } else {
        notifyError("Error al subir el archivo.");
      }
    });

    handleLoadAttachments();
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (verdictId) {
      AlertService.showConfirm(
        "Weet je het zeker?",
        "Deze actie verwijdert het geselecteerde bestand. Wilt u doorgaan?",
        "Ja, verwijderen",
        "Annuleren"
      ).then(async (confirmed) => {
        if (confirmed) {
          await DeleteVerdictAttachment(attachmentId);
          notifyInfo("Bestand succesvol verwijderd.");
          handleLoadAttachments();
        }
      });

      return;
    }
  };

  const handleLoadAttachments = async () => {
    if (verdictId) {
      const attachments = await getAttachmentsByVerdictId(verdictId);
      if (attachments) {
        setAttachments(attachments);
      }
    }
  };

  const handleDownloadAttachment = async (id: string) => {
    const data = await DownloadVerdictAttachment(id);

    if (data.success && data.file) {
      // Decode base64 to binary
      const byteCharacters = atob(data.file as string);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.file_name ?? "documento.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      notifyError("Er is geen bestand om te downloaden.");
    }
  };

  return (
    <Box
      sx={{
        gap: 2,
        width: "100%",
      }}
    >
      <Button
        variant="contained"
        component="span"
        sx={{ mb: 2, mt: 2 }}
        onClick={handleOpen}
      >
        Document Uploaden
      </Button>

      <TableContainer component={Paper}>
        <Table
          stickyHeader
          sx={{
            minWidth: 500,
            "& .MuiTableCell-root": {
              border: "1px solid #e0e0e0",
            },
          }}
          aria-label="tabla de embargo"
          size="small"
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  minWidth: 100,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="left"
              >
                Overzicht Documenten
              </TableCell>
              {/* <TableCell
                            sx={{
                              minWidth: 50,
                              backgroundColor: "secondary.main",
                              color: "#fff",
                              fontWeight: "bold",
                              border: "1px solid #bdbdbd",
                            }}
                            align="center"
                          >
                            Maat
                          </TableCell> */}
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
                Datum
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
                Acties
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attachments &&
              attachments.length > 0 &&
              attachments?.map((attachment) => (
                <TableRow key={attachment.id}>
                  <TableCell component="th" scope="row" align="left">
                    {attachment.file_name ? (
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500 }}
                        onClick={() => handleDownloadAttachment(attachment.id)}
                        style={{
                          cursor: "pointer",
                          textDecoration: "underline",
                          color: "#1976d2",
                        }}
                      >
                        {attachment.file_name}
                      </Typography>
                    ) : (
                      "No hay archivo cargado"
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {attachment.created_at
                      ? new Date(attachment.created_at).toLocaleDateString(
                          "es-ES",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }
                        )
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {file ? (
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            width: { xs: 350, sm: 600 },
            maxWidth: "95vw",
            borderRadius: 3,
            p: { xs: 2, sm: 4 },
            outline: "none",
          }}
        >
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box sx={{ mr: 1, color: "secondary.main" }}>
              <UploadIcon />
            </Box>
            Document Uploaden
          </Typography>
          <Dropzone
            accept={{
              "application/pdf": [".pdf"],
            }}
            onDrop={(acceptedFiles) => {
              if (acceptedFiles.length > 0) {
                handleUploadFile(acceptedFiles);
              }
            }}
            multiple={false}
            maxFiles={1}
            // maxSize={10 * 1024 * 1024}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <Box
                {...getRootProps()}
                sx={{
                  border: "2px dashed #90a4ae",
                  borderRadius: 3,
                  p: { xs: 3, sm: 5 },
                  textAlign: "center",
                  cursor: "pointer",
                  bgcolor: isDragActive ? "#e3e8f0" : "#f8fafc",
                  transition: "background-color 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                  borderStyle: "dashed",
                  borderWidth: 2,
                  borderColor: "#90a4ae",
                }}
              >
                <Box
                  sx={{
                    background: "#e3e8f0",
                    borderRadius: "50%",
                    width: 70,
                    height: 70,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <ArticleIcon />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                  Sleep en zet bestanden hier neer, of klik om te selecteren
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Formaten ondersteund: PDF (max. 2MB)
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    fontWeight: 500,
                    mb: 1,
                    textTransform: "none",
                  }}
                >
                  Selecteer Bestanden
                </Button>
                <input {...getInputProps()} style={{ display: "none" }} />
              </Box>
            )}
          </Dropzone>
        </Box>
      </Modal>
    </Box>
  );
};

export default AttachmentsSection;
