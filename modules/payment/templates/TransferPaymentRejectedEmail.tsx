import { Html, Head, Body, Container, Text, Hr } from "@react-email/components";
import { formatAmount } from "@/shared/utils/formatters";

export interface TransferPaymentRejectedEmailProps {
  debtClaimReference: string;
  amount: number;
  reason?: string;
}

export function TransferPaymentRejectedEmail({
  debtClaimReference,
  amount,
  reason,
}: TransferPaymentRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#f6f9fc",
          padding: "20px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "8px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <Text
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#dc2626",
              marginBottom: "20px",
            }}
          >
            Uw betaling is afgewezen
          </Text>

          <Text
            style={{ fontSize: "16px", color: "#374151", lineHeight: "24px" }}
          >
            Uw betalingsbewijs voor vordering{" "}
            <strong>{debtClaimReference}</strong> van{" "}
            <strong>${formatAmount(amount)}</strong> is gecontroleerd en
            afgewezen. Er is geen betaling toegepast op uw schuld.
          </Text>

          {reason && (
            <Text
              style={{ fontSize: "15px", color: "#111827", marginTop: "16px" }}
            >
              <strong>Reden:</strong> {reason}
            </Text>
          )}

          <Text
            style={{ fontSize: "16px", color: "#374151", lineHeight: "24px" }}
          >
            Controleer het comprobante en probeer het opnieuw, of neem contact
            op met uw contactpersoon.
          </Text>

          <Hr />

          <Text
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            Dit bericht is automatisch gegenereerd door CFSB.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TransferPaymentRejectedEmail;
