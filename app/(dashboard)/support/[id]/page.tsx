"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Container } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { getSupportMessageById } from "@/modules/support/actions/support.actions";
import { SupportMessageDetail } from "@/modules/support/components/support-message-detail";

const SupportDetailPage: React.FC = () => {
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
    <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "Feedback & Ondersteuning", href: "/support" },
          { label: message.subject },
        ]}
      />
      <SupportMessageDetail message={message} onUpdated={load} />
    </Container>
  );
};

export default SupportDetailPage;
