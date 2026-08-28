"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Switch, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminJurisdictions, setAdminJurisdictionActive } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminJurisdictions>>[number];

export default function AdminJurisdictionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

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
      notifySuccess(!row.isActive ? "Jurisdictie geactiveerd" : "Jurisdictie gedeactiveerd");
      load();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "name", label: "Naam", render: (r) => r.jurisdictionName },
    { key: "islandCode", label: "Code", render: (r) => r.islandCode },
    { key: "rolloutOrder", label: "Volgorde", render: (r) => r.rolloutOrder, hideOnMobile: true },
    {
      key: "isActive",
      label: "Status",
      render: (r) => (
        <Stack direction="row" alignItems="center" spacing={1} onClick={(e) => e.stopPropagation()}>
          <Chip size="small" label={r.isActive ? "Actief" : "Inactief"} color={r.isActive ? "success" : "default"} />
          <Switch size="small" checked={r.isActive} onChange={() => handleToggle(r)} />
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Eilanden/landen" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Eilanden/landen
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          emptyMessage="Nog geen jurisdicties geregistreerd."
        />
      </Stack>
    </Container>
  );
}
