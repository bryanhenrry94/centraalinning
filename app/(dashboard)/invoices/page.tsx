"use client";
import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

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
// icons
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import AddIcon from "@mui/icons-material/Add";
// libs
import { AlertService } from "@/shared/ui/alerts";
import { formatCurrency } from "@/shared/utils/formatters";
// hooks and services
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { getAllInvoices } from "@/modules/payment/actions/billing-invoice.actions";
import {
  BillingInvoiceBase,
  BillingInvoiceResponse,
} from "@/modules/payment/services/billing-invoice.validators";

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

const InvoicesPage: React.FC = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] =
    React.useState<BillingInvoiceBase | null>(null);
  const open = Boolean(anchorEl);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const { tenant } = useTenant();
  const [invoices, setInvoices] = React.useState<BillingInvoiceResponse[]>([]);

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
    invoice: BillingInvoiceBase
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(invoice);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleCreate = () => {
    router.push("/dashboard/invoices/new");
    handleClose();
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/invoices/${id}/edit`);
    handleClose();
  };

  const handleView = (invoice: BillingInvoiceBase) => {
    router.push(`/dashboard/invoices/${invoice.id}/view`);
    handleClose();
  };

  const handlePayments = (invoice: BillingInvoiceBase) => {
    router.push(`/dashboard/invoices/${invoice.id}/payments`);
    handleClose();
  };

  const handleDelete = async (invoice: BillingInvoiceBase) => {
    AlertService.showConfirm(
      "¿Estás seguro?",
      "Esta acción eliminará el registro de factuur.",
      "Sí, eliminar",
      "Cancelar"
    ).then(async (confirmed) => {
      if (confirmed) {
      }
    });
    return;
  };

  const fetchData = async () => {
    if (!tenant) return;

    const invoices = await getAllInvoices();
    setInvoices(invoices);
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
    <Box sx={{ m: { xs: 1.5, sm: 4 } }}>
      {/* <ActionToolbar
        title="Overzicht Facturen"
        navigation={[{ title: "Dashboard", href: "/" }]}
      /> */}

      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
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
            OVERZICHT FACTUREN
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            startIcon={<AddIcon />}
            sx={{ textTransform: "none" }}
          >
            NIEUWE FACTUUR
          </Button>
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
                  Factuurnummer
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
                  Factuurdatum
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
                  Aan
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
                  Subtotaal
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
                  ABB 6%
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
              {invoices?.map((invoice: BillingInvoiceResponse) => (
                <TableRow key={invoice.id}>
                  <TableCell sx={{ textAlign: "center" }}>
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {invoice.issue_date
                      ? new Date(invoice.issue_date).toLocaleDateString(
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
                    {invoice.tenant_id}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {formatCurrency(
                      invoice.invoice_details
                        .map((d) => d.item_total_price)
                        .reduce((a, b) => a + b, 0)
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {formatCurrency(
                      invoice.invoice_details
                        .map((d) => d.item_tax_amount)
                        .reduce((a, b) => a + b, 0)
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(
                      invoice.invoice_details
                        .map((d) => d.item_total_with_tax)
                        .reduce((a, b) => a + b, 0)
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={invoice.status} color={"default"} />
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton
                      id={`actions-button-${invoice.id}`}
                      aria-controls={
                        open && selectedRow?.id === invoice.id
                          ? `actions-menus-${invoice.id}`
                          : undefined
                      }
                      aria-haspopup="true"
                      aria-expanded={
                        open && selectedRow?.id === invoice.id
                          ? "true"
                          : undefined
                      }
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                        handleClick(e, invoice)
                      }
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      id={`actions-menus-${invoice.id}`}
                      anchorEl={anchorEl}
                      open={open && selectedRow?.id === invoice.id}
                      onClose={handleClose}
                      MenuListProps={{
                        "aria-labelledby": `actions-button-${invoice.id}`,
                      }}
                    >
                      <MenuItem
                        onClick={() => {
                          if (selectedRow) handleEdit(selectedRow.id);
                          handleClose();
                        }}
                        disabled={invoice.status !== "overdue"}
                      >
                        Editar
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          if (selectedRow) handleView(selectedRow);
                          handleClose();
                        }}
                        disabled={invoice.status !== "unpaid"}
                      >
                        Aprobar
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          if (selectedRow) handlePayments(selectedRow);
                          handleClose();
                        }}
                        disabled={invoice.status !== "unpaid"}
                      >
                        Pagos
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          if (selectedRow) handleDelete(selectedRow);
                          handleClose();
                        }}
                        disabled={invoice.status !== "overdue"}
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
                  colSpan={9}
                  count={invoices.length}
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

export default InvoicesPage;
