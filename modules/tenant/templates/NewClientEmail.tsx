import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Img,
} from "@react-email/components";

export interface NewClientEmailProps {
  logoUrl: string;
  clientName: string;
  registeredAt: string;
  totalClients: number;
}

const logo = {
  marginBottom: "20px",
  textAlign: "center" as const,
};

export default function NewClientEmail({
  logoUrl,
  clientName,
  registeredAt,
  totalClients,
}: NewClientEmailProps) {
  return (
    <Html>
      <Head />

      <Preview>Nuevo cliente registrado en CFSB</Preview>

      <Body
        style={{
          backgroundColor: "#f4f6f8",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "40px 36px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "30px",
              width: "100%",
              // border: "1px solid #e5e8eb",
            }}
          >
            <Img src={logoUrl} width="100" height="60" alt="Plaid" />
          </div>
          <Heading
            style={{
              fontSize: "24px",
              color: "#1a1a1a",
              margin: "0 0 20px 0",
              fontWeight: "600",
              textAlign: "left",
            }}
          >
            Nieuwe Klant 🎉
          </Heading>

          <Text
            style={{
              fontSize: "16px",
              color: "#444",
              marginBottom: "24px",
              textAlign: "justify",
            }}
          >
            Een nieuwe klant heeft zich geregistreerd op het platform en sluit
            zich aan bij onze samenwerking.
          </Text>

          <Text
            style={{
              margin: "0 0 6px 0",
              fontSize: "15px",
              color: "#1a1a1a",
            }}
          >
            <strong>Klant:</strong> {clientName}
          </Text>
          <Text style={{ margin: 0, fontSize: "15px", color: "#1a1a1a" }}>
            <strong>Geregistreerd op:</strong> {registeredAt}
          </Text>

          {/* <Section
            style={{
              backgroundColor: "#f7f9fc",
              padding: "20px 18px",
              borderRadius: "10px",
              border: "1px solid #e5e8eb",
              marginBottom: "32px",
            }}
          ></Section> */}

          <Text
            style={{ fontSize: "16px", color: "#444", marginBottom: "16px" }}
          >
            <strong>We zijn gegroeid naar {totalClients} klanten</strong>
          </Text>

          {/* <Text
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#0a66c2",
              textAlign: "center",
              margin: "0 0 36px 0",
            }}
          >
            {totalClients} klanten 🚀
          </Text> */}

          <Button
            href="https://centraal-inning.com/dashboard"
            style={{
              backgroundColor: "#0a66c2",
              color: "#ffffff",
              padding: "14px 22px",
              borderRadius: "10px",
              fontSize: "16px",
              textDecoration: "none",
              display: "block",
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            [Ga naar het dashboard]
          </Button>

          <Text
            style={{
              marginTop: "36px",
              fontSize: "13px",
              color: "#a0a0a0",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Dit is een automatisch bericht van CFSB. ©{" "}
            {new Date().getFullYear()} CFSB.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
