"use client";
import React, { useState } from "react";
import TabPanel from "@/components/ui/tab-panel";
import {
  Box,
  Button,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { AccountForm } from "@/components/settings/account-form";
import ProfileForm from "@/components/settings/profile-form";
import { useAuthSession } from "@/hooks/useAuthSession";
import { updateUserProfile } from "@/actions/user";
import { notifyInfo } from "@/lib/notifications";
import UserTable from "@/components/settings/user-table";
import { EmployeeForm } from "@/components/employees/employee-form";

const SettingPage = () => {
  const [value, setValue] = useState(0);

  const { user } = useAuthSession();

  console.log("User in settings page:", user);

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

  return (
    <Container
      maxWidth="lg"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        Configuratie
      </Typography>

      <Box sx={{ width: "100%" }}>
        <Tabs value={value} onChange={handleChange} aria-label="example tabs">
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
            fullname: user?.name,
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
