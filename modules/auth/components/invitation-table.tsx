import { useEffect, useState } from "react";
import { getPendingInvitations } from "@/modules/auth/actions/invitation.actions";
import { PendingInvitation } from "@/modules/auth/services/invitation.service";
import { Box, Button, CircularProgress } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { notifyError } from "@/shared/ui/notifications";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

type Props = {
  tenant_id: string;
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "short",
  timeStyle: "short",
});

export default function InvitationTable({ tenant_id }: Props) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchInvitations();
  }, [tenant_id]);

  async function fetchInvitations() {
    setLoading(true);
    try {
      const invitations = await getPendingInvitations(tenant_id);
      setInvitations(invitations);
    } catch (err: any) {
      notifyError(err?.message ?? "Error desconocido al cargar invitaciones");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Button
          variant="text"
          onClick={fetchInvitations}
          disabled={loading}
          aria-label="Vernieuwen uitnodigingen"
          startIcon={<RefreshIcon />}
        >
          Vernieuwen
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : invitations.length === 0 ? (
        <Box>Er zijn geen openstaande uitnodigingen.</Box>
      ) : (
        (() => {
          const columns: ListColumn<PendingInvitation>[] = [
            { key: "email", label: "E-mail", render: (inv) => inv.email },
            { key: "fullname", label: "Naam", render: (inv) => inv.fullname ?? "—" },
            { key: "role", label: "Rol", render: (inv) => inv.role },
            {
              key: "created_at",
              label: "Verzonden op",
              render: (inv) => dateFormatter.format(new Date(inv.created_at)),
              hideOnMobile: true,
            },
            {
              key: "expires_at",
              label: "Verloopt op",
              render: (inv) => dateFormatter.format(new Date(inv.expires_at)),
            },
          ];

          return (
            <ResponsiveListTable columns={columns} rows={invitations} getRowKey={(inv) => inv.id} />
          );
        })()
      )}
    </Box>
  );
}
