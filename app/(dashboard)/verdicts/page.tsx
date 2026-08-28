"use client";
import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteVerdict, getAllVerdicts } from "@/modules/verdict/actions/verdict.actions";
import { VerdictResponse } from "@/modules/verdict/services/verdict.validators";
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TablePagination,
  Typography,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import { formatCurrency } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { useSession } from "next-auth/react";
import { getBailiffByUserId } from "@/modules/bailiff/actions/bailiff.actions";
import { UserRole } from "@/shared/constants/user-role";

interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number,
  ) => void;
}

function TablePaginationActions(props: TablePaginationActionsProps) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="eerste pagina"
      >
        {theme.direction === "rtl" ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="vorige pagina"
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
        aria-label="volgende pagina"
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
        aria-label="laatste pagina"
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
  const { data: session } = useSession();

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
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    verdict: VerdictResponse,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedVerdict(verdict);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedVerdict(null);
  };

  const handleEdit = (id: string) => {
    router.push(`/verdicts/${id}/edit`);
    handleClose();
  };

  const handleDelete = async (verdict: VerdictResponse) => {
    AlertService.showConfirm(
      "Weet u het zeker?",
      "Deze actie verwijdert de vonnisregistratie.",
      "Ja, verwijderen",
      "Annuleren",
    ).then(async (confirmed) => {
      if (confirmed) {
        const result = await deleteVerdict(verdict.id);
        if (result) {
          notifyInfo("Vonnis succesvol verwijderd");
          fetchData();
        } else {
          notifyError("Fout bij het verwijderen van het vonnis");
        }
      }
    });
    return;
  };

  const fetchData = async () => {
    if (!tenant) return;

    const verdicts = await getAllVerdicts(tenant?.id);

    if (session?.user?.roles.includes(UserRole.BAILIFF)) {
      const bailiffResponse = await getBailiffByUserId(session?.user?.id || "");

      const bailiffId =
        bailiffResponse.success && bailiffResponse.data
          ? bailiffResponse.data.id
          : "";

      const filteredVerdicts = verdicts.filter(
        (verdict) => verdict.bailiff_id === bailiffId,
      );
      setVerdicts(filteredVerdicts);
      return;
    }

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
    <Box sx={{ m: { xs: 1.5, sm: 4 } }}>
      {/* <ActionToolbar
        title="Vonnis"
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
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ textAlign: "left", fontWeight: 700 }}
          >
            RECHTERLIJKE UITSPRAAK
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {/* Een vonnis wordt alleen geregistreerd vanuit een overdracht
              (eerste vonnis, activeert het GOP) of een actief GOP-dossier
              (aanvullend vonnis) — zie /legal-processes. */}
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
        {(() => {
          const totalCost = (verdict: VerdictResponse) =>
            (verdict.bailiff_services ?? []).reduce((acc, curr) => Number(acc) + Number(curr.service_cost), 0) +
            verdict.verdict_embargo.reduce((acc, curr) => Number(acc) + Number(curr.embargo_amount), 0) +
            (verdict.procesal_cost || 0);
          const totalInterest = (verdict: VerdictResponse) =>
            verdict.verdict_interest.reduce((acc, curr) => Number(acc) + Number(curr.total_interest), 0);

          const columns: ListColumn<VerdictResponse>[] = [
            { key: "registration_number", label: "Zaaknummer", render: (v) => v.registration_number },
            {
              key: "sentence_date",
              label: "Datum uitspraak",
              render: (v) =>
                v.sentence_date
                  ? new Date(v.sentence_date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "",
              hideOnMobile: true,
            },
            { key: "invoice_number", label: "Beschrijving vonnis", render: (v) => v.invoice_number, hideOnMobile: true },
            { key: "debtor", label: "Naam schuldenaar", render: (v) => v.debtor?.fullname },
            {
              key: "sentence_amount",
              label: "Vorderingsbedrag",
              align: "right",
              render: (v) => formatCurrency(v.sentence_amount),
            },
            {
              key: "interest",
              label: "Rente",
              align: "right",
              render: (v) => formatCurrency(totalInterest(v)),
              hideOnMobile: true,
            },
            {
              key: "costs",
              label: "Overige proceskosten",
              align: "right",
              render: (v) => formatCurrency(totalCost(v)),
              hideOnMobile: true,
            },
            {
              key: "total",
              label: "Totaal",
              align: "right",
              render: (v) => formatCurrency(Number(v.sentence_amount) + totalInterest(v) + totalCost(v)),
            },
            { key: "status", label: "Status", render: (v) => <Chip label={v.status} color="default" /> },
            {
              key: "actions",
              label: "",
              render: (verdict) => (
                <>
                  <IconButton
                    id={`actions-button-${verdict.id}`}
                    aria-controls={
                      open && selectedVerdict?.id === verdict.id ? `actions-menus-${verdict.id}` : undefined
                    }
                    aria-haspopup="true"
                    aria-expanded={open && selectedVerdict?.id === verdict.id ? "true" : undefined}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleClick(e, verdict);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    id={`actions-menus-${verdict.id}`}
                    anchorEl={anchorEl}
                    open={open && selectedVerdict?.id === verdict.id}
                    onClose={handleClose}
                    MenuListProps={{ "aria-labelledby": `actions-button-${verdict.id}` }}
                  >
                    <MenuItem
                      onClick={() => {
                        if (selectedVerdict) handleEdit(selectedVerdict.id);
                        handleClose();
                      }}
                    >
                      Bewerken
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        if (selectedVerdict) handleDelete(selectedVerdict);
                        handleClose();
                      }}
                      disabled={verdict.status !== "DRAFT"}
                    >
                      Verwijderen
                    </MenuItem>
                  </Menu>
                </>
              ),
            },
          ];

          const pagedVerdicts =
            rowsPerPage > 0 ? verdicts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) : verdicts;

          return (
            <>
              <ResponsiveListTable
                columns={columns}
                rows={pagedVerdicts}
                getRowKey={(v) => v.id}
                emptyMessage="Nog geen vonnissen geregistreerd."
              />
              <TablePagination
                component="div"
                rowsPerPageOptions={[5, 10, 25, { label: "All", value: -1 }]}
                count={verdicts.length}
                rowsPerPage={rowsPerPage}
                page={page}
                slotProps={{
                  select: {
                    inputProps: { "aria-label": "rows per page" },
                    native: true,
                  },
                }}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
              />
            </>
          );
        })()}
      </Suspense>
    </Box>
  );
};

export default VerdictsPage;
