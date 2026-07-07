import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Text,
} from "@react-email/components";
import { Link } from "@react-email/components";

interface RecoveryPasswordEmailProps {
  logoUrl: string;
  fullname: string;
  link: string;
}

export const RecoveryPasswordEmail = ({
  logoUrl,
  fullname,
  link,
}: RecoveryPasswordEmailProps) => (
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
          We hebben een verzoek ontvangen om uw wachtwoord opnieuw in te
          stellen. Klik op de onderstaande link om uw wachtwoord veilig opnieuw
          in te stellen. Deze link is 24 uur geldig.
        </Text>
        <br />
        <Text style={{ ...paragraph, textAlign: "center" as const }}>
          <Link href={link} style={buttonStyle}>
            Wachtwoord opnieuw instellen
          </Link>
        </Text>
        <br />
        <Text style={paragraph}>
          Als u dit verzoek niet hebt ingediend, kunt u deze e-mail negeren. Uw
          wachtwoord blijft ongewijzigd.
        </Text>

        <Text style={footer}>
          Dit bericht is automatisch gegenereerd.
          <br />© CENTRAAL INNING
        </Text>
      </Container>
    </Body>
  </Html>
);

RecoveryPasswordEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  fullname: "Alan",
  link: "https://www.centraalinning.com",
} as RecoveryPasswordEmailProps;

export default RecoveryPasswordEmail;

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

const buttonStyle = {
  display: "inline-block",
  padding: "10px 20px",
  backgroundColor: "#007bff",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "5px",
};
