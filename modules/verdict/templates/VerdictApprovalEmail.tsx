import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Text,
  Link,
} from "@react-email/components";

interface VerdictApprovalEmailProps {
  logoUrl: string;
  link: string;
}

export const VerdictApprovalEmail = ({
  logoUrl,
  link,
}: VerdictApprovalEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="120" height="50" alt="Plaid" style={logo} />
        <Text style={paragraph}>
          Er is een nieuwe opdracht voor u geregistreerd in het centrale systeem
          (CI). Log in op <Link href={link}>www.centraalinning.com</Link> om de
          details te bekijken.
        </Text>
        <Text style={footer}>
          Dit bericht is automatisch gegenereerd door het Centraal
          Incassoplatform (CI).
          <br />© CENTRAAL INNING
        </Text>
      </Container>
    </Body>
  </Html>
);

VerdictApprovalEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  link: "https://www.centraalinning.com",
} as VerdictApprovalEmailProps;

export default VerdictApprovalEmail;

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

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "30px",
  paddingTop: "15px",
  borderTop: "1px solid #e5e7eb",
  padding: "15px 40px 20px",
};
