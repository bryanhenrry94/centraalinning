import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Text,
} from "@react-email/components";

interface AgreementApprovalEmailProps {
  logoUrl: string;
  fullname: string;
  invitationLink?: string;
}

export const AgreementApprovalEmail = ({
  logoUrl,
  fullname,
  invitationLink,
}: AgreementApprovalEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="120" height="50" alt="Plaid" style={logo} />
        <Text style={paragraph}>
          Beste <strong>{fullname}</strong>,
        </Text>
        <Text style={paragraph}>
          Uw betalingsovereenkomst is succesvol goedgekeurd. De details van uw
          goedgekeurde overeenkomst zijn beschikbaar op het Centraal Inning (CI)
          Platform. U kunt deze op elk moment raadplegen door in te loggen:{" "}
          {invitationLink && <Link href={invitationLink}>Centraal Inning</Link>}
        </Text>
        <Text style={paragraph}>
          Dank u voor uw medewerking. Heeft u vragen, neem dan contact met ons
          op.
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

export default AgreementApprovalEmail;

AgreementApprovalEmail.PreviewProps = {
  logoUrl: "/static/logo.png",
  fullname: "Customer Name",
} as AgreementApprovalEmailProps;

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
