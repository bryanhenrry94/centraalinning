import { Suspense } from "react";
import { Container, Box, CircularProgress } from "@mui/material";
import { SettingSection } from "./Form/SettingSection";

export default async function ParameterPageEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Container maxWidth="lg">
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        }
      >
        <SettingSection id={id} />
      </Suspense>
    </Container>
  );
}
