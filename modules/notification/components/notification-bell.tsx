"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  deleteAllNotifications,
  deleteNotification,
  getMyNotifications,
  getMyUnreadNotificationCount,
} from "@/modules/notification/actions/notification.actions";
import { Notification } from "@/modules/notification/services/notification.validators";
import { formatDateTime } from "@/shared/utils/formatters";

const POLL_INTERVAL_MS = 30000;

export default function NotificationBell() {
  const { status } = useSession();
  const router = useRouter();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      setUnreadCount(await getMyUnreadNotificationCount());
    } catch {
      // sesión aún no lista o expirada; se reintenta en el próximo poll
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    refreshCount();
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status, refreshCount]);

  const handleOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setNotifications(await getMyNotifications({ take: 10 }));
  };

  const handleClose = () => setAnchorEl(null);

  // Las notificaciones son de un solo uso: abrirlas (para actuar sobre ellas)
  // o cerrarlas manualmente las elimina, en vez de acumularse en la lista.
  const handleSelect = async (notification: Notification) => {
    handleClose();
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await deleteNotification(notification.id);
    if (notification.link) router.push(notification.link);
  };

  const handleDismiss = async (event: React.MouseEvent, notification: Notification) => {
    event.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await deleteNotification(notification.id);
  };

  const handleClearAll = async () => {
    await deleteAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  if (status !== "authenticated") return null;

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography fontWeight={600}>Meldingen</Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={handleClearAll}>
              Alles wissen
            </Button>
          )}
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 2, py: 3, textAlign: "center" }}
          >
            Geen meldingen
          </Typography>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleSelect(notification)}
              sx={{
                whiteSpace: "normal",
                alignItems: "flex-start",
                gap: 1,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {notification.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(notification.created_at.toString())}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleDismiss(e, notification)}
                sx={{ mt: -0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
