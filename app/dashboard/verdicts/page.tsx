"use client";
import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteVerdict, getAllVerdicts } from "@/app/actions/verdict";
import { VerdictResponse } from "@/lib/validations/verdict";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { notifyError, notifyInfo } from "@/lib/notifications";
import { AlertService } from "@/lib/alerts";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import AddIcon from "@mui/icons-material/Add";
import { formatCurrency } from "@/utils/formatters";
import { useTenant } from "@/hooks/useTenant";

interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number
  ) => void;
}

function TablePaginationActions(props: TablePaginationActionsProps) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === "rtl" ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowRight />
        ) : (
          <KeyboardArrowLeft />
        )}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowLeft />
        ) : (
          <KeyboardArrowRight />
        )}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === "rtl" ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

const VerdictsPage: React.FC = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedVerdict, setSelectedVerdict] =
    React.useState<VerdictResponse | null>(null);
  const open = Boolean(anchorEl);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [verdicts, setVerdicts] = React.useState<VerdictResponse[]>([]);
  const { tenant } = useTenant();

  React.useEffect(() => {
    // Llamada inicial
    handleRefresh();

    // Llamada después de 1 minuto
    const timer = setTimeout(() => {
      handleRefresh();
    }, 60000);

    // Cleanup para evitar fugas de memoria
    return () => clearTimeout(timer);
  }, []);

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    verdict: VerdictResponse
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedVerdict(verdict);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedVerdict(null);
  };

  const handleCreate = () => {
    router.push("/dashboard/verdicts/new");
    handleClose();
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/verdicts/${id}/edit`);
    handleClose();
  };

  const handleView = (verdict: VerdictResponse) => {
    router.push(`/dashboard/verdicts/${verdict.id}/view`);
    handleClose();
  };

  const handleDelete = async (verdict: VerdictResponse) => {
    AlertService.showConfirm(
      "¿Estás seguro?",
      "Esta acción eliminará el registro de vonnis.",
      "Sí, eliminar",
      "Cancelar"
    ).then(async (confirmed) => {
      if (confirmed) {
        const result = await deleteVerdict(verdict.id);
        if (result) {
          notifyInfo("Vonnis eliminado exitosamente");
          fetchData();
        } else {
          notifyError("Error al eliminar el vonnis");
        }
      }
    });
    return;
  };

  const fetchData = async () => {
    if (!tenant) return;

    const verdicts = await getAllVerdicts(tenant?.id);
    setVerdicts(verdicts);
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant?.id]);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <Box sx={{ m: 4 }}>
      {/* <ActionToolbar
        title="Vonnis"
        navigation={[{ title: "Dashboard", href: "/" }]}
      /> */}

      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        mb={2}
      >
        <Box>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{ textAlign: "left" }}
          >
            RECHTERLIJKE UITSPRAAK
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            startIcon={<AddIcon />}
            sx={{ textTransform: "none" }}
          >
            NIEUW VONNIS
          </Button>
          {/* <Button
            variant="contained"
            color="secondary"
            onClick={handleRefresh}
            startIcon={<RefreshIcon />}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button> */}
        </Stack>
      </Box>

      <Suspense
        fallback={<Skeleton variant="rectangular" width="100%" height={400} />}
      >
        <TableContainer>
          <Table
            stickyHeader
            sx={{
              // minWidth: 900,
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
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Zaaknummer
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
                  Datum Utispraak
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
                  Beschrijving Vonnis
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
                  Naam Schuldenaar
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
                  Vorderingsbedrag
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
                  Rente
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
                  Overige Proceskosten
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
                  Totaal
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
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {(rowsPerPage > 0
                ? verdicts.slice(
                    page * rowsPerPage,
                    page * rowsPerPage + rowsPerPage
                  )
                : verdicts
              ).map((verdict: VerdictResponse) => (
                <TableRow key={verdict.id}>
                  <TableCell sx={{ textAlign: "center" }}>
                    {verdict.registration_number}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {verdict.sentence_date
                      ? new Date(verdict.sentence_date).toLocaleDateString(
                          "es-ES",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }
                        )
                      : ""}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {verdict.invoice_number}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {verdict.debtor?.fullname}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {formatCurrency(verdict.sentence_amount)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {formatCurrency(
                      verdict.verdict_interest.reduce(
                        (acc, curr) =>
                          Number(acc) + Number(curr.total_interest),
                        0
                      )
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {formatCurrency(
                      (verdict.bailiff_services ?? []).reduce(
                        (acc, curr) => Number(acc) + Number(curr.service_cost),
                        0
                      ) +
                        verdict.verdict_embargo.reduce(
                          (acc, curr) =>
                            Number(acc) + Number(curr.embargo_amount),
                          0
                        )
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(
                      Number(verdict.sentence_amount) +
                        verdict.verdict_interest.reduce(
                          (acc, curr) =>
                            Number(acc) + Number(curr.total_interest),
                          0
                        ) +
                        (verdict.bailiff_services ?? []).reduce(
                          (acc, curr) =>
                            Number(acc) + Number(curr.service_cost),
                          0
                        ) +
                        verdict.verdict_embargo.reduce(
                          (acc, curr) =>
                            Number(acc) + Number(curr.embargo_amount),
                          0
                        )
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={verdict.status} color={"default"} />
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton
                      id={`actions-button-${verdict.id}`}
                      aria-controls={
                        open && selectedVerdict?.id === verdict.id
                          ? `actions-menus-${verdict.id}`
                          : undefined
                      }
                      aria-haspopup="true"
                      aria-expanded={
                        open && selectedVerdict?.id === verdict.id
                          ? "true"
                          : undefined
                      }
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                        handleClick(e, verdict)
                      }
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      id={`actions-menus-${verdict.id}`}
                      anchorEl={anchorEl}
                      open={open && selectedVerdict?.id === verdict.id}
                      onClose={handleClose}
                      MenuListProps={{
                        "aria-labelledby": `actions-button-${verdict.id}`,
                      }}
                    >
                      <MenuItem
                        onClick={() => {
                          if (selectedVerdict) handleEdit(selectedVerdict.id);
                          handleClose();
                        }}
                        // disabled={verdict.status !== "DRAFT"}
                      >
                        Editar
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          if (selectedVerdict) handleView(selectedVerdict);
                          handleClose();
                        }}
                        disabled={verdict.status !== "PENDING"}
                      >
                        Aprobar
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          if (selectedVerdict) handleDelete(selectedVerdict);
                          handleClose();
                        }}
                        disabled={verdict.status !== "DRAFT"}
                      >
                        Eliminar
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, { label: "All", value: -1 }]}
                  colSpan={10}
                  count={verdicts.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  slotProps={{
                    select: {
                      inputProps: {
                        "aria-label": "rows per page",
                      },
                      native: true,
                    },
                  }}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  ActionsComponent={TablePaginationActions}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Suspense>
    </Box>
  );
};

export default VerdictsPage;
