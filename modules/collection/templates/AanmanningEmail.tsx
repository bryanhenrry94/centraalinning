import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Text,
} from "@react-email/components";

interface AanmanningEmailProps {
  logoUrl: string;
  fullname: string;
  invitationLink?: string;
  requiresRegistration?: boolean;
}

export const AanmanningEmail = ({
  logoUrl,
  fullname,
  invitationLink,
  requiresRegistration,
}: AanmanningEmailProps) => (
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
          Er is een aanmaning op uw naam geregistreerd binnen de
          CFSB-samenwerking.
        </Text>

        <Text style={{ ...paragraph, marginTop: "10px" }}>
          {requiresRegistration ? (
            <>
              Maak eerst uw account aan om de gegevens te bekijken, een
              betaling uit te voeren of een betalingsregeling voor te stellen:{" "}
              <Link href={invitationLink}>Registreer u hier</Link>.
            </>
          ) : (
            <>
              U kunt de gegevens bekijken, een betaling uitvoeren of een
              betalingsregeling voorstellen door in te loggen:{" "}
              <Link href={invitationLink}>Log hier in</Link>.
            </>
          )}
        </Text>

        <Text style={footer}>
          Dit bericht is automatisch gegenereerd binnen de CFSB-samenwerking.
        </Text>
      </Container>
    </Body>
  </Html>
);

AanmanningEmail.PreviewProps = {
  logoUrl: "/static/logo.png",
  fullname: "Customer Name",
} as AanmanningEmailProps;

export default AanmanningEmail;

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
