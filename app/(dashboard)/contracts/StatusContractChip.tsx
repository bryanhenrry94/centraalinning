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

    case "PENDING_PAYMENT":
      return (
        <Chip
          size="small"
          label="In afwachting van betaling"
          color="info"
          sx={{ width: width || 100 }}
        />
      );

    case "IN_COLLECTION":
      return (
        <Chip
          size="small"
          label="Administratieve opvolging"
          color="error"
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

    case "CANCELLED":
      return (
        <Chip
          size="small"
          label="Geannuleerd"
          color="warning"
          sx={{ width: width || 100 }}
        />
      );

    default:
      return <Chip size="small" label={status} sx={{ width: width || 100 }} />;
  }
};
