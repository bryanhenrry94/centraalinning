"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Container, Typography } from "@mui/material";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { getSupportMessageById } from "@/modules/support/actions/support.actions";
import { SupportMessageDetail } from "@/modules/support/components/support-message-detail";

const AdminSupportDetailPage: React.FC = () => {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Awaited<ReturnType<typeof getSupportMessageById>> | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSupportMessageById(id);
      setMessage(data);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon bericht niet laden");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingUI />;
  if (!message) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Feedback &amp; Ondersteuning — CFSB
      </Typography>
      <SupportMessageDetail message={message} canManage onUpdated={load} />
    </Container>
  );
};

export default AdminSupportDetailPage;
