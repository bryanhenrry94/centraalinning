import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Text,
  Section,
  Button,
} from "@react-email/components";

interface WelcomeEmailProps {
  logoUrl: string;
  fullname: string;
  appUrl: string;
}

const styles = {
  main: {
    backgroundColor: "#ffffff",
    fontFamily: "HelveticaNeue,Helvetica,Arial,sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: "20px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #eee",
    borderRadius: "5px",
    boxShadow: "0 5px 10px rgba(20,50,70,.2)",
    maxWidth: "600px",
  },
  logo: {
    margin: "0 auto 30px",
    display: "block",
    marginTop: "20px",
  },
  header: {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#333333",
    marginBottom: "20px",
    textAlign: "center" as const,
  },
  paragraph: {
    color: "#444",
    fontSize: "15px",
    fontFamily: "HelveticaNeue,Helvetica,Arial,sans-serif",
    letterSpacing: "0",
    lineHeight: "23px",
    padding: "0 40px",
    margin: "0",
    textAlign: "justify" as const,
  },
  highlight: {
    color: "#FB902C",
    fontWeight: "600",
  },
  btnContainer: {
    textAlign: "center" as const,
    padding: "20px 40px",
    marginTop: "20px",
  },
  button: {
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
  },
  footer: {
    color: "#8898aa",
    fontSize: "12px",
    textAlign: "center" as const,
    marginTop: "30px",
    paddingTop: "15px",
    borderTop: "1px solid #e5e7eb",
    padding: "15px 40px 20px",
  },
};

export const WelcomeEmail = ({
  logoUrl,
  fullname,
  appUrl,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Body style={styles.main}>
      <Preview>Welkom bij Centraal Inning</Preview>
      <Container style={styles.container}>
        <Img
          src={logoUrl}
          width="120"
          height="50"
          alt="Centraal Inning"
          style={styles.logo}
        />

        <Text style={styles.header}>Welkom bij Centraal Inning</Text>

        <Text style={styles.paragraph}>
          Beste <strong>{fullname}</strong>,
        </Text>

        <Text style={styles.paragraph}>
          Uw account bij <span style={styles.highlight}>Centraal Inning</span>{" "}
          is succesvol aangemaakt. U heeft nu toegang tot ons platform voor
          efficiënt incassomanagement.
        </Text>

        <Text style={styles.paragraph}>
          • <strong>Automatisch incassobeheer</strong>
          <br />• <strong>Veilige betalingen</strong>
          <br />• <strong>Realtime inzicht</strong>
        </Text>
        <Text style={styles.paragraph}>
          Alle communicatie verloopt via ons beveiligde platform. U ontvangt
          notificaties over belangrijke updates.
        </Text>
        <Section style={styles.btnContainer}>
          <Button style={styles.button} href={appUrl}>
            Ga naar de site
          </Button>
        </Section>

        <Text style={styles.footer}>
          Dit bericht is automatisch gegenereerd door het Centraal
          Incassoplatform (CI).
          <br />© CENTRAAL INNING
        </Text>
      </Container>
    </Body>
  </Html>
);

WelcomeEmail.PreviewProps = {
  logoUrl: "/static/logo.png",
  fullname: "Alan",
  appUrl: "https://www.centraalinning.com",
} as WelcomeEmailProps;

export default WelcomeEmail;
