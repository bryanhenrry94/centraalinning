import React from "react";
import { Box, Slider, Typography, TextField, MenuItem } from "@mui/material";
import { ITenantSignUp } from "@/lib/validations/signup";
import { CountryList } from "@/shared/constants/country";
import { RoleList } from "@/shared/constants/role-list";

interface AccountInfoCardProps {
  initial: ITenantSignUp;
  setFormData: (data: ITenantSignUp) => void;
}

export default function AccountInfoCard(props: AccountInfoCardProps) {
  const { initial, setFormData } = props;

  const marks = [
    { value: 1, label: "1" },
    { value: 100, label: "100+" },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 2,
      }}
    >
      <Box>
        {/* <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          1. Systeemactivering
        </Typography> */}

        <TextField
          name="role"
          fullWidth
          label="Rol"
          placeholder="Rol"
          value={initial.company?.role || "PLATFORM_OWNER"}
          type="text"
          select
          required
          onChange={(e) =>
            setFormData({
              ...initial,
              company: {
                ...initial.company,
                role: e.target.value,
              },
            })
          }
        >
          {RoleList.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <Typography variant="caption" color="text.secondary">
          Selecteer de registratierol.
        </Typography>
      </Box>

      <TextField
        name="name"
        fullWidth
        label="Bedrijfsnaam"
        placeholder="Bedrijfsnaam"
        value={initial.company?.name || ""}
        type="text"
        onChange={(e) =>
          setFormData({
            ...initial,
            company: {
              ...initial.company,
              name: e.target.value,
            },
          })
        }
        required
      />
      <TextField
        name="contact_email"
        fullWidth
        label="Contact E-mail"
        placeholder="Contact E-mail"
        value={initial.company?.contact_email || ""}
        type="text"
        onChange={(e) =>
          setFormData({
            ...initial,
            company: {
              ...initial.company,
              contact_email: e.target.value,
            },
          })
        }
        required
      />
      <TextField
        name="kvk"
        fullWidth
        label="Kvk Code"
        placeholder="Kvk Code"
        value={initial.company?.kvk || ""}
        type="text"
        onChange={(e) =>
          setFormData({
            ...initial,
            company: {
              ...initial.company,
              kvk: e.target.value,
            },
          })
        }
        required
      />
      <TextField
        name="country"
        fullWidth
        label="Land"
        placeholder="Land"
        value={initial.company?.country || "BON"}
        type="text"
        select
        required
        onChange={(e) =>
          setFormData({
            ...initial,
            company: {
              ...initial.company,
              country: e.target.value,
            },
          })
        }
      >
        {CountryList.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        name="address"
        fullWidth
        label="Adres Bedrijf"
        placeholder="Adres Bedrijf"
        value={initial.company?.address || ""}
        type="text"
        onChange={(e) =>
          setFormData({
            ...initial,
            company: {
              ...initial.company,
              address: e.target.value,
            },
          })
        }
        required
      />
      <Box>
        <Typography variant="body2" gutterBottom>
          Aantal Werknemers
        </Typography>
        <Box sx={{ width: "100%" }}>
          <Slider
            name="number_of_employees"
            defaultValue={1}
            step={1}
            marks={marks}
            min={1}
            max={100}
            value={initial.company?.number_of_employees || 1}
            onChange={(_, value) =>
              setFormData({
                ...initial,
                company: {
                  ...initial.company,
                  number_of_employees: value as number,
                },
              })
            }
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>
    </Box>
  );
}
