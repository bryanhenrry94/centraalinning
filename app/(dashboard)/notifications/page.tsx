"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { formatDateTime } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import {
  deleteAllNotifications,
  deleteNotification,
  getMyNotifications,
} from "@/modules/notification/actions/notification.actions";
import { Notification } from "@/modules/notification/services/notification.validators";

const NotificationsPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setNotifications(await getMyNotifications({ take: 100 }));
    } catch (error) {
      notifyError("Kon meldingen niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (notification: Notification) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    await deleteNotification(notification.id);
    if (notification.link) router.push(notification.link);
  };

  const handleDismiss = async (event: React.MouseEvent, notification: Notification) => {
    event.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    await deleteNotification(notification.id);
  };

  const handleClearAll = async () => {
    await deleteAllNotifications();
    setNotifications([]);
  };

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "Notificaties" }]} />

      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight={700}>
            Notificaties
          </Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={handleClearAll}>
              Alles wissen
            </Button>
          )}
        </Stack>

        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            Geen meldingen
          </Typography>
        ) : (
          <List disablePadding>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                disablePadding
                divider
                secondaryAction={
                  <IconButton edge="end" onClick={(e) => handleDismiss(e, notification)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => handleSelect(notification)}>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <Box component="span">
                        <Typography variant="body2" color="text.secondary" component="span">
                          {notification.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                        >
                          {formatDateTime(notification.created_at.toString())}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Container>
  );
};

export default NotificationsPage;
