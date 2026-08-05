import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
} from "@react-email/components";

export interface PaymentLinkEmailProps {
  fullname: string;
  paymentLink: string;
  amount?: number;
  referenceNumber?: string;
}

export function PaymentLinkEmail({
  fullname,
  paymentLink,
  amount,
  referenceNumber,
}: PaymentLinkEmailProps) {
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
            Betalingsverzoek
          </Text>

          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "24px",
            }}
          >
            Beste <strong>{fullname}</strong>,
          </Text>

          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "24px",
            }}
          >
            Er is een nieuwe betaling voor u aangemaakt in ons systeem. Gebruik
            onderstaande knop om de betaling veilig af te ronden.
          </Text>

          {referenceNumber && (
            <Text
              style={{
                fontSize: "15px",
                color: "#111827",
                marginTop: "20px",
              }}
            >
              <strong>Referentie:</strong> {referenceNumber}
            </Text>
          )}

          {amount !== undefined && (
            <Text
              style={{
                fontSize: "15px",
                color: "#111827",
              }}
            >
              <strong>Bedrag:</strong> ${amount.toFixed(2)}
            </Text>
          )}

          <div
            style={{
              textAlign: "center",
              marginTop: "30px",
              marginBottom: "30px",
            }}
          >
            <Button
              href={paymentLink}
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
              Nu betalen
            </Button>
          </div>

          <Text
            style={{
              fontSize: "14px",
              color: "#6B7280",
              lineHeight: "22px",
            }}
          >
            Als de knop niet werkt, kunt u onderstaande link kopiëren en in uw
            browser openen:
          </Text>

          <Text
            style={{
              fontSize: "13px",
              color: "#2563EB",
              wordBreak: "break-all",
            }}
          >
            {paymentLink}
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

          <Text
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              textAlign: "center",
            }}
          >
            © Centrale Financiële Samenwerking & Bescherming
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentLinkEmail;