"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { getAdminUsers } from "@/modules/admin/actions/admin.actions";
import { getRoleBadgeInfo } from "@/modules/admin/utils/admin-user-roles";

type AdminUser = Awaited<ReturnType<typeof getAdminUsers>>[number];

// Eén tabelrij per membership i.p.v. per gebruiker: een gebruiker met 3
// organisaties krijgt 3 rijen, elk met naam/e-mail herhaald — sponsor
// feedback 2026-09-29: lege vakken op de vervolgrijen (om herhaling te
// vermijden) waren juist verwarrender dan gewoon elke rij volledig tonen.
type Row = {
  key: string;
  fullname: string | null;
  email: string;
  isActive: boolean;
  tenantName: string;
  roles: string[];
};

function buildRows(users: AdminUser[]): Row[] {
  const rows: Row[] = [];
  for (const user of users) {
    for (const m of user.memberships) {
      rows.push({
        key: `${user.id}-${m.tenantId}`,
        fullname: user.fullname,
        email: user.email,
        isActive: user.isActive,
        tenantName: m.tenantName,
        roles: m.roles,
      });
    }
  }
  return rows;
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminUsers()
      .then((users) => setRows(buildRows(users)))
      .catch(() => notifyError("Kon gebruikers niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    {
      key: "fullname",
      label: "Naam",
      align: "left",
      render: (r) => r.fullname || "-",
    },
    { key: "email", label: "E-mail", align: "left", render: (r) => r.email },
    {
      key: "tenant",
      label: "Organisatie / Deelnemer",
      align: "left",
      render: (r) => r.tenantName,
    },
    {
      key: "roles",
      label: "Rol(len)",
      align: "left",
      render: (r) =>
        r.roles.length === 0 ? (
          "-"
        ) : (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
            {r.roles.map((role) => {
              const badge = getRoleBadgeInfo(role);
              return (
                <Chip
                  key={role}
                  size="small"
                  label={badge.label}
                  color={badge.color}
                  variant={badge.color === "default" ? "outlined" : "filled"}
                  sx={{ minWidth: 150 }}
                />
              );
            })}
          </Stack>
        ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (r) => (
        <Chip
          size="small"
          label={r.isActive ? "Actief" : "Inactief"}
          color={r.isActive ? "success" : "default"}
          sx={{ minWidth: 90, justifyContent: "center" }}
        />
      ),
    },
  ];

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Gebruikers & rollen" },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Gebruikers & rollen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Laatste 500 gebruikers, alle deelnemers.
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.key}
          emptyMessage="Nog geen gebruikers."
        />
      </Stack>
    </Container>
  );
}
