"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { UserRole } from "@/shared/constants/user-role";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import LoadingUI from "@/shared/ui/loading-ui";
import TabPanel from "@/shared/ui/tab-panel";
import { getAllCollectiveCollectionsForTenant } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { CollectiveCollectionsTable } from "@/modules/collective-follow-up/components/collective-collections-table";
import { DebtorCollectiveCollectionsView } from "@/modules/collective-follow-up/components/debtor-collective-collections-view";

type CollectiveCollectionRow = Awaited<
  ReturnType<typeof getAllCollectiveCollectionsForTenant>
>[number];

const CollectiveFollowUpPageContent = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <LoadingUI />;
  }

  if (session?.user?.roles?.includes(UserRole.DEBTOR)) {
    return <DebtorCollectiveCollectionsView />;
  }

  return <StaffCollectiveFollowUpView />;
};

const CollectiveFollowUpPage = () => (
  <Suspense fallback={<LoadingUI />}>
    <CollectiveFollowUpPageContent />
  </Suspense>
);

const StaffCollectiveFollowUpView = () => {
  const { tenant } = useTenant();
  const [tab, setTab] = useState(0);
  const [collections, setCollections] = useState<CollectiveCollectionRow[]>([]);

  const fetchCollections = useCallback(async () => {
    if (!tenant?.id) return;
    const data = await getAllCollectiveCollectionsForTenant(tenant.id);
    setCollections(data);
  }, [tenant?.id]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const active = collections.filter((c) => c.status === "ACTIVE");
  const awaitingResponse = collections.filter((c) => c.status === "AWAITING_DEBTOR_RESPONSE");
  const agreements = collections.filter(
    (c) => c.status === "PAYMENT_AGREEMENT_REQUESTED" || c.status === "PAYMENT_AGREEMENT_ACCEPTED",
  );
  const paid = collections.filter((c) => c.status === "PAID_IN_FULL");
  const transferred = collections.filter((c) => c.status === "TRANSFERRED");

  const buckets = [active, awaitingResponse, agreements, paid, transferred];

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
          COLLECTIEVE OPVOLGING
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={`Actief (${active.length})`} />
          <Tab label={`Wacht op debiteur (${awaitingResponse.length})`} />
          <Tab label={`Betalingsregeling (${agreements.length})`} />
          <Tab label={`Betaald (${paid.length})`} />
          <Tab label={`Overgedragen (${transferred.length})`} />
        </Tabs>
      </Box>

      {buckets.map((bucket, index) => (
        <TabPanel key={index} value={tab} index={index}>
          <CollectiveCollectionsTable collections={bucket} />
        </TabPanel>
      ))}
    </Box>
  );
};

export default CollectiveFollowUpPage;
