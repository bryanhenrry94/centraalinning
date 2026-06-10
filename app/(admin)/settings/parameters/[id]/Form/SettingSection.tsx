"use client";

import React from "react";

import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CircularProgress,
  Grid,
  Link,
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

interface Setting {
  id: string;
  key: string;
  value: string;
  name: string;
  description: string | null;
  value_type?: string;
}

interface SettingsCategory {
  id: string;
  name: string;
}

interface FormValues {
  settings: Setting[];
}

export const SettingSection = ({ id }: { id: string }) => {
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

        const [settingsResponse, categoryResponse] = await Promise.all([
          fetch(`/api/admin/settings?categoryId=${id}`),

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
  }, [id, reset]);

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
        {/* BREADCRUMBS */}
        {/* <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link underline="hover" color="inherit" href="/dashboard">
            Home
          </Link>

          <Link
            underline="hover"
            color="inherit"
            href="/admin/settings/parameters"
          >
            Parameters
          </Link>

          <Typography color="text.primary">
            {category?.name || "Sin categoría"}
          </Typography>
        </Breadcrumbs> */}

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
