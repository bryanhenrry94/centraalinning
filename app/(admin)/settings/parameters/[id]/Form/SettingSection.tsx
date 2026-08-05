"use client";

import React from "react";

import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { JurisdictionSelect } from "@/modules/settings/components/JurisdictionSelect";

interface Setting {
  id: string;
  key: string;
  value: string;
  name: string;
  description: string | null;
  value_type?: string;
  jurisdiction?: { id: string; islandCode: string; islandName: string } | null;
}

interface SettingsCategory {
  id: string;
  name: string;
}

interface FormValues {
  settings: Setting[];
}

export const SettingSection = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const jurisdictionId = searchParams.get("jurisdictionId");

  const [category, setCategory] = React.useState<SettingsCategory | null>(null);

  const [loading, setLoading] = React.useState(true);

  const [error, setError] = React.useState<string | null>(null);

  const methods = useForm<FormValues>({
    defaultValues: {
      settings: [],
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = methods;

  const { fields } = useFieldArray({
    control,
    name: "settings",
  });

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const settingsUrl = jurisdictionId
          ? `/api/admin/settings?categoryId=${id}&jurisdictionId=${jurisdictionId}`
          : `/api/admin/settings?categoryId=${id}`;

        const [settingsResponse, categoryResponse] = await Promise.all([
          fetch(settingsUrl),

          fetch(`/api/admin/settings/categories/${id}`),
        ]);

        if (!settingsResponse.ok || !categoryResponse.ok) {
          throw new Error("Error loading data");
        }

        const settingsResult = await settingsResponse.json();

        const categoryResult = await categoryResponse.json();

        setCategory(categoryResult);

        reset({
          settings: settingsResult.data,
        });
      } catch (err) {
        console.error(err);

        setError("No se pudieron cargar los parámetros");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, jurisdictionId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values.settings),
      });

      if (!response.ok) {
        throw new Error("Error updating settings");
      }

      alert("Configuraciones guardadas correctamente");
    } catch (error) {
      console.error(error);

      alert("Error al guardar configuraciones");
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mt: 3 }}
        >
          <Box>
            <Link
              underline="hover"
              color="inherit"
              href={
                jurisdictionId
                  ? `/admin/settings/parameters?jurisdictionId=${jurisdictionId}`
                  : "/admin/settings/parameters"
              }
              sx={{ fontSize: 14, display: "block", mb: 0.5 }}
            >
              ← Parameters
            </Link>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {category?.name || "Sin categoría"}
            </Typography>
          </Box>

          <JurisdictionSelect />
        </Stack>

        {/* SETTINGS CARD */}
        <Card
          sx={{
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "none",
            overflow: "hidden",
            bgcolor: "background.paper",
            mt: 4,
          }}
        >
          <Box
            sx={{
              p: {
                xs: 2,
                md: 4,
              },
            }}
          >
            <Grid container spacing={4}>
              {fields.map((setting, index) => (
                <Grid
                  key={setting.id}
                  size={{
                    xs: 12,
                    md: 3,
                  }}
                >
                  <Box>
                    {/* LABEL */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2">{setting.name}</Typography>

                      {setting.description && (
                        <InfoOutlinedIcon
                          sx={{
                            fontSize: 16,
                            color: "text.secondary",
                          }}
                        />
                      )}

                      <Chip
                        label={setting.jurisdiction?.islandName ?? "Global"}
                        size="small"
                        variant="outlined"
                        color={setting.jurisdiction ? "primary" : "default"}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    </Box>

                    {/* DESCRIPTION */}
                    {setting.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        mb={1.5}
                      >
                        {setting.description}
                      </Typography>
                    )}

                    {/* INPUT */}
                    <Controller
                      name={`settings.${index}.value`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          variant="outlined"
                          placeholder={`Enter ${setting.name}`}
                          sx={{ bgcolor: "#DDDBDA" }}
                        />
                      )}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box display="flex" justifyContent="space-between" mt={4}>
              {/* <Typography variant="body2" color="text.secondary">
                {isDirty ? "You have unsaved changes." : "All changes saved."}
              </Typography> */}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting || !isDirty}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "none",
                }}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Box>
        </Card>

        {/* SAVE BAR */}
        {/* <Box
          sx={{
            position: "sticky",
            bottom: 0,
            mt: 4,
            py: 2,
            px: 3,

            border: "1px solid",
            borderColor: "divider",

            bgcolor: "background.paper",

            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",

            backdropFilter: "blur(10px)",

            zIndex: 20,
          }}
        >
          
        </Box> */}
      </Box>
    </FormProvider>
  );
};
