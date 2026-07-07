import React from "react";
// mui
import { Box, TextField } from "@mui/material";
// validations
import { ITenantSignUp } from "@/lib/validations/signup";

interface AccountInfoCardProps {
  initial: ITenantSignUp;
  setFormData: (data: ITenantSignUp) => void;
}

export default function AccountInfoCard(props: AccountInfoCardProps) {
  const { initial, setFormData } = props;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 2,
      }}
    >
      <TextField
        name="fullname"
        fullWidth
        label="Volledige naam"
        value={initial.user?.fullname || ""}
        type="text"
        required
        onChange={(e) =>
          setFormData({
            ...initial,
            user: {
              ...initial.user,
              fullname: e.target.value,
            },
          })
        }
      />
      <TextField
        name="email"
        label="Email"
        value={initial.user?.email || ""}
        type="email"
        required
        fullWidth
        onChange={(e) =>
          setFormData({
            ...initial,
            user: {
              ...initial.user,
              email: e.target.value,
            },
          })
        }
      />
      <TextField
        name="password"
        label="Wachtwoord"
        type="password"
        value={initial.user?.password || ""}
        required
        fullWidth
        onChange={(e) =>
          setFormData({
            ...initial,
            user: {
              ...initial.user,
              password: e.target.value,
            },
          })
        }
      />
      <TextField
        name="phone"
        label="Telefoonnummer"
        type="text"
        value={initial.user?.phone || ""}
        placeholder="Telefoonnummer"
        required
        fullWidth
        onChange={(e) =>
          setFormData({
            ...initial,
            user: {
              ...initial.user,
              phone: e.target.value,
            },
          })
        }
      />
    </Box>
  );
}
