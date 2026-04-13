import { $Enums } from "@prisma/client";
import { Chip } from "@mui/material";

const PaymentAgreementStatusChip = ({
  status,
}: {
  status: $Enums.AgreementStatus;
}) => {
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
    case $Enums.AgreementStatus.PENDING:
      label = "Open";
      color = "primary";
      break;
    case $Enums.AgreementStatus.IN_NEGOTIATION:
      label = "In Onderhandeling";
      color = "info";
      break;
    case $Enums.AgreementStatus.COUNTEROFFER:
      label = "Tegenbod";
      color = "warning";
      break;
    case $Enums.AgreementStatus.ACCEPTED:
      label = "Geaccepteerd";
      color = "success";
      break;
    case $Enums.AgreementStatus.REJECTED:
      label = "Afgewezen";
      color = "error";
      break;
    case $Enums.AgreementStatus.CANCELLED:
      label = "Geannuleerd";
      color = "error";
      break;
    case $Enums.AgreementStatus.CLOSED:
      label = "Gesloten";
      color = "default";
      break;
    default:
      label = "Onbekend";
      color = "default";
      break;
  }

  return <Chip label={label} color={color} size="small" />;
};

export default PaymentAgreementStatusChip;
