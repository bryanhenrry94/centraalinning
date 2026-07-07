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
} from "@/lib/validations/verdict";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
// actions
import {
  approveVerdict,
  createVerdict,
  updateVerdict,
} from "@/modules/verdict/actions/verdict.actions";
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
import { ModalFormBailiff } from "@/modules/bailiff/components/modal-bailiff-form";
import { getAllBailiffs } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/lib/validations/bailiff";
import { useSession } from "next-auth/react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { BailiffSection } from "./sections/bailiff-section";
import GavelIcon from "@mui/icons-material/Gavel";
import { UserRole } from "@/shared/constants/user-role";

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
  const [debtors, setDebtors] = React.useState<DebtorInput[]>([]);
  const [bailiffs, setBailiffs] = React.useState<Bailiff[]>([]);
  const [openModalDebtor, setOpenModalDebtor] = React.useState(false);
  const [openModalBailiff, setOpenModalBailiff] = React.useState(false);
  const [bailiffSelected, setBailiffSelected] =
    React.useState<Bailiff | null>();
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

  const handleSaveDebtor = async (debtor: DebtorInput) => {
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
      // Prevent submission without tenant
      console.log("Submitting verdict form with data:", data);
      if (!tenant) {
        return notifyError(
          "Onverwerkte fout, neem contact op met uw systeembeheerder",
        );
      }

      const isUpdate = Boolean(id);
      const actionMessage = isUpdate
        ? "U staat op het punt de registratie bij te werken. Wilt u doorgaan?"
        : "U staat op het punt een nieuwe registratie aan te maken. Wilt u doorgaan?";

      // Confirm creation only for new verdicts
      if (!isUpdate) {
        const confirmed = await AlertService.showConfirm(
          "Waarschuwing",
          actionMessage,
          "Ja, registreren",
          "Annuleren",
        );
        if (!confirmed) return;
      }

      // Execute create or update
      const verdict = isUpdate
        ? await updateVerdict(id!, data)
        : await createVerdict(data, tenant.id);

      // Handle result
      if (!verdict) {
        return notifyError(
          `Er is een fout opgetreden bij het ${
            isUpdate ? "bijwerken" : "aanmaken"
          } van de registratie.`,
        );
      }

      notifyInfo(
        `Registratie is succesvol ${isUpdate ? "bijgewerkt" : "aangemaakt"}`,
      );

      // Redirect after creation
      if (!isUpdate) {
        router.push(`/dashboard/verdicts/${verdict.id}/edit`);
      }
    } catch (error) {
      console.error("Error submitting verdict form:", error);
      notifyError(
        "Er is een fout opgetreden bij het verzenden van het formulier.",
      );
    }
  };

  const handleApprove = async () => {
    if (!id) return;

    AlertService.showConfirm(
      "Weet je het zeker?",
      "Het vonnis wordt goedgekeurd en de schuldenaar wordt op de hoogte gesteld.",
      "Ja, goedkeuren",
      "Annuleren",
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
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

              <Button
                color="secondary"
                aria-label="add an alarm"
                variant="contained"
                onClick={handleApprove}
                startIcon={<GavelIcon />}
              >
                Vonnis goedkeuren
              </Button>
            </Stack>
          </Box>

          {/* Vonnis Toevoegen Section */}
          <JudgmentSection
            handleOpenModalDebtor={handleOpenModalDebtor}
            onSelectDebtor={handleSelectDebtor}
            debtors={debtors}
          />

          {/* {session?.user?.roles.includes(UserRole.BAILIFF) && ( */}
            <BailiffSection
              handleOpenModalBailiff={handleOpenModalBailiff}
              onSelectBailiff={handleSelectBailiff}
              bailiffs={bailiffs}
            />
          {/* )} */}

          {/* {session?.user?.roles.includes(UserRole.BAILIFF) && ( */}
            <>
              <StatutoryInterestSection />

              <AttachmentSection />

              <ServiceCostsSection
                handleOpenModalBailiff={handleOpenModalBailiff}
                onSelectBailiff={handleSelectBailiff}
                bailiffs={bailiffs}
              />
            </>
          {/* )} */}

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
    </Container>
  );
};

export default VerdictFormPage;
