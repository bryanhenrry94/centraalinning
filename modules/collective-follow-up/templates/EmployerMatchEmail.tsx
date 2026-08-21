import { Body, Container, Head, Html, Img, Text } from "@react-email/components";

export interface EmployerMatchEmailProps {
  logoUrl: string;
  fullname: string;
  employerName: string;
}

export default function EmployerMatchEmail({
  logoUrl,
  fullname,
  employerName,
}: EmployerMatchEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Img src={logoUrl} width="120" height="50" alt="CFSB" style={logo} />

          <Text style={paragraph}>
            Geachte <strong>{fullname}</strong>,
          </Text>

          <Text style={paragraph}>
            Uw openstaande financiële verplichting is opgenomen in de
            Collectieve Opvolging en er is bevestigd dat u werkzaam bent bij{" "}
            <strong>{employerName}</strong>. De volledige details, het
            openstaande bedrag en de uiterste reactiedatum vindt u in de
            bijgevoegde brief.
          </Text>

          <Text style={footer}>
            Dit bericht is automatisch gegenereerd binnen de
            CFSB-samenwerking. Reageren op deze e-mail is niet mogelijk.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

EmployerMatchEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  fullname: "Juan Pérez",
  employerName: "Zenith Services B.V.",
} satisfies EmployerMatchEmailProps;

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
  margin: "0 0 16px",
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
