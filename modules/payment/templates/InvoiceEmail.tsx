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
  invoiceNumber: string;
  serviceDescription: string;
  amount: string;
  status: string;
}

export const InvoiceEmail = ({
  logoUrl,
  fullname,
  invoiceNumber,
  serviceDescription,
  amount,
  status,
}: InvoiceEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="120" height="50" alt="CFSB" style={logo} />

        <Text style={paragraph}>
          <strong>Betalingsbevestiging</strong>
        </Text>

        <br />

        <Text style={paragraph}>Geachte heer/mevrouw,</Text>

        <br />

        <Text style={paragraph}>
          Hierbij bevestigen wij dat uw betaling in goede orde is ontvangen en
          verwerkt.
        </Text>

        <Text style={paragraph}>
          Factuurnummer: {invoiceNumber}
          <br />
          Dienst: {serviceDescription}
          <br />
          Betaald bedrag: {amount}
          <br />
          Status: {status}
        </Text>

        <br />

        <Text style={paragraph}>
          De betaalde factuur vindt u als bijlage bij deze e-mail.
        </Text>

        <br />

        <Text style={paragraph}>Hartelijk dank voor uw betaling.</Text>

        <Text style={footer}>
          Dit bericht is automatisch gegenereerd door CFSB.
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
  invoiceNumber: "INV-2026-029",
  serviceDescription: "AOP - Registratie",
  amount: "$ 200,80",
  status: "Betaald",
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
