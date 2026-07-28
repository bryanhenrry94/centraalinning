import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
} from "@react-email/components";

export interface TransferPaymentVerificationEmailProps {
  debtorEmail: string;
  debtClaimReference: string;
  amount: number;
  referenceNumber: string;
  verificationLink: string;
}

export function TransferPaymentVerificationEmail({
  debtorEmail,
  debtClaimReference,
  amount,
  referenceNumber,
  verificationLink,
}: TransferPaymentVerificationEmailProps) {
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
              color: "#111827",
              marginBottom: "20px",
            }}
          >
            Nieuwe betalingsverificatie vereist
          </Text>

          <Text
            style={{ fontSize: "16px", color: "#374151", lineHeight: "24px" }}
          >
            Een debiteur ({debtorEmail}) heeft een betalingsbewijs geüpload
            voor vordering <strong>{debtClaimReference}</strong>. Controleer
            het bewijs en bevestig of wijs de betaling af.
          </Text>

          <Text style={{ fontSize: "15px", color: "#111827", marginTop: "20px" }}>
            <strong>Bedrag:</strong> ${amount.toFixed(2)}
          </Text>
          <Text style={{ fontSize: "15px", color: "#111827" }}>
            <strong>Referentienummer:</strong> {referenceNumber}
          </Text>

          <div
            style={{
              textAlign: "center",
              marginTop: "30px",
              marginBottom: "30px",
            }}
          >
            <Button
              href={verificationLink}
              style={{
                backgroundColor: "#FB902C",
                color: "#ffffff",
                padding: "14px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Betaling controleren
            </Button>
          </div>

          <Text
            style={{ fontSize: "14px", color: "#6B7280", lineHeight: "22px" }}
          >
            Als de knop niet werkt, kunt u onderstaande link kopiëren en in uw
            browser openen:
          </Text>

          <Text
            style={{ fontSize: "13px", color: "#2563EB", wordBreak: "break-all" }}
          >
            {verificationLink}
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
            Dit bericht is automatisch gegenereerd door het Centraal
            Incassoplatform (CI).
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TransferPaymentVerificationEmail;
