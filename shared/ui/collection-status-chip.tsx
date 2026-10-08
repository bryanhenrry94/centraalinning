import { Chip } from "@mui/material";

const CollectionStatusChip = ({ status }: { status: string }) => {
  let label = "Onbekend";
  let color:
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning" = "default";

  switch (status) {
    case "PENDING":
      label = "Te betalen";
      color = "warning";
      break;
    case "IN_PROGRESS":
      label = "Gedeeltelijk betaald";
      color = "warning";
      break;
    case "OVERDUE":
      label = "Verlopen";
      color = "error";
      break;
    case "PAID":
      label = "Betaald";
      color = "success";
      break;
    case "CANCELLED":
      label = "Geannuleerd";
      // CCP: "secondary" (navy) is voor structuur/headers, geen statuskleur;
      // geannuleerd is geen afwijzing/fout → grijs (default), niet rood.
      color = "default";
      break;
  }

  return <Chip label={label} color={color} size="small" />;
};

export default CollectionStatusChip;
