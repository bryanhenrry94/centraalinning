import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
} from "@react-email/components";

export function TestEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f6f9fc", padding: "20px" }}>
        <Container
          style={{
            backgroundColor: "#fff",
            padding: "24px",
            borderRadius: "8px",
          }}
        >
          <Text style={{ fontSize: "18px", fontWeight: "bold" }}>
            Hola {name} 👋
          </Text>
          <Text>
            Este es un correo de prueba enviado desde tu API de Next.js con
            Resend.
          </Text>
          <Button
            href="https://resend.com"
            style={{
              background: "#000",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "6px",
            }}
          >
            Visitar Resend
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
