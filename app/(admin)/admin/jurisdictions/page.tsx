"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import {
  deleteAdminJurisdiction,
  getAdminJurisdictions,
  setAdminJurisdictionActive,
} from "@/modules/admin/actions/admin.actions";
import { JurisdictionFormDialog } from "@/modules/jurisdiction/components/JurisdictionFormDialog";

type Row = Awaited<ReturnType<typeof getAdminJurisdictions>>[number];

export default function AdminJurisdictionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = () => {
    getAdminJurisdictions()
      .then(setRows)
      .catch(() => notifyError("Kon eilanden/landen niet laden"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (row: Row) => {
    try {
      await setAdminJurisdictionActive(row.id, !row.isActive);
      notifySuccess(
        !row.isActive ? "Jurisdictie geactiveerd" : "Jurisdictie gedeactiveerd",
      );
      load();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteAdminJurisdiction(deleting.id);
      notifySuccess("Jurisdictie verwijderd");
      setDeleting(null);
      load();
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Verwijderen mislukt",
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "name", label: "Naam", render: (r) => r.name },
    { key: "code", label: "Code", render: (r) => r.code },
    {
      key: "rolloutOrder",
      label: "Volgorde",
      render: (r) => r.rolloutOrder,
      hideOnMobile: true,
    },
    {
      key: "isActive",
      label: "Status",
      render: (r) => (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          onClick={(e) => e.stopPropagation()}
        >
          <Chip
            size="small"
            label={r.isActive ? "Actief" : "Inactief"}
            color={r.isActive ? "success" : "default"}
          />
          <Switch
            size="small"
            checked={r.isActive}
            onChange={() => handleToggle(r)}
          />
        </Stack>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <Stack
          direction="row"
          spacing={0.5}
          justifyContent="flex-end"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            size="small"
            aria-label="Bewerken"
            onClick={() => {
              setEditing(r);
              setFormOpen(true);
            }}
          >
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Verwijderen"
            onClick={() => setDeleting(r)}
          >
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Container
      maxWidth="md"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Eilanden/landen" },
        ]}
      />
      <Stack spacing={3}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h4" fontWeight={700}>
            Eilanden/landen
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nieuwe
          </Button>
        </Stack>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          emptyMessage="Nog geen jurisdicties geregistreerd."
        />
      </Stack>

      <JurisdictionFormDialog
        open={formOpen}
        jurisdiction={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <Dialog
        open={!!deleting}
        onClose={() => (deletingBusy ? undefined : setDeleting(null))}
      >
        <DialogTitle>Jurisdictie verwijderen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Weet je zeker dat je <strong>{deleting?.name}</strong> wilt
            verwijderen? Dit kan niet ongedaan gemaakt worden. Dit is alleen
            mogelijk als er geen deelnemers of personen aan gekoppeld zijn.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleting(null)} disabled={deletingBusy}>
            Annuleren
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deletingBusy}
          >
            Verwijderen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
