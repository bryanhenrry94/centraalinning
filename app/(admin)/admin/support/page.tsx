"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Container, Stack, Tab, Tabs, Typography } from "@mui/material";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { getAllSupportMessagesForPlatform } from "@/modules/support/actions/support.actions";
import { SupportMessageList } from "@/modules/support/components/support-message-list";
import { SUPPORT_MESSAGE_STATUS_OPTIONS } from "@/modules/support/utils/support-status";

const AdminSupportPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("ALL");
  const [messages, setMessages] = useState<
    Awaited<ReturnType<typeof getAllSupportMessagesForPlatform>>
  >([]);

  useEffect(() => {
    getAllSupportMessagesForPlatform()
      .then(setMessages)
      .catch(() => notifyError("Kon berichten niet laden"))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const filtered = tab === "ALL" ? messages : messages.filter((m) => m.status === tab);
    return filtered.map((m) => ({ ...m, tenantName: m.tenant?.name }));
  }, [messages, tab]);

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Feedback &amp; Ondersteuning — CFSB
        </Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Alle" value="ALL" />
        {SUPPORT_MESSAGE_STATUS_OPTIONS.map((option) => (
          <Tab key={option.value} label={option.label} value={option.value} />
        ))}
      </Tabs>

      <SupportMessageList rows={rows} basePath="/admin/support" showTenant />
    </Container>
  );
};

export default AdminSupportPage;
