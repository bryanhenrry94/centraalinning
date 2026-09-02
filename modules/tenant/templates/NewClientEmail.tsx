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
  tenantCode: string;
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
  tenantCode,
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
            Nieuwe deelnemer 🎉
          </Heading>

          <Text
            style={{
              fontSize: "16px",
              color: "#444",
              marginBottom: "24px",
              textAlign: "justify",
            }}
          >
            Een nieuwe deelnemer heeft zich geregistreerd en is aangesloten
            bij de CFSB-samenwerking.
          </Text>

          <Text
            style={{
              margin: "0 0 6px 0",
              fontSize: "15px",
              color: "#1a1a1a",
            }}
          >
            <strong>Deelnemer:</strong> {clientName}
          </Text>
          <Text
            style={{
              margin: "0 0 6px 0",
              fontSize: "15px",
              color: "#1a1a1a",
            }}
          >
            <strong>CFSBB-nummer:</strong> {tenantCode}
          </Text>
          <Text style={{ margin: 0, fontSize: "15px", color: "#1a1a1a" }}>
            <strong>Geregistreerd op:</strong> {registeredAt}
          </Text>

          <Text
            style={{ fontSize: "16px", color: "#444", marginBottom: "16px" }}
          >
            <strong>CFSB telt nu {totalClients} deelnemers.</strong>
          </Text>

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
