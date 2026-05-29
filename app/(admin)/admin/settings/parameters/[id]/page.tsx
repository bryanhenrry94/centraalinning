import { Container } from "@mui/material";
import { SettingSection } from "./Form/SettingSection";

export default async function ParameterPageEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Container maxWidth="lg">
      <SettingSection id={id} />
    </Container>
  );
}
