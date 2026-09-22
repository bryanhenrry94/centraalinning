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
  portalUrl = "https://auth.sbxcentraalinning.com/login",
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
              Beste <strong>{fullname}</strong>,
            </Text>

            <Text style={paragraph}>
              U heeft namens <strong>{creditorName}</strong> een economische
              blokkade ontvangen.
            </Text>

            <Text style={paragraph}>
              Wij verzoeken u de brief te bekijken en, indien nodig, actie te
              ondernemen via uw CFSB-account.
            </Text>

            <Text style={paragraph}>
              Log in via{" "}
              <Link href={portalUrl} style={link}>
                Log hier in
              </Link>
              .
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
