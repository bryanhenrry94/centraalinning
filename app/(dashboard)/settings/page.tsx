"use client";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import TabPanel from "@/shared/ui/tab-panel";
import {
  Box,
  Button,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { AccountForm } from "@/modules/auth/components/account-form";
import ProfileForm from "@/modules/auth/components/profile-form";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { updateUserProfile } from "@/modules/auth/actions/user.actions";
import { notifyInfo } from "@/shared/ui/notifications";
import UserTable from "@/modules/auth/components/user-table";
import InvitationTable from "@/modules/auth/components/invitation-table";
import { EmployeeForm } from "@/modules/employee/components/employee-form";
import { BankAccountForm } from "@/modules/tenant/components/bank-account-form";
import { UserRole } from "@/shared/constants/user-role";

const SettingPageContent = () => {
  const searchParams = useSearchParams();
  const initialTab = Number(searchParams.get("tab"));
  const [value, setValue] = useState(
    Number.isInteger(initialTab) && initialTab >= 0 && initialTab <= 6
      ? initialTab
      : 0,
  );

  const { user } = useAuthSession();

  const isPureDebtor =
    !!user?.roles?.includes(UserRole.DEBTOR) &&
    !user?.roles?.some((role) => role !== UserRole.DEBTOR);

  const isSimplifiedSettingsRole =
    !!user?.roles?.includes(UserRole.LAWYER) || !!user?.roles?.includes(UserRole.BAILIFF);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleSaveProfile = async (profile: {
    email: string;
    fullname?: string;
    phone?: string;
  }) => {
    if (!user?.id) {
      console.error("No user ID found in session.");
      return;
    }

    await updateUserProfile(user.id, {
      fullname: profile.fullname,
      phone: profile.phone,
    });

    notifyInfo("Profiel succesvol bijgewerkt.");
  };

  if (isPureDebtor) {
    return (
      <Container
        maxWidth="lg"
        disableGutters
        sx={{
          px: { xs: 1, sm: 3 },
          py: { xs: 1.5, sm: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Configuratie
        </Typography>

        <ProfileForm
          initial={{
            email: user?.email || "",
            fullname: user?.fullname || "",
            phone: user?.phone,
          }}
          onSave={handleSaveProfile}
        />
      </Container>
    );
  }

  if (isSimplifiedSettingsRole) {
    return (
      <Container
        maxWidth="lg"
        disableGutters
        sx={{
          px: { xs: 1, sm: 3 },
          py: { xs: 1.5, sm: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Configuratie
        </Typography>

        <Box sx={{ width: "100%" }}>
          <Tabs value={value > 1 ? 0 : value} onChange={handleChange} aria-label="settings tabs">
            <Tab value={0} label="Rekening" wrapped />
            <Tab value={1} label="Profiel" />
          </Tabs>
        </Box>
        <TabPanel value={value > 1 ? 0 : value} index={0}>
          <AccountForm />
        </TabPanel>
        <TabPanel value={value > 1 ? 0 : value} index={1}>
          <ProfileForm
            initial={{
              email: user?.email || "",
              fullname: user?.fullname || "",
              phone: user?.phone,
            }}
            onSave={handleSaveProfile}
          />
        </TabPanel>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{
        px: { xs: 1, sm: 3 },
        py: { xs: 1.5, sm: 4 },
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Configuratie
      </Typography>

      <Box sx={{ width: "100%" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="example tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab value={0} label="Rekening" wrapped />
          <Tab value={1} label="Profiel" />
          <Tab value={2} label="Gebruikers" />
          <Tab value={3} label="Facturering" />
          <Tab value={4} label="Medewerkers" />
          <Tab value={5} label="Bankrekeningen" />
          <Tab value={6} label="Uitnodigingen" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <AccountForm />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ProfileForm
          initial={{
            email: user?.email || "",
            fullname: user?.fullname || "",
            phone: user?.phone,
          }}
          onSave={handleSaveProfile}
        />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <UserTable tenant_id={user?.tenant_id || ""} />
      </TabPanel>
      <TabPanel value={value} index={3}></TabPanel>
      <TabPanel value={value} index={4}>
        <EmployeeForm />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <BankAccountForm />
      </TabPanel>
      <TabPanel value={value} index={6}>
        <InvitationTable tenant_id={user?.tenant_id || ""} />
      </TabPanel>
    </Container>
  );
};

const SettingPage = () => (
  <Suspense fallback={null}>
    <SettingPageContent />
  </Suspense>
);

export default SettingPage;
