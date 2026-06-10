import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Section,
  Text,
} from "@react-email/components";

interface InvoiceEmailProps {
  logoUrl: string;
  fullname: string;
  paymentLink?: string;
}

export const InvoiceEmail = ({ logoUrl, fullname }: InvoiceEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img
          src={logoUrl}
          width="120"
          height="50"
          alt="Centraal Inning"
          style={logo}
        />

        <Text style={paragraph}>
          <strong>Betalingsbewijs</strong>
        </Text>

        <br />

        <Text style={paragraph}>
          Hierbij bevestigen wij dat wij uw betaling in goede orde hebben
          ontvangen en verwerkt.
        </Text>

        <br />

        <Text style={paragraph}>Hartelijk dank voor uw betaling.</Text>

        <Text style={footer}>
          Dit bericht is automatisch gegenereerd door het Centraal
          Incassoplatform (CI).
          <br />© Centrale Financiële Samenwerking & Bescherming
        </Text>
      </Container>
    </Body>
  </Html>
);

InvoiceEmail.PreviewProps = {
  logoUrl: "/static/logo.png",
  fullname: "Alan",
  paymentLink: "https://example.com/pay-invoice/12345",
} as InvoiceEmailProps;

export default InvoiceEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "HelveticaNeue,Helvetica,Arial,sans-serif",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  padding: "20px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #eee",
  borderRadius: "5px",
  boxShadow: "0 5px 10px rgba(20,50,70,.2)",
  maxWidth: "600px",
};

const logo = {
  padding: "0 40px",
  marginTop: "20px",
  marginBottom: "20px",
};

const paragraph = {
  color: "#444",
  fontSize: "15px",
  fontFamily: "HelveticaNeue,Helvetica,Arial,sans-serif",
  letterSpacing: "0",
  lineHeight: "23px",
  padding: "0 40px",
  margin: "0",
  textAlign: "justify" as const,
};

const btnContainer = {
  textAlign: "center" as const,
  padding: "20px 40px",
  marginTop: "20px",
};

const button = {
  backgroundColor: "#FB902C",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
  width: "200px",
  margin: "0 auto",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "30px",
  paddingTop: "15px",
  borderTop: "1px solid #e5e7eb",
  padding: "15px 40px 20px",
};
