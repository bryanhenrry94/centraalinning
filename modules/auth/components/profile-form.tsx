import React, { useEffect, useState } from "react";
import { Stack, TextField, Button, Box } from "@mui/material";

type Profile = {
  email: string;
  fullname?: string;
  phone?: string;
};

type Props = {
  initial?: Profile;
  onSave?: (profile: Profile) => void;
};

const ProfileForm: React.FC<Props> = ({ initial, onSave }) => {
  const [formData, setFormData] = useState<Profile>({
    email: "",
    fullname: "",
    phone: "",
  });

  useEffect(() => {
    if (initial) {
      setFormData({
        email: initial.email,
        fullname: initial.fullname ?? "",
        phone: initial.phone ?? "",
      });
    }
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation: email must be present
    if (!formData.email) {
      alert("El email es obligatorio.");
      return;
    }
    onSave?.(formData);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      aria-label="Profile form"
      noValidate
      sx={{ mt: 2 }}
    >
      <Stack spacing={2}>
        <Box>
          <TextField
            id="email"
            name="email"
            type="email"
            value={formData.email}
            fullWidth
            variant="outlined"
            placeholder="Email"
            disabled
            InputProps={{
              readOnly: true,
            }}
            inputProps={{
              "aria-readonly": "true",
            }}
            helperText="El email no es editable."
          />
        </Box>

        <Box>
          <TextField
            id="fullname"
            name="fullname"
            type="text"
            value={formData.fullname}
            onChange={(e) =>
              setFormData({ ...formData, fullname: e.target.value })
            }
            placeholder="Nombre completo"
            fullWidth
            variant="outlined"
          />
        </Box>

        <Box>
          <TextField
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="Teléfono"
            fullWidth
            variant="outlined"
          />
        </Box>

        <Box>
          <Button type="submit" variant="contained" color="primary">
            Guardar
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ProfileForm;
