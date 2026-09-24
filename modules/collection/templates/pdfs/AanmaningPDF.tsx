import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatAmount } from "@/shared/utils/formatters";

// Define styles
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 14,
    paddingLeft: 60,
    paddingTop: 50,
    paddingBottom: 60,
    paddingRight: 60,
    color: "#222",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 60,
  },
  meta: {
    textAlign: "right",
    fontSize: 11,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  billTo: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  client: {
    fontSize: 11,
    lineHeight: 1.4,
    maxWidth: 400,
  },
  content: {
    marginTop: 40,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.4,
    textAlign: "justify",
    marginBottom: 15,
  },
  table: {
    marginTop: 5,
    marginBottom: 20,
    width: "50%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 11,
    padding: 2,
    width: "70%",
  },
  tableCellRight: {
    fontSize: 11,
    padding: 2,
    textAlign: "right",
    width: "30%",
  },
  totalRow: {
    // borderTopWidth: 2,
    // borderTopColor: "#161515",
    marginTop: 10,
  },
  signature: {
    fontSize: 11,
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: "center",
    fontSize: 11,
    color: "#555",
  },
});

export interface AanmaningPDFProps {
  logoUrl: string;
  date: string;
  debtorName: string;
  debtorAddress: string;
  island: string;
  reference_number: string;
  total_amount: string;
  bankName: string;
  accountNumber: string;
  digitalFileCosts: string;
  amount_original: string;
  extraCosts: string;
  calculatedABB: string;
  tenantName: string;
}

const AanmaningPDF: React.FC<AanmaningPDFProps> = ({
  logoUrl,
  date,
  debtorName,
  debtorAddress,
  island,
  reference_number,
  bankName,
  accountNumber,
  digitalFileCosts,
  amount_original,
  extraCosts,
  calculatedABB,
  tenantName,
}) => {
  const aopCosts =
    Number(digitalFileCosts) + Number(extraCosts) + Number(calculatedABB);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image style={styles.logo} src={logoUrl} />
          </View>
          <View style={styles.meta}>
            <Text style={styles.title}>Aanmaning</Text>
            <Text style={{ fontSize: 11 }}>Datum: {date}</Text>
            <Text style={{ fontSize: 11 }}>
              Dossiernummer: {reference_number}
            </Text>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billTo}>
          <View style={styles.client}>
            <Text style={{ fontWeight: "bold" }}>Aan:</Text>
            <Text>{debtorName}</Text>
            <Text>{debtorAddress}</Text>
            <Text>{island}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>Geachte {debtorName},</Text>

          <Text style={styles.paragraph}>
            {tenantName} is aangesloten bij Centrale Financiële Samenwerking
            & Bescherming (CFSB). Vanaf heden worden alle communicatie en
            administratieve opvolging met betrekking tot deze
            betalingsachterstand centraal via CFSB verzorgd.
          </Text>

          {/* Table */}
          <Text style={{ fontSize: 12, fontWeight: "bold" }}>
            Specificatie
          </Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Hoofdsom</Text>
              <Text style={styles.tableCellRight}>
                ${formatAmount(amount_original)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>CFSB-kosten</Text>
              <Text style={styles.tableCellRight}>
                ${formatAmount(aopCosts)}
              </Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Wij verzoeken u de hoofdsom van USD{" "}
            {formatAmount(amount_original)} binnen 14 dagen na dagtekening
            volledig te voldoen.
          </Text>

          <Text style={styles.paragraph}>
            Via uw CFSB-account kunt u de betalingsverplichting bekijken,
            betalen en, indien beschikbaar, een betalingsregeling aanvragen.
            Openstaande CFSB-kosten dienen eerst volledig te worden voldaan om
            toegang te krijgen tot de betreffende CFSB-diensten.
          </Text>

          <Text style={styles.paragraph}>
            Bij betaling wordt het bedrag rechtstreeks overgemaakt naar de{" "}
            {bankName}-bankrekening van {tenantName}, {accountNumber}. De
            betaling wordt automatisch verwerkt en is gekoppeld aan dossier{" "}
            {reference_number}.
          </Text>

          <Text style={styles.paragraph}>
            Bij niet-tijdige betaling wordt het dossier automatisch volgens de
            geldende CFSB-procedure verder opgevolgd. Aanvullende
            administratieve kosten kunnen van toepassing zijn.
          </Text>

          <Text style={styles.paragraph}>Met vriendelijke groet,</Text>

          <View style={styles.signature}>
            <Text style={{ fontSize: 11 }}>{tenantName}</Text>
            <Text style={{ fontSize: 11 }}>Schuldeiser / CFSB-deelnemer</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Dit document is automatisch opgesteld en verzonden via het
          CFSB-platform.
        </Text>
      </Page>
    </Document>
  );
};

export default AanmaningPDF;
