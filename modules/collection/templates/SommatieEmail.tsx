import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Text,
} from "@react-email/components";
import { Link } from "@react-email/components";

interface SommatieEmailProps {
  logoUrl: string;
  fullname: string;
  tenantName: string;
}

export const SommatieEmail = ({
  logoUrl,
  fullname,
  tenantName,
}: SommatieEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="120" height="50" alt="Plaid" style={logo} />
        <Text style={paragraph}>
          Beste <strong>{fullname}</strong>,
        </Text>
        <br />
        <Text style={paragraph}>
          U heeft namens <strong>{tenantName}</strong> een sommatie ontvangen.
        </Text>

        <Text style={{ ...paragraph, marginTop: "10px" }}>
          Wij verzoeken u de brief te bekijken en, indien nodig, actie te
          ondernemen via uw CFSB-account.
        </Text>

        <Text style={{ ...paragraph, marginTop: "10px" }}>
          Log in via{" "}
          <Link href={"https://auth.sbxcentraalinning.com/login"}>
            Log hier in
          </Link>
          .
        </Text>

        <Text style={footer}>
          Dit bericht is automatisch gegenereerd binnen de CFSB-samenwerking.
        </Text>
      </Container>
    </Body>
  </Html>
);

SommatieEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  fullname: "Alan",
  tenantName: "Deelnemer B.V.",
} as SommatieEmailProps;

export default SommatieEmail;

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
