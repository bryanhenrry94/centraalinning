"use client";
import React, { useEffect, useMemo, useState } from "react";
// mui
import { Box, Button, Grid, Stack, Typography } from "@mui/material";
// icons
import SaveIcon from "@mui/icons-material/Save";
import { z } from "zod";
// validations
import { VerdictCreate, VerdictCreateForm } from "@/lib/validations/verdict";
import { notifyError, notifyInfo } from "@/lib/notifications";
// actions
import {
  approveVerdict,
  createVerdict,
  handleSendMailNotificationBailiff,
  requestVerdictApproval,
  updateVerdict,
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
import { useSession } from "next-auth/react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { BailiffSection } from "./sections/bailiff-section";
import GavelIcon from "@mui/icons-material/Gavel";

interface VerdictFormPageProps {
  defaultValues: VerdictCreate;
  modeEdit: boolean;
  id?: string;
}

const VerdictFormPage: React.FC<VerdictFormPageProps> = ({
  id,
  defaultValues,
  modeEdit,
}) => {
  const { data: session } = useSession();
  const { tenant } = useTenant();
  const [debtors, setDebtors] = React.useState<DebtorBase[]>([]);
  const [bailiffs, setBailiffs] = React.useState<Bailiff[]>([]);
  const [openModalDebtor, setOpenModalDebtor] = React.useState(false);
  const [openModalBailiff, setOpenModalBailiff] = React.useState(false);
  const [bailiffSelected, setBailiffSelected] =
    React.useState<Bailiff | null>();
  const [debtorSelected, setDebtorSelected] =
    React.useState<DebtorBase | null>();
  const router = useRouter();

  // console.log("Session in VerdictFormPage:", session);

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

  const methods = useForm<z.infer<typeof VerdictCreateForm>>({
    resolver: zodResolver(VerdictCreateForm) as Resolver<
      z.infer<typeof VerdictCreateForm>
    >,
    defaultValues,
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = methods;

  const serializedDefaults = useMemo(
    () => JSON.stringify(defaultValues),
    [defaultValues]
  );

  useEffect(() => {
    if (!defaultValues) return;
    methods.reset(JSON.parse(serializedDefaults));
  }, [serializedDefaults]);

  const onSubmit = async (data: z.infer<typeof VerdictCreateForm>) => {
    try {
      // Update flow
      if (id) {
        const updated = await updateVerdict(id, data);
        if (updated) {
          notifyInfo("Registratie is bijgewerkt");
        } else {
          notifyError("Bijwerken mislukt. Probeer het opnieuw.");
        }
        return;
      }

      // Create flow
      if (!tenant) {
        notifyError(
          "Onverwerkte fout, neem contact op met uw systeembeheerder"
        );
        return;
      }

      const confirmed = await AlertService.showConfirm(
        "Weet je het zeker?",
        "Deze actie registreert het vonnis. Wil je doorgaan?",
        "Ja, registreren",
        "Annuleren"
      );

      if (!confirmed) return;

      const newVerdict = await createVerdict(data, tenant.id);
      if (!newVerdict) {
        notifyError(
          "Er is een fout opgetreden bij het aanmaken van de registratie."
        );
        return;
      }

      notifyInfo("Registratie is succesvol aangemaakt");
      router.push(`/dashboard/verdicts/${newVerdict.id}/edit`);
    } catch (error) {
      console.error("Error submitting verdict form:", error);
      notifyError(
        "Er is een fout opgetreden bij het verzenden van het formulier."
      );
    }
  };

  const handleApprove = async () => {
    if (!id) return;

    AlertService.showConfirm(
      "Weet je het zeker?",
      "Het vonnis wordt goedgekeurd en de schuldenaar wordt op de hoogte gesteld.",
      "Ja, goedkeuren",
      "Annuleren"
    ).then(async (confirmed) => {
      if (confirmed) {
        const response = await approveVerdict(id);

        if (response) {
          notifyInfo("Vonnis succesvol goedgekeurd");
          router.push(`/dashboard/verdicts`);
        } else {
          notifyError("Fout bij het goedkeuren van het vonnis");
        }
      }
    });
  };

  return (
    <Box>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
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
                loading={isSubmitting ? true : false}
              >
                Bewaar Vonnis
              </Button>
              {watch("status") === "DRAFT" &&
                session?.user?.role !== "BAILIFF" &&
                watch("bailiff_id") && (
                  <Button
                    aria-label="pending"
                    color="secondary"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleRequestApproval}
                    disabled={modeEdit ? false : true}
                  >
                    Vraag goedkeuring aan
                  </Button>
                )}

              {session?.user?.role === "BAILIFF" && modeEdit && (
                <Button
                  color="secondary"
                  aria-label="add an alarm"
                  variant="contained"
                  onClick={handleApprove}
                  startIcon={<GavelIcon />}
                >
                  Vonnis goedkeuren
                </Button>
              )}

              {/* {verdict?.status === "APPROVED" ? (
                <Chip color="success" label="Vonnis aprobado" />
              ) : (
                <Box>
                  <Stack direction="row" spacing={1}>
                   
                  </Stack>
                </Box>
              )} */}
            </Stack>
          </Box>

          {/* Vonnis Toevoegen Section */}
          <JudgmentSection
            handleOpenModalDebtor={handleOpenModalDebtor}
            onSelectDebtor={handleSelectDebtor}
            debtors={debtors}
          />

          <Box>
            <BailiffSection
              handleOpenModalBailiff={handleOpenModalBailiff}
              onSelectBailiff={handleSelectBailiff}
              bailiffs={bailiffs}
            />
          </Box>

          {session?.user?.role === "BAILIFF" && (
            <>
              <StatutoryInterestSection />

              <AttachmentSection />

              <ServiceCostsSection
                handleOpenModalBailiff={handleOpenModalBailiff}
                onSelectBailiff={handleSelectBailiff}
                bailiffs={bailiffs}
              />
            </>
          )}

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
        </form>
      </FormProvider>
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
