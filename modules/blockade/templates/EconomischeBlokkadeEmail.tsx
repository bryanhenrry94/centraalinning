import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface EconomischeBlokkadeEmailProps {
  logoUrl: string;
  fullname: string;
  creditorName: string;
  portalUrl?: string;
}

export default function EconomischeBlokkadeEmail({
  logoUrl,
  fullname,
  creditorName,
  portalUrl = "https://www.cfsb.nl",
}: EconomischeBlokkadeEmailProps) {
  return (
    <Html>
      <Head />

      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={logoUrl}
              width="100"
              height="50"
              alt="Plaid"
              style={logo}
            />
          </Section>

          <Section>
            <Text style={paragraph}>
              Geachte <strong>{fullname}</strong>,
            </Text>

            <Text style={paragraph}>
              Er is een economische blokkade op uw naam geregistreerd bij{" "}
              <strong>CFSB</strong>.
            </Text>

            <Text style={paragraph}>
              Deze registratie houdt verband met een openstaande
              betalingsverplichting.
            </Text>

            <Text style={paragraph}>
              Voor meer informatie of het treffen van een betalingsregeling kunt u inloggen via {" "}
              <Link href={portalUrl} style={link}>
                www.cfsbgroup.com
              </Link>
            </Text>
          </Section>

          <Hr style={divider} />

          <Section>
            <Text style={footer}>
              Dit is een automatisch gegenereerd bericht van CFSB. Reageren op
              deze e-mail is niet mogelijk.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

EconomischeBlokkadeEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  fullname: "Alan Turing",
  creditorName: "CFSB",
} satisfies EconomischeBlokkadeEmailProps;

const main = {
  backgroundColor: "#f5f7fa",
  padding: "40px 20px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  maxWidth: "650px",
  margin: "0 auto",
  overflow: "hidden",
};

const header = {
  textAlign: "center" as const,
  padding: "30px 40px 10px",
};

const logo = {
  marginTop: "20px",
  marginBottom: "20px",
};

const paragraph = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  padding: "0 40px",
  margin: "0 0 16px",
  textAlign: "justify" as const,
};

const link = {
  color: "#f97316",
  textDecoration: "none",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 40px",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  textAlign: "center" as const,
  padding: "0 40px 30px",
  lineHeight: "18px",
};
