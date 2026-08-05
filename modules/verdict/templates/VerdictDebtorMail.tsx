import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Text,
  Link,
} from "@react-email/components";

interface VerdictDebtorMailProps {
  logoUrl: string;
  link: string;
  datumVonnis: string;
  vonnisNummer: string;
}

export const VerdictDebtorMail = ({
  logoUrl,
  link,
  datumVonnis,
  vonnisNummer,
}: VerdictDebtorMailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="120" height="50" alt="Plaid" style={logo} />
        <Text style={paragraph}>Waarschuwing vóór loonbeslag</Text>
        <Text style={paragraph}>
          Er is een gerechtelijk vonnis tegen u geregistreerd (vonnisnummer{" "}
          {vonnisNummer}, uitspraakdatum {datumVonnis}). Dit vonnis is bevestigd
          door de gerechtsdeurwaarder voor centrale uitvoering. U wordt verzocht
          per direct actie te ondernemen om verdere maatregelen te voorkomen.
        </Text>
        <Text style={paragraph}>
          Om direct te betalen, klikt u op de onderstaande link of logt u in op{" "}
          <Link href={link}>CFSB</Link>
        </Text>
        <Text style={footer}>
          Dit bericht is automatisch gegenereerd door CFSB.
          <br />© CFSB
        </Text>
      </Container>
    </Body>
  </Html>
);

VerdictDebtorMail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  link: "https://www.centraalinning.com",
  datumVonnis: "01-01-2024",
  vonnisNummer: "1234567890",
} as VerdictDebtorMailProps;

export default VerdictDebtorMail;

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
  marginTop: "10px",
  marginBottom: "10px",
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
