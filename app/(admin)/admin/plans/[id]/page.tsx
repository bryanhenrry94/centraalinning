"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardContent, Container, Grid, Stack, TextField, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { getAdminPlans, updateAdminPlan } from "@/modules/admin/actions/admin.actions";

type PlanRow = Awaited<ReturnType<typeof getAdminPlans>>[number];

export default function AdminPlanEditPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    registration_price: "0",
    monthly_price: "0",
    yearly_price: "0",
    reactivation_price: "0",
  });

  useEffect(() => {
    getAdminPlans()
      .then((plans) => {
        const found = plans.find((p) => p.id === params.id) ?? null;
        setPlan(found);
        if (found) {
          setForm({
            name: found.name,
            description: found.description ?? "",
            registration_price: String(found.registration_price),
            monthly_price: String(found.monthly_price),
            yearly_price: String(found.yearly_price),
            reactivation_price: String(found.reactivation_price),
          });
        }
      })
      .catch(() => notifyError("Kon plan niet laden"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await updateAdminPlan(plan.id, {
        name: form.name,
        description: form.description,
        registration_price: Number(form.registration_price),
        monthly_price: Number(form.monthly_price),
        yearly_price: Number(form.yearly_price),
        reactivation_price: Number(form.reactivation_price),
      });
      notifySuccess("Plan bijgewerkt");
      router.push("/admin/plans");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Bijwerken mislukt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingUI />;
  if (!plan) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Plan niet gevonden.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Plannen", href: "/admin/plans" },
          { label: "Bewerken" },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Plan bewerken
        </Typography>
        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Naam" fullWidth size="small" value={form.name} onChange={set("name")} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Omschrijving"
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  value={form.description}
                  onChange={set("description")}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Registratieprijs"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.registration_price}
                  onChange={set("registration_price")}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Maandprijs"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.monthly_price}
                  onChange={set("monthly_price")}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Jaarprijs"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.yearly_price}
                  onChange={set("yearly_price")}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Reactiveringsprijs"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.reactivation_price}
                  onChange={set("reactivation_price")}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            Opslaan
          </Button>
          <Button onClick={() => router.push("/admin/plans")} disabled={saving}>
            Annuleren
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
