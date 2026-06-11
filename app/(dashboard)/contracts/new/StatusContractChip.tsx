import { Chip } from "@mui/material";

import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Article,
} from "@mui/icons-material";

export const StatusContractChip = ({ status }: { status: string }) => {
  switch (status) {
    case "DRAFT":
      return (
        <Chip label="Concept" color="default" size="small" icon={<Article />} />
      );
    case "PENDING_PAYMENT":
      return (
        <Chip
          label="In afwachting van betaling"
          color="warning"
          size="small"
          icon={<HourglassEmpty />}
        />
      );
    case "REGISTERED":
      return (
        <Chip
          label="Geregistreerd"
          color="success"
          size="small"
          icon={<CheckCircle />}
        />
      );
    case "CANCELLED":
      return (
        <Chip
          label="Geannuleerd"
          color="error"
          size="small"
          icon={<Cancel />}
        />
      );
    default:
      return null;
  }
};
