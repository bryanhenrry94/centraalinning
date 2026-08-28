"use client";

import { useEffect, useState } from "react";
import { Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminPersons } from "@/modules/admin/actions/admin.actions";

type PersonRow = Awaited<ReturnType<typeof getAdminPersons>>[number];

const personName = (p: PersonRow) =>
  `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.business_name || "-";

export default function AdminPersonsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PersonRow[]>([]);

  useEffect(() => {
    getAdminPersons()
      .then(setRows)
      .catch(() => notifyError("Kon personenregister niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<PersonRow>[] = [
    { key: "identification", label: "Identificatie", render: (r) => r.identification },
    { key: "name", label: "Naam", render: (r) => personName(r) },
    { key: "type", label: "Type", render: (r) => r.person_type },
    { key: "email", label: "E-mail", render: (r) => r.email || "-" },
    { key: "phone", label: "Telefoon", render: (r) => r.phone || "-" },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Personenregister" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Personenregister
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id ?? r.identification}
          getRowHref={(r) => `/admin/persons/${r.id}`}
          emptyMessage="Nog geen personen geregistreerd."
        />
      </Stack>
    </Container>
  );
}
