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
  // Registratie
  farNumber: string;
  registeredAt: string;
  tenantName: string;
  // Opdrachtgever (cliënt die de FAR registreert)
  clientName: string;
  clientKvk: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  // Wederpartij (debiteur)
  debtorTypeLabel: string;
  debtorName: string;
  debtorIdentification: string;
  debtorAddress: string;
  debtorPhone: string;
  debtorEmail: string;
  // Afspraakgegevens
  agreementDescription: string;
  agreementReference: string;
  agreementInvoiceDate: string;
  agreementDueDate: string;
  agreementAmount: string;
  documentsCount: number;
  // Registratiekosten
  feeExclAbb: string;
  abbLabel: string;
  totalPaid: string;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <Text style={resultRow}>
      <strong>{label}:</strong> {value || "-"}
    </Text>
  );
}

export default function FarRegisteredEmail({
  logoUrl,
  farNumber,
  registeredAt,
  tenantName,
  clientName,
  clientKvk,
  clientAddress,
  clientPhone,
  clientEmail,
  debtorTypeLabel,
  debtorName,
  debtorIdentification,
  debtorAddress,
  debtorPhone,
  debtorEmail,
  agreementDescription,
  agreementReference,
  agreementInvoiceDate,
  agreementDueDate,
  agreementAmount,
  documentsCount,
  feeExclAbb,
  abbLabel,
  totalPaid,
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
            <Text style={sectionTitle}>Registratiegegevens</Text>
            <Section style={resultBox}>
              <ResultRow label="Registratienummer" value={farNumber} />
              <ResultRow label="Datum" value={registeredAt} />
              <ResultRow label="Organisatie" value={tenantName} />
            </Section>

            <Text style={sectionTitle}>Opdrachtgever</Text>
            <Section style={resultBox}>
              <ResultRow label="Naam" value={clientName} />
              <ResultRow label="KvK-nummer" value={clientKvk} />
              <ResultRow label="Adres" value={clientAddress} />
              <ResultRow label="Telefoonnummer" value={clientPhone} />
              <ResultRow label="E-mailadres" value={clientEmail} />
            </Section>

            <Text style={sectionTitle}>Wederpartij</Text>
            <Section style={resultBox}>
              <ResultRow label="Type partij" value={debtorTypeLabel} />
              <ResultRow label="Naam" value={debtorName} />
              <ResultRow label="Identificatie" value={debtorIdentification} />
              <ResultRow label="Vestigingsadres" value={debtorAddress} />
              <ResultRow label="Telefoonnummer" value={debtorPhone} />
              <ResultRow label="E-mailadres" value={debtorEmail} />
            </Section>

            <Text style={sectionTitle}>Afspraakgegevens</Text>
            <Section style={resultBox}>
              <ResultRow label="Omschrijving" value={agreementDescription} />
              <ResultRow label="Factuurnummer" value={agreementReference} />
              <ResultRow label="Factuurdatum" value={agreementInvoiceDate} />
              <ResultRow label="Vervaldatum" value={agreementDueDate} />
              <ResultRow label="Totaalbedrag" value={agreementAmount} />
              <ResultRow label="Documenten" value={`${documentsCount} bijgevoegd`} />
            </Section>

            <Text style={sectionTitle}>Registratiekosten</Text>
            <Section style={resultBox}>
              <ResultRow label="Bedrag (excl. ABB)" value={feeExclAbb} />
              <ResultRow label="ABB" value={abbLabel} />
              <ResultRow label="Totaal betaald" value={totalPaid} />
            </Section>

            <Text style={paragraph}>
              Dit overzicht bevat de volledige voorwaarden van de FAR-registratie
              zoals bevestigd bij het afronden van de betaling.
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

FarRegisteredEmail.PreviewProps = {
  logoUrl:
    "https://www.centraalinning.com/wp-content/uploads/2020/06/CI-Logo-Orange.png",
  farNumber: "FAR-2026-001",
  registeredAt: "17-09-2026",
  tenantName: "CFSB",
  clientName: "Dazzsoft S.A.S.",
  clientKvk: "987654321",
  clientAddress: "Kaya Industria 5, Bonaire",
  clientPhone: "+599 700 1111",
  clientEmail: "contact@dazzsoft.com",
  debtorTypeLabel: "Bedrijf",
  debtorName: "Jane Doe N.V.",
  debtorIdentification: "KvK-nummer — 123456789",
  debtorAddress: "Kaya Grandi 12, Bonaire",
  debtorPhone: "+599 700 0000",
  debtorEmail: "jane@example.com",
  agreementDescription: "Openstaande factuur voor geleverde diensten",
  agreementReference: "INV-2026-045",
  agreementInvoiceDate: "01-09-2026",
  agreementDueDate: "30-09-2026",
  agreementAmount: "$ 1.250,00",
  documentsCount: 2,
  feeExclAbb: "$ 35,00",
  abbLabel: "6% — $ 2,10",
  totalPaid: "$ 37,10",
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

const sectionTitle = {
  color: "#1a365d",
  fontSize: "13px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.4px",
  padding: "0 40px",
  margin: "0 0 8px",
};

const resultBox = {
  margin: "0 40px 20px",
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
