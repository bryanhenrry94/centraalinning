"use client";

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
} from "@mui/material";
import { useRouter } from "next/navigation";

export default function ParametersPage() {
  const { categories, isLoading } = useSettingCategories();
  const router = useRouter();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Grid container spacing={3}>
        {categories.map((category: any) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={category.id}>
            <Card
              sx={{ height: "100%", bgcolor: "white" }}
              onClick={() =>
                router.push(`/admin/settings/parameters/${category.id}`)
              }
            >
              <CardContent>
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ fontWeight: 600 }}
                >
                  {category.name}
                </Typography>

                {/* <Typography variant="subtitle2" component="p">
                  {category.description}
                </Typography> */}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mt: 1 }}
                  >
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
    </Container>
  );
}
