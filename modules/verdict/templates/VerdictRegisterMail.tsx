import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Text,
} from "@react-email/components";

interface VerdictRegisterEmailProps {
  logoUrl: string;
  verdictReference: string;
  verdictDate: string;
}

export const VerdictRegisterEmail = ({
  logoUrl,
  verdictReference,
  verdictDate,
}: VerdictRegisterEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="120" height="50" alt="Plaid" style={logo} />
        <Text style={paragraph}>Bedankt voor uw registratie.</Text>
        <Text style={paragraph}>
          Hierbij ontvangt u de bevestiging van de registratie van uw vonnis (
          {verdictReference} - Datum uitspraak-verdicto {verdictDate}).
        </Text>
        <Text style={paragraph}>
          Na controle en bevestiging door de deurwaarder ontvangt u van ons een
          factuur voor de uitvoering hiervan.
        </Text>
        <Text style={paragraph}>
          Met vriendelijke groet, CFSB
        </Text>
        <Text style={footer}>
          Dit bericht is automatisch gegenereerd door CFSB.
          <br />© CFSB
        </Text>
      </Container>
    </Body>
  </Html>
);

VerdictRegisterEmail.PreviewProps = {
  logoUrl: "/static/logo.png",
  verdictReference: "1234567890",
  verdictDate: "01-01-2024",
} as VerdictRegisterEmailProps;

export default VerdictRegisterEmail;

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
  marginTop: "10px",
  marginBottom: "10px",
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
