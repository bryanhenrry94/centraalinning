import { useEffect, useState } from "react";
import { getPendingInvitations } from "@/modules/auth/actions/invitation.actions";
import { PendingInvitation } from "@/modules/auth/services/invitation.service";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { notifyError } from "@/shared/ui/notifications";

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
        <TableContainer component={Paper}>
          <Table size="small" aria-label="tabel met openstaande uitnodigingen">
            <TableHead>
              <TableRow>
                <TableCell>E-mail</TableCell>
                <TableCell>Naam</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Verzonden op</TableCell>
                <TableCell>Verloopt op</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>{invitation.fullname ?? "—"}</TableCell>
                  <TableCell>{invitation.role}</TableCell>
                  <TableCell>
                    {dateFormatter.format(new Date(invitation.created_at))}
                  </TableCell>
                  <TableCell>
                    {dateFormatter.format(new Date(invitation.expires_at))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
