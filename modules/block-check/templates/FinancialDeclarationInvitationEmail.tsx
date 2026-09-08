import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface FinancialDeclarationInvitationEmailProps {
  logoUrl: string;
  personFullname: string;
  tenantName: string;
  financialReportUrl: string;
}

export default function FinancialDeclarationInvitationEmail({
  logoUrl,
  personFullname,
  tenantName,
  financialReportUrl,
}: FinancialDeclarationInvitationEmailProps) {
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
              Geachte <strong>{personFullname}</strong>,
            </Text>

            <Text style={paragraph}>
              {tenantName} nodigt u uit om een CFSB Financiële Verklaring in te dienen.
              Hiermee kunt u uw financiële situatie toelichten in verband met een
              geregistreerde economische blokkade.
            </Text>

            <Text style={paragraph}>
              De kosten van de Financiële Verklaring zijn voor uw eigen rekening en
              worden rechtstreeks via het CFSB-platform voldaan.
            </Text>

            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button style={button} href={financialReportUrl}>
                Financiële Verklaring indienen
              </Button>
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

FinancialDeclarationInvitationEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  personFullname: "Jane Doe",
  tenantName: "ABC Construction N.V.",
  financialReportUrl: "https://abc-construction.cio.test/financial-report",
} satisfies FinancialDeclarationInvitationEmailProps;

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

const button = {
  backgroundColor: "#1e293b",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "12px 24px",
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
