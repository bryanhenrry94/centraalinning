import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface FarRegisteredEmailProps {
  logoUrl: string;
  fullname: string;
  introText: string;
  farNumber: string;
  registeredAt: string;
  tenantName: string;
}

export default function FarRegisteredEmail({
  logoUrl,
  fullname,
  introText,
  farNumber,
  registeredAt,
  tenantName,
}: FarRegisteredEmailProps) {
  return (
    <Html>
      <Head />

      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img src={logoUrl} width="100" height="50" alt="CFSB" style={logo} />
          </Section>

          <Section>
            <Text style={paragraph}>
              Geachte <strong>{fullname}</strong>,
            </Text>

            <Text style={paragraph}>{introText}</Text>

            <Section style={resultBox}>
              <Text style={resultRow}>
                <strong>Registratienummer:</strong> {farNumber}
              </Text>
              <Text style={resultRow}>
                <strong>Datum:</strong> {registeredAt}
              </Text>
              <Text style={resultRow}>
                <strong>Organisatie:</strong> {tenantName}
              </Text>
            </Section>
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

FarRegisteredEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  fullname: "Alan Turing",
  introText:
    "Hierbij bevestigen wij de registratie van een financiële afspraak (FAR).",
  farNumber: "FAR-2026-001",
  registeredAt: "17-09-2026",
  tenantName: "CFSB",
} satisfies FarRegisteredEmailProps;

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

const resultBox = {
  margin: "0 40px 16px",
  padding: "16px 20px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
};

const resultRow = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 4px",
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
