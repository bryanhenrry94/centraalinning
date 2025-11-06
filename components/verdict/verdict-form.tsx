"use client";
import React, { useState } from "react";
// mui
import { Box, Button, Grid, Stack, Typography } from "@mui/material";
// icons
import SaveIcon from "@mui/icons-material/Save";
import { z } from "zod";
// validations
import { VerdictCreateForm } from "@/lib/validations/verdict";
import { notifyInfo } from "@/lib/notifications";
// actions
import {
  handleSendMailNotificationBailiff,
  requestVerdictApproval,
} from "@/app/actions/verdict";
import { DebtorBase } from "@/lib/validations/debtor";
// hooks and libs
import { useTenant } from "@/hooks/useTenant";
import { useRouter } from "next/navigation";
import { AlertService } from "@/lib/alerts";
// components
import VerdictTotals from "@/components/verdict/verdict-totals";
import { JudgmentSection } from "./sections/judgment-section";
import StatutoryInterestSection from "./sections/statutory-interest-section";
import AttachmentSection from "./sections/attachment-section";
import ServiceCostsSection from "./sections/service-costs-section";
import { VerdictFormProvider } from "./form-context";
import AttachmentsSection from "./sections/attachments-section";
import { ModalFormDebtor } from "../debtor/modal-debtor-form";
import { getAllDebtorsByTenantId } from "@/app/actions/debtor";
import { ModalFormBailiff } from "../bailiff/modal-bailiff-form";
import { getAllBailiffs } from "@/app/actions/bailiff";
import { Bailiff } from "@/lib/validations/bailiff";

interface VerdictFormPageProps {
  defaultValues: z.infer<typeof VerdictCreateForm>;
  modeEdit: boolean;
  id?: string;
}

const VerdictFormPage: React.FC<VerdictFormPageProps> = ({
  id,
  defaultValues,
  modeEdit,
}) => {
  const { tenant } = useTenant();
  const [debtors, setDebtors] = React.useState<DebtorBase[]>([]);
  const [bailiffs, setBailiffs] = React.useState<Bailiff[]>([]);
  const [openModalDebtor, setOpenModalDebtor] = React.useState(false);
  const [openModalBailiff, setOpenModalBailiff] = React.useState(false);
  const [bailiffSelected, setBailiffSelected] =
    React.useState<Bailiff | null>();
  const [debtorSelected, setDebtorSelected] =
    React.useState<DebtorBase | null>();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSelectDebtor = (debtor: DebtorBase | null) => {
    if (debtor) {
      setDebtorSelected(debtor);
    } else {
      setDebtorSelected(null);
    }
  };

  const handleSelectBailiff = (bailiff: Bailiff | null) => {
    if (bailiff) {
      setBailiffSelected(bailiff);
    } else {
      setBailiffSelected(null);
    }
  };

  const handleOpenModalDebtor = () => {
    setOpenModalDebtor(true);
  };

  const handleCloseModalDebtor = () => {
    setOpenModalDebtor(false);
  };

  const handleRequestApproval = async () => {
    if (!id) return;

    if (!tenant) return;

    AlertService.showConfirm(
      "Weet je het zeker?",
      "Deze actie vraagt goedkeuring voor het vonnis. Wil je doorgaan?",
      "Ja, aanvragen",
      "Annuleren"
    ).then(async (confirmed) => {
      if (confirmed) {
        await requestVerdictApproval(id);
        notifyInfo("Aanvraag voor goedkeuring verzonden");

        // tenant?.subdomain
        await handleSendMailNotificationBailiff(id);
        notifyInfo("We hebben een melding naar de deurwaarder gestuurd.");

        router.push(`/dashboard/verdicts`);
      }
    });
  };

  const handleSaveDebtor = async (debtor: DebtorBase) => {
    handleSelectDebtor(debtor);
    await fetchDebtors();
  };

  const handleSaveBailiff = async (bailiff: Bailiff) => {
    handleSelectBailiff(bailiff);
    await fetchBailiffs();
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
    const data = await getAllBailiffs(tenant?.id || "");

    if (!data) {
      setBailiffs([]);
      return;
    }

    setBailiffs(data);
  };

  const handleOpenModalBailiff = () => {
    setOpenModalBailiff(true);
  };

  const handleCloseModalBailiff = () => {
    setOpenModalBailiff(false);
  };

  React.useEffect(() => {
    if (!tenant?.id) return;

    fetchDebtors();
    fetchBailiffs();
  }, [tenant?.id]);

  return (
    <Box>
      <VerdictFormProvider
        id={id}
        defaultValues={defaultValues}
        setSubmitting={setSubmitting}
      >
        {/* Action Buttons */}
        <Box
          sx={{
            mb: 2,
            mt: 2,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" gutterBottom>
            NIEUW VONNIS TOEVOEGEN
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              aria-label="delete"
              color="primary"
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              loading={submitting ? true : false}
            >
              Bewaar Vonnis
            </Button>
            <Button
              aria-label="pending"
              color="secondary"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleRequestApproval}
            >
              Vraag goedkeuring aan
            </Button>
          </Stack>
        </Box>

        {/* Vonnis Toevoegen Section */}
        <JudgmentSection
          handleOpenModalDebtor={handleOpenModalDebtor}
          onSelectDebtor={handleSelectDebtor}
          debtors={debtors}
        />

        <StatutoryInterestSection />

        <AttachmentSection />

        <ServiceCostsSection
          handleOpenModalBailiff={handleOpenModalBailiff}
          onSelectBailiff={handleSelectBailiff}
          bailiffs={bailiffs}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid
              container
              direction="column"
              justifyContent="start"
              alignItems="center"
              sx={{ minHeight: 200, mt: 2, height: "100%" }}
            >
              {modeEdit && <AttachmentsSection verdictId={id || ""} />}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <VerdictTotals />
          </Grid>
        </Grid>
      </VerdictFormProvider>

      <ModalFormDebtor
        open={openModalDebtor}
        onClose={handleCloseModalDebtor}
        onSave={handleSaveDebtor}
        id={debtorSelected?.id}
      />

      <ModalFormBailiff
        open={openModalBailiff}
        onClose={handleCloseModalBailiff}
        onSave={handleSaveBailiff}
        id={bailiffSelected?.id} // Aquí puedes pasar el ID del deudor si estás editando
      />
    </Box>
  );
};

export default VerdictFormPage;
