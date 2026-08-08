"use client";
import React, { useEffect, useMemo } from "react";
// mui
import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";
// icons
import SaveIcon from "@mui/icons-material/Save";
// validations
import {
  VerdictCreate,
  VerdictCreateForm,
  VerdictCreateFormSchema,
} from "@/modules/verdict/services/verdict.validators";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
// actions
import { updateVerdict } from "@/modules/verdict/actions/verdict.actions";
import { DebtorInput } from "@/modules/collection/services/debtor.type";
// hooks and libs
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { useRouter } from "next/navigation";
import { AlertService } from "@/shared/ui/alerts";
// components
import VerdictTotals from "@/modules/verdict/components/verdict-totals";
import { JudgmentSection } from "./sections/judgment-section";
import StatutoryInterestSection from "./sections/statutory-interest-section";
import AttachmentSection from "./sections/attachment-section";
import ServiceCostsSection from "./sections/service-costs-section";
import AttachmentsSection from "./sections/attachments-section";
import { ModalFormDebtor } from "@/modules/collection/components/modal-debtor-form";
import { getAllDebtorsByTenantId } from "@/modules/collection/actions/debtor.actions";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { BailiffSection } from "./sections/bailiff-section";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";

interface VerdictFormPageProps {
  defaultValues: VerdictCreate;
  id: string;
}

// Un vonnis solo se crea a través del registro de sentencia GOP (ver
// modules/legal-process/components/verdict-registration-form.tsx); este
// formulario únicamente edita un vonnis ya existente.
const VerdictFormPage: React.FC<VerdictFormPageProps> = ({ id, defaultValues }) => {
  const { tenant } = useTenant();
  const [debtors, setDebtors] = React.useState<DebtorInput[]>([]);
  const [bailiffs, setBailiffs] = React.useState<Bailiff[]>([]);
  const [openModalDebtor, setOpenModalDebtor] = React.useState(false);
  const [debtorSelected, setDebtorSelected] =
    React.useState<DebtorInput | null>();
  const router = useRouter();

  const handleSelectDebtor = (debtor: DebtorInput | null) => {
    if (debtor) {
      setDebtorSelected(debtor);
    } else {
      setDebtorSelected(null);
    }
  };

  const handleOpenModalDebtor = () => {
    setOpenModalDebtor(true);
  };

  const handleCloseModalDebtor = () => {
    setOpenModalDebtor(false);
  };

  const handleSaveDebtor = async (debtor: DebtorInput) => {
    handleSelectDebtor(debtor);
    await fetchDebtors();
  };

  const fetchDebtors = async () => {
    const response = await getAllDebtorsByTenantId(tenant?.id || "");

    if (!response) {
      setDebtors([]);
      return;
    }
    setDebtors(response);
  };

  const fetchBailiffs = async () => {
    const data = await getActiveBailiffsDirectory();
    setBailiffs(data ?? []);
  };

  React.useEffect(() => {
    if (!tenant?.id) return;

    fetchDebtors();
    fetchBailiffs();
  }, [tenant?.id]);

  const methods = useForm<VerdictCreateForm>({
    resolver: zodResolver(
      VerdictCreateFormSchema,
    ) as Resolver<VerdictCreateForm>,
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const serializedDefaults = useMemo(
    () => JSON.stringify(defaultValues),
    [defaultValues],
  );

  useEffect(() => {
    if (!defaultValues) return;
    methods.reset(JSON.parse(serializedDefaults));
  }, [serializedDefaults]);

  const onSubmit = async (data: VerdictCreateForm) => {
    try {
      if (!tenant) {
        return notifyError(
          "Onverwerkte fout, neem contact op met uw systeembeheerder",
        );
      }

      const confirmed = await AlertService.showConfirm(
        "Waarschuwing",
        "U staat op het punt de registratie bij te werken. Wilt u doorgaan?",
        "Ja, registreren",
        "Annuleren",
      );
      if (!confirmed) return;

      const verdict = await updateVerdict(id, data);

      if (!verdict) {
        return notifyError(
          "Er is een fout opgetreden bij het bijwerken van de registratie.",
        );
      }

      notifyInfo("Registratie is succesvol bijgewerkt");
    } catch (error) {
      console.error("Error submitting verdict form:", error);
      notifyError(
        "Er is een fout opgetreden bij het verzenden van het formulier.",
      );
    }
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Action Buttons */}
          <Box
            sx={{
              mb: 2,
              mt: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1,
            }}
          >
            <Typography variant="h6" gutterBottom>
              VONNIS BEWERKEN
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                aria-label="delete"
                color="primary"
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                loading={isSubmitting ? true : false}
              >
                Bewaar Vonnis
              </Button>
            </Stack>
          </Box>

          {/* Vonnis Toevoegen Section */}
          <JudgmentSection
            handleOpenModalDebtor={handleOpenModalDebtor}
            onSelectDebtor={handleSelectDebtor}
            debtors={debtors}
          />

          <BailiffSection
            handleOpenModalBailiff={() => {}}
            onSelectBailiff={() => {}}
            bailiffs={bailiffs}
          />

          <StatutoryInterestSection />

          <AttachmentSection />

          <ServiceCostsSection />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Grid
                container
                direction="column"
                justifyContent="start"
                alignItems="center"
                sx={{ minHeight: 200, mt: 2, height: "100%" }}
              >
                <AttachmentsSection verdictId={id} />
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <VerdictTotals />
            </Grid>
          </Grid>
        </form>
      </FormProvider>
      <ModalFormDebtor
        open={openModalDebtor}
        onClose={handleCloseModalDebtor}
        onSave={handleSaveDebtor}
        id={debtorSelected?.id}
      />
    </Container>
  );
};

export default VerdictFormPage;
