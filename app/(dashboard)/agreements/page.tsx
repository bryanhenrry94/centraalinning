"use client";
import { useEffect, useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { getPaymentAgreements } from "@/modules/agreement/actions/agreement.actions";
import TabPanel from "@/shared/ui/tab-panel";
import { useSession } from "next-auth/react";
import { AgreementTableApprove } from "@/modules/agreement/components/agreement-table-approve";
import AgreementTable from "@/modules/agreement/components/agreement-table";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { UserRole } from "@/shared/constants/user-role";
import { DebtorAgreementsView } from "@/modules/agreement/components/debtor-agreements-view";
import LoadingUI from "@/shared/ui/loading-ui";

const PaymentAgreementsPage = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <LoadingUI />;
  }

  if (session?.user?.roles?.includes(UserRole.DEBTOR)) {
    return <DebtorAgreementsView />;
  }

  return <StaffAgreementsView />;
};

const StaffAgreementsView = () => {
  const { data: session } = useSession();
  const [value, setValue] = useState(0);
  const [agreementsPending, setAgreementsPending] = useState<
    AgreementResponse[]
  >([]);
  const [agreementsProcessed, setAgreementsProcessed] = useState<
    AgreementResponse[]
  >([]);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    if (!session?.user?.tenant_id) return;

    const pending = await getPaymentAgreements({
      tenant_id: session.user.tenant_id,
      status: AgreementStatus.PENDING,
    });

    const processed = await getPaymentAgreements({
      tenant_id: session.user.tenant_id,
    });

    setAgreementsPending(pending);
    setAgreementsProcessed(processed.filter((a) => a.status !== "PENDING"));
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleApprove = () => {
    fetchAgreements();
  };

  const handleReject = async () => {
    fetchAgreements();
  };

  const handleUpdateAgreement = () => {
    fetchAgreements();
  };

  return (
    <Box sx={{ m: { xs: 1.5, sm: 4 } }}>
      <Box
        sx={{
          width: "100%",
          mt: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          BETALINGSREGELING
        </Typography>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="example tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            value={0}
            label={`In behandeling (${agreementsPending.length})`}
            wrapped
          />
          <Tab value={1} label={`Verwerkt (${agreementsProcessed.length})`} />
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        <Box sx={{ mt: 2 }}>
          <AgreementTableApprove
            agreements={agreementsPending}
            onApprove={handleApprove}
            onReject={handleReject}
            onUpdate={handleUpdateAgreement}
          />
        </Box>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box sx={{ mt: 2 }}>
          <AgreementTable agreements={agreementsProcessed} />
        </Box>
      </TabPanel>
    </Box>
  );
};
export default PaymentAgreementsPage;
