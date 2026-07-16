import { Chip } from "@mui/material";

export const StatusContractChip = ({
  status,
  width,
}: {
  status: string;
  width?: number;
}) => {
  switch (status) {
    case "DRAFT":
      return (
        <Chip
          size="small"
          label="Concept"
          color="default"
          variant="filled"
          sx={{ width: width || 100 }}
        />
      );

    case "REGISTERED":
      return (
        <Chip
          size="small"
          label="Geregistreerd"
          color="primary"
          sx={{ width: width || 100 }}
        />
      );

    default:
      return <Chip size="small" label={status} sx={{ width: width || 100 }} />;
  }
};
