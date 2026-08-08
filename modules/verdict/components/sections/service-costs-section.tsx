import {
  Box,
  Button,
  IconButton,
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
import TotalBailiff from "../total-bailiff";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Verdict } from "@/modules/verdict/services/verdict.validators";
import { VerdictBailiffServices } from "@/modules/verdict/services/verdict-bailiff-services.validators";
import { AlertService } from "@/shared/ui/alerts";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { notifyError } from "@/shared/ui/notifications";
import { uploadVerdictSupportingDocument } from "@/modules/legal-process/actions/legal-process.actions";

interface ServiceCostsSectionProps {
  // Solo se puede subir un documento de respaldo por actuación cuando la
  // sección corre dentro de la pantalla única de registro de sentencia (que
  // conoce el caseTransferId/legalProcessId). En modo edición no aplica.
  uploadContext?: { caseTransferId?: string | null; legalProcessId?: string | null };
}

const ServiceCostsSection: React.FC<ServiceCostsSectionProps> = ({ uploadContext }) => {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Verdict>();

  const { fields, append, remove } = useFieldArray<{
    bailiff_services: VerdictBailiffServices[];
  }>({
    // control,
    name: "bailiff_services",
  });

  const handleDelete = (index: number) => {
    AlertService.showConfirm(
      "Weet je het zeker?",
      "Weet u zeker dat u wilt verwijderen?",
      "Ja, verwijderen",
      "Annuleren"
    ).then(async (confirmed) => {
      if (confirmed) {
        remove(index);
      }
    });
  };

  const handleUploadDocument = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadContext) return;

    try {
      const metadata = await uploadVerdictSupportingDocument(uploadContext, file);
      setValue(`bailiff_services.${index}.document_storage_key`, metadata.document_storage_key);
      setValue(`bailiff_services.${index}.document_original_name`, metadata.document_original_name);
      setValue(`bailiff_services.${index}.document_mime_type`, metadata.document_mime_type);
      setValue(`bailiff_services.${index}.document_size`, metadata.document_size);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Uploaden mislukt");
    }
  };

  const CreateCustomRow: React.FC<{
    item: VerdictBailiffServices;
    index: number;
  }> = ({ item, index }) => {
    return (
      <TableRow key={item.id}>
        {/* service_invoice_number */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`bailiff_services.${index}.service_invoice_number`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                fullWidth
                type="text"
                placeholder="Voorbeeld: INV-12345"
                error={
                  !!errors.bailiff_services?.[index]?.service_invoice_number
                }
                helperText={
                  errors.bailiff_services?.[index]?.service_invoice_number
                    ?.message
                }
              />
            )}
          />
        </TableCell>
        {/* service_type */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`bailiff_services.${index}.service_type`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                fullWidth
                type="text"
                placeholder="Voorbeeld: Betekening Vonnis"
                error={!!errors.bailiff_services?.[index]?.service_type}
                helperText={
                  errors.bailiff_services?.[index]?.service_type?.message
                }
              />
            )}
          />
        </TableCell>
        {/* description */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`bailiff_services.${index}.description`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                size="small"
                fullWidth
                type="text"
                placeholder="Omschrijving"
              />
            )}
          />
        </TableCell>
        {/* service_date */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`bailiff_services.${index}.service_date`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={
                  field.value ? new Date(field.value).toISOString().slice(0, 10) : ""
                }
                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
              />
            )}
          />
        </TableCell>
        {/* service_cost */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`bailiff_services.${index}.service_cost`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                fullWidth
                size="small"
                placeholder="Ej: $45.00"
                error={!!errors.bailiff_services?.[index]?.service_cost}
                helperText={
                  errors.bailiff_services?.[index]?.service_cost?.message
                }
              />
            )}
          />
        </TableCell>
        {/* document */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`bailiff_services.${index}.document_original_name`}
            control={control}
            render={({ field }) => (
              <Button
                component="label"
                size="small"
                variant="text"
                startIcon={<UploadFileIcon />}
                disabled={!uploadContext}
                sx={{ textTransform: "none" }}
              >
                {field.value || "Document"}
                <input
                  type="file"
                  hidden
                  onChange={(e) => handleUploadDocument(index, e)}
                />
              </Button>
            )}
          />
        </TableCell>
        {/* action */}
        <TableCell sx={{ textAlign: "center" }}>
          <Stack direction="row" spacing={1} justifyContent="center">
            <IconButton
              aria-label="delete"
              color="error"
              size="small"
              onClick={() => handleDelete(index)}
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Paper
      component="section"
      sx={{
        mt: 2,
        elevation: 1,
        borderRadius: 1,
        overflow: "hidden",
        mb: 2,
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
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            Betekeningskosten
          </Typography>

          <Box sx={{ mr: 2 }}>
            <TotalBailiff control={control} />
          </Box>
        </Box>
      </Box>
      <Box sx={{ p: 2 }}>
        <TableContainer component={Paper}>
          <Table
            stickyHeader
            sx={{
              width: { xs: "100%", md: "100%" },
              "& .MuiTableCell-root": {
                border: "1px solid #e0e0e0",
              },
            }}
            aria-label="tabel met deurwaarderskosten"
            size="small"
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    width: { xs: 200, md: 500 },
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #bdbdbd",
                  }}
                  align="left"
                >
                  Factuur nr.
                </TableCell>
                <TableCell
                  sx={{
                    width: { xs: 200, md: 300 },
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #bdbdbd",
                  }}
                  align="left"
                >
                  Type actuatie
                </TableCell>
                <TableCell
                  sx={{
                    width: { xs: 200, md: 300 },
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #bdbdbd",
                  }}
                  align="left"
                >
                  Omschrijving
                </TableCell>
                <TableCell
                  sx={{
                    width: 140,
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Datum
                </TableCell>
                <TableCell
                  sx={{
                    width: { xs: 200, md: 200 },
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Kosten
                </TableCell>
                <TableCell
                  sx={{
                    width: 160,
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Document
                </TableCell>
                <TableCell
                  sx={{
                    width: 75,
                    backgroundColor: "#f5f5f5",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Acties
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((item, index) => (
                <CreateCustomRow
                  key={item.id}
                  item={item as VerdictBailiffServices}
                  index={index}
                />
              ))}

              <TableRow>
                <TableCell colSpan={11} align="left">
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() =>
                      append({
                        id: Date.now().toString(),
                        service_invoice_number: "",
                        verdict_id: "",
                        service_type: "",
                        service_cost: 0,
                        service_date: null,
                        description: "",
                        document_storage_key: null,
                        document_original_name: null,
                        document_mime_type: null,
                        document_size: null,
                        created_at: new Date(),
                        updated_at: new Date(),
                      })
                    }
                    sx={{ textTransform: "none" }}
                  >
                    Nieuwe dienst toevoegen
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
};

export default ServiceCostsSection;
