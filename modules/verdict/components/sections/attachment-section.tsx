import {
  Box,
  Button,
  IconButton,
  MenuItem,
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
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useEffect, useState } from "react";
import { VerdictEmbargo } from "@/modules/verdict/services/verdict-embargo.validators";
import { embargoTipos } from "@/modules/blockade/constants/embargo";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { UserInput } from "@/modules/auth/services/user.type";
import { getUsersByRole } from "@/modules/auth/actions/user.actions";
import { UserRole } from "@/shared/constants/user-role";
import { notifyError } from "@/shared/ui/notifications";
import { uploadVerdictSupportingDocument } from "@/modules/legal-process/actions/legal-process.actions";

const TotalCell = ({ control, index }: { control: any; index: number }) => {
  const { setValue } = useFormContext();

  const item = useWatch({
    control,
    name: `verdict_embargo.${index}`,
  });

  const [total, setTotal] = useState(0);

  useEffect(() => {
    const total =
      Number(item.embargo_amount ?? 0) + Number(item.bailiffAmount ?? 0);

    setTotal(total);
    setValue(`verdict_embargo.${index}.total_amount`, total);
  }, [item.embargo_amount, item.bailiffAmount]);

  return (
    <TextField
      value={total.toFixed(2)}
      size="small"
      InputProps={{
        readOnly: true,
      }}
      disabled
    />
  );
};

interface AttachmentSectionProps {
  // Solo se puede subir un documento de respaldo por embargo cuando la
  // sección corre dentro de la pantalla única de registro de sentencia (que
  // conoce el caseTransferId/legalProcessId). En modo edición no aplica.
  uploadContext?: { caseTransferId?: string | null; legalProcessId?: string | null };
}

const AttachmentSection: React.FC<AttachmentSectionProps> = ({ uploadContext }) => {
  const [bailiffs, setBailiffs] = useState<UserInput[]>([]);

  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<{
    verdict_embargo: VerdictEmbargo[];
  }>();

  const { fields, append, remove } = useFieldArray<{
    verdict_embargo: VerdictEmbargo[];
  }>({
    control,
    name: "verdict_embargo",
  });

  const handleUploadDocument = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadContext) return;

    try {
      const metadata = await uploadVerdictSupportingDocument(uploadContext, file);
      setValue(`verdict_embargo.${index}.document_storage_key`, metadata.document_storage_key);
      setValue(`verdict_embargo.${index}.document_original_name`, metadata.document_original_name);
      setValue(`verdict_embargo.${index}.document_mime_type`, metadata.document_mime_type);
      setValue(`verdict_embargo.${index}.document_size`, metadata.document_size);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Uploaden mislukt");
    }
  };

  useEffect(() => {
    const fetchBailiffs = async () => {
      // Fetch bailiffs from the API or any other source
      const data = await getUsersByRole(UserRole.BAILIFF);

      if (data) {
        setBailiffs(data);
      } else {
        setBailiffs([]);
      }
    };

    fetchBailiffs();
  }, []);

  const CreateCustomRow: React.FC<{
    item: VerdictEmbargo;
    index: number;
  }> = ({ item, index }) => {
    return (
      <TableRow key={item.id}>
        {/* company_name */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.company_name`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                fullWidth
                type="text"
                placeholder="Ej: Urbano Company"
                error={!!errors.verdict_embargo?.[index]?.company_name}
                helperText={
                  errors.verdict_embargo?.[index]?.company_name?.message
                }
              />
            )}
          />
        </TableCell>
        {/* company_phone */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.company_phone`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="text"
                fullWidth
                size="small"
                placeholder="Ej: 123456789"
                error={!!errors.verdict_embargo?.[index]?.company_phone}
                helperText={
                  errors.verdict_embargo?.[index]?.company_phone?.message
                }
              />
            )}
          />
        </TableCell>
        {/* company_email */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.company_email`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="email"
                fullWidth
                size="small"
                placeholder="Ej: pepito@example.com"
                error={!!errors.verdict_embargo?.[index]?.company_email}
                helperText={
                  errors.verdict_embargo?.[index]?.company_email?.message
                }
              />
            )}
          />
        </TableCell>
        {/* company_address */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.company_address`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="text"
                fullWidth
                size="small"
                placeholder="Ej: Calle Falsa 123"
                error={!!errors.verdict_embargo?.[index]?.company_address}
                helperText={
                  errors.verdict_embargo?.[index]?.company_address?.message
                }
              />
            )}
          />
        </TableCell>
        {/* embargo_type */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.embargo_type`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id="outlined-select-embargo_type"
                select
                value={field.value ?? ""}
                fullWidth
                size="small"
                error={!!errors.verdict_embargo?.[index]?.embargo_type}
                helperText={
                  errors.verdict_embargo?.[index]?.embargo_type?.message
                }
              >
                {embargoTipos.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.nombre}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </TableCell>
        {/* embargo_date */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.embargo_date`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="date"
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.verdict_embargo?.[index]?.embargo_date}
                helperText={
                  errors.verdict_embargo?.[index]?.embargo_date?.message
                }
                value={
                  field.value
                    ? new Date(field.value).toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) => {
                  field.onChange(
                    e.target.value ? new Date(e.target.value) : null,
                  );
                }}
              />
            )}
          />
        </TableCell>
        {/* embargo_amount */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.embargo_amount`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                fullWidth
                type="number"
                placeholder="0.00"
                inputProps={{ step: "any" }}
                error={!!errors.verdict_embargo?.[index]?.embargo_amount}
                helperText={
                  errors.verdict_embargo?.[index]?.embargo_amount?.message
                }
                value={field.value ?? ""} // si es null/undefined → ""
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? null : parseFloat(val));
                }}
              />
            )}
          />
        </TableCell>
        {/* total_amount */}
        <TableCell sx={{ textAlign: "center" }}>
          <TotalCell control={control} index={index} />
        </TableCell>
        {/* document */}
        <TableCell sx={{ textAlign: "center" }}>
          <Controller
            name={`verdict_embargo.${index}.document_original_name`}
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
                <input type="file" hidden onChange={(e) => handleUploadDocument(index, e)} />
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
              onClick={() => remove(index)}
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
            BESLAG
          </Typography>
        </Box>
      </Box>
      <Box sx={{ p: 2 }}>
        <TableContainer component={Paper}>
          <Table
            stickyHeader
            sx={{
              minWidth: 900,
              "& .MuiTableCell-root": {
                border: "1px solid #e0e0e0",
              },
            }}
            aria-label="tabel met bijlagen"
            size="small"
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    minWidth: 120,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="left"
                >
                  Beslaglocatie
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 120,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Telefoon
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 120,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Mail
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 150,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Adres
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 100,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Soort Beslag
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 100,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Datum Beslag
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 100,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  1/3 Schuldenaar
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 75,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Totaal
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 140,
                    backgroundColor: "#f5f5f5",

                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Document
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 75,
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
              {fields.map((item, index) => {
                const field = item as VerdictEmbargo;

                return (
                  <CreateCustomRow key={field.id} item={field} index={index} />
                );
              })}
              <TableRow>
                <TableCell colSpan={11} align="left">
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() =>
                      append({
                        id: Date.now().toString(),
                        verdict_id: "",
                        company_name: "",
                        company_phone: "",
                        company_email: "",
                        company_address: "",
                        embargo_type: "",
                        embargo_date: new Date(),
                        embargo_amount: 0,
                        total_amount: 0,
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
                    Nieuwe Beslag Toevoegen
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

export default AttachmentSection;
