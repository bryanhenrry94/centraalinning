"use client";

import { Suspense } from "react";
import { useSettingCategories } from "@/modules/settings/hooks/use-setting-categories";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Chip,
  Container,
  Stack,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { JurisdictionSelect } from "@/modules/settings/components/JurisdictionSelect";

const ParametersPageContent = () => {
  const searchParams = useSearchParams();
  const jurisdictionId = searchParams.get("jurisdictionId");
  const { categories, isLoading } = useSettingCategories(jurisdictionId);
  const router = useRouter();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Parameters
        </Typography>

        <JurisdictionSelect />
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {categories.map((category: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={category.id}>
              <Card
                sx={{ height: "100%", bgcolor: "white", cursor: "pointer" }}
                onClick={() =>
                  router.push(
                    `/admin/settings/parameters/${category.id}${
                      jurisdictionId ? `?jurisdictionId=${jurisdictionId}` : ""
                    }`,
                  )
                }
              >
                <CardContent>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    {category.name}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {category._count.settings} parámetros
                    </Typography>

                    <Chip
                      label={category.isActive ? "Activo" : "Inactivo"}
                      size="small"
                      color={category.isActive ? "success" : "error"}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default function ParametersPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      }
    >
      <ParametersPageContent />
    </Suspense>
  );
}
