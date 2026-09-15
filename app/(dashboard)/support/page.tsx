"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Container,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { getMySupportMessages } from "@/modules/support/actions/support.actions";
import { SupportMessageForm } from "@/modules/support/components/support-message-form";
import { SupportMessageList } from "@/modules/support/components/support-message-list";

const REDIRECT_DELAY_MS = 2500;

const SupportPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof getMySupportMessages>>>([]);
  const [search, setSearch] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadMessages = () => {
    getMySupportMessages()
      .then(setMessages)
      .catch(() => notifyError("Kon berichten niet laden"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - startedAt) / REDIRECT_DELAY_MS) * 100));
    }, 50);
    const timeout = setTimeout(() => {
      router.push("/dashboard");
    }, REDIRECT_DELAY_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [showSuccess, router]);

  const handleSubmitted = () => {
    loadMessages();
    setProgress(0);
    setShowSuccess(true);
  };

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter((m) => m.subject.toLowerCase().includes(term));
  }, [messages, search]);

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "Feedback & Ondersteuning" }]} />

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "flex-start" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Feedback &amp; Ondersteuning
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Heeft u een vraag, suggestie, klacht of technisch probleem? Wij helpen u graag.
          </Typography>
        </Box>

        {showSuccess && (
          <Box
            sx={{
              width: { xs: "100%", md: 360 },
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "success.main",
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700} color="success.dark">
                  Uw bericht is succesvol verzonden.
                </Typography>
                <Typography variant="caption" color="success.dark">
                  U wordt automatisch teruggeleid naar het dashboard...
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setShowSuccess(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              color="success"
              sx={{ mt: 1.5, height: 4, borderRadius: 2 }}
            />
          </Box>
        )}
      </Stack>

      <Stack spacing={3}>
        <SupportMessageForm onSubmitted={handleSubmitted} />

        <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Mijn berichten
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hier vindt u een overzicht van uw eerder verstuurde berichten.
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Zoeken in berichten..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="disabled" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: { sm: 260 } }}
            />
          </Stack>

          <SupportMessageList rows={filteredMessages} />
        </Card>
      </Stack>
    </Container>
  );
};

export default SupportPage;
