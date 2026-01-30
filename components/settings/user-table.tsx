import React, { useEffect, useState } from "react";
import { getUsersByTenantId, updateUserActiveStatus } from "@/actions/user";
import { User } from "@/lib/validations/user";
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
import { AlertService } from "@/lib/alerts";
import { notifyError } from "@/lib/notifications";

type Props = {
  tenant_id: string;
  initialUsers?: User[];
  onChange?: (users: User[]) => void;
};

export default function UserTable({
  tenant_id,
  initialUsers = [],
  onChange,
}: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState<boolean>(initialUsers.length === 0);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Si ya hay initialUsers, aún permitimos refrescar llamando fetchUsers manualmente desde fuera.
    if (initialUsers.length === 0) {
      fetchUsers();
    }
  }, [tenant_id]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const users = await getUsersByTenantId(tenant_id);
      setUsers(users);
      onChange?.(users);
    } catch (err: any) {
      notifyError(err?.message ?? "Error desconocido al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user: User) {
    setUpdating((s) => ({ ...s, [user.id]: true }));
    try {
      const confirmText = user.is_active
        ? `U wilt de gebruiker deactiveren ${user.email}?`
        : `U wilt de gebruiker ${user.email} activeren?`;

      AlertService.showConfirm(
        "Weet je het zeker?",
        confirmText,
        "Ja",
        "Annuleren"
      ).then(async (confirmed) => {
        if (confirmed) {
          const updatedUser = await updateUserActiveStatus(
            user.id,
            !user.is_active
          );

          if (!updatedUser) {
            throw new Error(
              "No se pudo actualizar el estado del usuario. Respuesta vacía."
            );
          }
          setUsers((prev) => {
            const next = prev.map((u) =>
              u.id === updatedUser.id ? updatedUser : u
            );
            onChange?.(next);
            return next;
          });
        }
      });
    } catch (err: any) {
      notifyError(err?.message ?? "Error al actualizar el usuario.");
    } finally {
      setUpdating((s) => ({ ...s, [user.id]: false }));
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Button
          variant="text"
          onClick={fetchUsers}
          disabled={loading}
          aria-label="Refrescar usuarios"
          startIcon={<RefreshIcon />}
        >
          Vernieuwen
        </Button>
      </Box>

      {users.length === 0 ? (
        <Box>No hay usuarios en este tenant.</Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" aria-label="tabla de usuarios">
            <TableHead>
              <TableRow>
                <TableCell>Naam</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Acties</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.fullname ?? "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.is_active ? "Actief" : "Inactief"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => toggleActive(user)}
                      disabled={!!updating[user.id]}
                      aria-pressed={user.is_active}
                      aria-label={`${
                        user.is_active ? "Deactiveren" : "Activeren"
                      } gebruiker ${user.email}`}
                    >
                      {updating[user.id] ? (
                        <CircularProgress size={16} />
                      ) : user.is_active ? (
                        "Deactiveren"
                      ) : (
                        "Activeren"
                      )}
                    </Button>
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
