import { Html, Head, Body, Container, Text, Hr } from "@react-email/components";
import { formatAmount } from "@/shared/utils/formatters";

export interface TransferPaymentReceiptEmailProps {
  debtClaimReference: string;
  amount: number;
  decidedByName: string;
}

export function TransferPaymentReceiptEmail({
  debtClaimReference,
  amount,
  decidedByName,
}: TransferPaymentReceiptEmailProps) {
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
              color: "#15803d",
              marginBottom: "20px",
            }}
          >
            Betaling bevestigd
          </Text>

          <Text
            style={{ fontSize: "16px", color: "#374151", lineHeight: "24px" }}
          >
            U heeft de betaling van <strong>${formatAmount(amount)}</strong> voor
            vordering <strong>{debtClaimReference}</strong> goedgekeurd
            ({decidedByName}). Het bedrag is toegepast op de vordering.
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

export default TransferPaymentReceiptEmail;
