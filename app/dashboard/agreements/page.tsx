"use client";
import { useEffect, useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { AgreementResponse } from "@/lib/validations/agreement";
import { getPaymentAgreements } from "@/actions/agreement";
import TabPanel from "@/components/ui/tab-panel";
import { useSession } from "next-auth/react";
import { AgreementTableApprove } from "@/components/agreements/agreement-table-approve";
import AgreementTable from "@/components/agreements/agreement-table";

const PaymentAgreementsPage = () => {
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
      status: "PENDING",
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
    <Box sx={{ m: 4 }}>
      <Box
        sx={{
          width: "100%",
          mt: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" gutterBottom>
          BETALINGSREGELING
        </Typography>
        <Tabs value={value} onChange={handleChange} aria-label="example tabs">
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
