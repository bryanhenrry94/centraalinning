import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { Chip } from "@mui/material";

const PaymentAgreementStatusChip = ({
  status,
}: {
  status: AgreementStatus;
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
    case AgreementStatus.PENDING:
      label = "Open";
      color = "primary";
      break;
    case AgreementStatus.IN_NEGOTIATION:
      label = "In Onderhandeling";
      color = "info";
      break;
    case AgreementStatus.COUNTEROFFER:
      label = "Tegenbod";
      color = "warning";
      break;
    case AgreementStatus.ACCEPTED:
      label = "Geaccepteerd";
      color = "success";
      break;
    case AgreementStatus.REJECTED:
      label = "Afgewezen";
      color = "error";
      break;
    case AgreementStatus.CANCELLED:
      label = "Geannuleerd";
      color = "error";
      break;
    case AgreementStatus.CLOSED:
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
