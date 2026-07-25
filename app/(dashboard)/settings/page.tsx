"use client";
import React, { useState } from "react";
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
import { EmployeeForm } from "@/modules/employee/components/employee-form";
import { UserRole } from "@/shared/constants/user-role";

const SettingPage = () => {
  const [value, setValue] = useState(0);

  const { user } = useAuthSession();

  const isPureDebtor =
    !!user?.roles?.includes(UserRole.DEBTOR) &&
    !user?.roles?.some((role) => role !== UserRole.DEBTOR);

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

    notifyInfo("Perfil actualizado correctamente.");
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
    </Container>
  );
};

export default SettingPage;
