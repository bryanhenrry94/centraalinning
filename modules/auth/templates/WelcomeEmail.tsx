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
  Row,
  Column,
} from "@react-email/components";

interface WelcomeEmailProps {
  logoUrl: string;
  fullname: string;
  appUrl: string;
  appName?: string;
}

const PRIMARY = "#0A3D91";
const ACCENT = "#FB902C";

const styles = {
  main: {
    backgroundColor: "#f1f5f9",
    fontFamily: "HelveticaNeue,Helvetica,Arial,sans-serif",
    padding: "40px 16px",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #eef0f3",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(15, 30, 70, .06)",
    maxWidth: "600px",
    padding: "40px 40px 32px",
  },
  logo: {
    margin: "0 auto 24px",
    display: "block",
  },
  header: {
    fontSize: "28px",
    fontWeight: "bold",
    color: PRIMARY,
    marginBottom: "28px",
    textAlign: "center" as const,
  },
  paragraph: {
    color: "#1e293b",
    fontSize: "15px",
    fontFamily: "HelveticaNeue,Helvetica,Arial,sans-serif",
    letterSpacing: "0",
    lineHeight: "24px",
    margin: "0 0 16px",
    textAlign: "left" as const,
  },
  highlight: {
    color: ACCENT,
    fontWeight: "600",
  },
  featureRow: {
    marginBottom: "12px",
  },
  featureIconCell: {
    width: "28px",
    verticalAlign: "top" as const,
    paddingTop: "1px",
  },
  featureIcon: {
    fontSize: "15px",
    lineHeight: "22px",
    color: ACCENT,
    fontWeight: "700",
  },
  featureText: {
    color: "#1e293b",
    fontSize: "15px",
    lineHeight: "22px",
    margin: "0",
    textAlign: "left" as const,
  },
  btnContainer: {
    textAlign: "center" as const,
    marginTop: "28px",
    marginBottom: "8px",
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "14px 40px",
  },
  footer: {
    color: "#94a3b8",
    fontSize: "12px",
    textAlign: "center" as const,
    marginTop: "28px",
    margin: "4px 0 0",
  },
};

const features = [
  "Financiële afspraken registreren",
  "Blok-Check uitvoeren",
  "Administratieve opvolging starten",
  "Collectieve opvolging starten",
  "Gerechtelijke opvolging overdragen",
];

export const WelcomeEmail = ({
  logoUrl,
  fullname,
  appUrl,
  appName = "CFSB",
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Body style={styles.main}>
      <Preview>Welkom bij {appName}</Preview>
      <Container style={styles.container}>
        <Img
          src={logoUrl}
          width="140"
          height="74"
          alt={appName}
          style={styles.logo}
        />

        <Text style={styles.header}>Welkom bij {appName}</Text>

        <Text style={styles.paragraph}>
          Beste <strong>{fullname}</strong>,
        </Text>

        <Text style={styles.paragraph}>
          Uw account bij{" "}
          <span style={styles.highlight}>{appName}</span> – Centrale
          Financiële Samenwerking en Bescherming is succesvol aangemaakt.
        </Text>

        <Text style={styles.paragraph}>
          Na activatie krijgt u toegang tot het {appName}-platform, waarmee u
          uw onderneming kunt beschermen door gebruik te maken van centrale
          registratie, controle en zekerheid in betalingen.
        </Text>

        <Text style={{ ...styles.paragraph, fontWeight: 700 }}>
          Met uw account kunt u:
        </Text>

        <Section>
          {features.map((feature) => (
            <Row key={feature} style={styles.featureRow}>
              <Column style={styles.featureIconCell}>
                <span style={styles.featureIcon}>✔</span>
              </Column>
              <Column>
                <Text style={styles.featureText}>{feature}</Text>
              </Column>
            </Row>
          ))}
        </Section>

        <Text style={{ ...styles.paragraph, marginTop: "20px" }}>
          Alle communicatie verloopt via het beveiligde {appName}-platform. U
          ontvangt automatisch kennisgevingen over belangrijke updates van uw
          account en dossiers.
        </Text>

        <Text style={{ ...styles.paragraph, fontWeight: 700 }}>
          Volgende stap
        </Text>

        <Text style={styles.paragraph}>
          Activeer uw account om gebruik te maken van alle {appName}-diensten.
        </Text>

        <Section style={styles.btnContainer}>
          <Button style={styles.button} href={appUrl}>
            Account activeren
          </Button>
        </Section>

        <Text style={styles.footer}>
          Dit is een automatisch bericht. Reageer niet op deze e-mail.
        </Text>
        <Text style={styles.footer}>
          © {new Date().getFullYear()} {appName}. Alle rechten voorbehouden.
        </Text>
      </Container>
    </Body>
  </Html>
);

WelcomeEmail.PreviewProps = {
  logoUrl: "/static/logo-cfsb.png",
  fullname: "Alan",
  appUrl: "https://www.centraalinning.com",
  appName: "CFSB",
} as WelcomeEmailProps;

export default WelcomeEmail;
