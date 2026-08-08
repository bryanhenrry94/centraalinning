"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { getMySupportMessages } from "@/modules/support/actions/support.actions";
import { SupportMessageList } from "@/modules/support/components/support-message-list";

const SupportPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof getMySupportMessages>>>([]);

  useEffect(() => {
    getMySupportMessages()
      .then(setMessages)
      .catch(() => notifyError("Kon berichten niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "Feedback & Ondersteuning" }]} />

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Feedback &amp; Ondersteuning
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/support/new")}
        >
          Nieuw bericht
        </Button>
      </Stack>

      <SupportMessageList rows={messages} basePath="/support" />
    </Container>
  );
};

export default SupportPage;
