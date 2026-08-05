import { Html, Head, Body, Container, Text, Hr } from "@react-email/components";

export interface TransferPaymentApprovedEmailProps {
  debtClaimReference: string;
  amount: number;
}

export function TransferPaymentApprovedEmail({
  debtClaimReference,
  amount,
}: TransferPaymentApprovedEmailProps) {
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
            Uw betaling is goedgekeurd
          </Text>

          <Text
            style={{ fontSize: "16px", color: "#374151", lineHeight: "24px" }}
          >
            Uw betalingsbewijs voor vordering{" "}
            <strong>{debtClaimReference}</strong> is gecontroleerd en
            goedgekeurd. Het bedrag van <strong>${amount.toFixed(2)}</strong>{" "}
            is toegepast op uw schuld.
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

export default TransferPaymentApprovedEmail;
