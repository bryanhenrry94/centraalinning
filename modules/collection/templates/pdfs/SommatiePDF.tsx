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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    paddingTop: 65,
    paddingBottom: 55,
    paddingHorizontal: 70,
    color: "#111827",
    fontSize: 10,
    lineHeight: 1.45,
  },

  // HEADER
  header: {
    marginBottom: 25,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F2B5B",
    marginBottom: 10,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#8A8A8A",
  },

  // CLIENT
  clientSection: {
    marginBottom: 45,
  },

  clientText: {
    fontSize: 11,
    lineHeight: 1,
  },

  clientBold: {
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 1,
  },

  metaBlock: {
    marginTop: 18,
  },

  // CONTENT
  content: {
    width: "100%",
  },

  paragraph: {
    marginBottom: 15,
    fontSize: 10,
    textAlign: "justify",
    lineHeight: 1,
  },

  greeting: {
    marginBottom: 12,
  },

  // TABLE
  tableWrapper: {
    marginTop: 10,
    marginBottom: 30,
    width: "60%",
  },

  tableTitle: {
    fontWeight: "bold",
    fontSize: 10,
    lineHeight: 1,
  },

  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 0,
    padding: 0,
    lineHeight: 1,
  },

  tableLabel: {
    width: "72%",
    fontSize: 10,
    lineHeight: 1,
  },

  tableSymbol: {
    width: "12%",
    fontSize: 10,
    lineHeight: 1,
  },

  tableValue: {
    width: "16%",
    fontSize: 10,
    textAlign: "right",
    lineHeight: 1,
  },

  // SIGNATURE
  signatureWrapper: {
    marginTop: 35,
  },

  signatureContainer: {
    alignSelf: "flex-start",
  },

  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    marginBottom: 5,
    // width: "100%",
  },

  signatureName: {
    fontSize: 10,
    fontWeight: "bold",
    paddingRight: 2,
  },

  signatureRole: {
    fontSize: 10,
  },

  // FOOTER
  footer: {
    position: "absolute",
    bottom: 28,
    left: 65,
    right: 65,
    textAlign: "center",
    fontSize: 9,
    color: "#4B5563",
    lineHeight: 1.3,
  },
});

export interface SommatiePDFProps {
  logoUrl: string;
  date: string;
  aanmaningDate: string;
  deadlineDate: string;
  debtorName: string;
  debtorAddress: string;
  island: string;
  reference_number: string;
  total_amount: string;
  amount_original: string;
  calculatedABB: string;
  tenantName: string;
  bankName: string;
  accountNumber: string;
  administrativeCosts: string;
  additionalCosts: string;
  additionalABB: string;
}

const SommatiePDF: React.FC<SommatiePDFProps> = ({
  logoUrl,
  date,
  aanmaningDate,
  deadlineDate,
  debtorName,
  debtorAddress,
  island,
  reference_number,
  amount_original,
  calculatedABB,
  tenantName,
  bankName,
  accountNumber,
  administrativeCosts,
  additionalCosts,
  additionalABB,
}) => {
  const cfsbKosten =
    Number(administrativeCosts) +
    Number(calculatedABB) +
    Number(additionalCosts) +
    Number(additionalABB);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image style={styles.logo} src={logoUrl} />

            <Text style={styles.title}>Sommatie tot ingebrekestelling</Text>
          </View>

          <View style={styles.divider} />
        </View>

        {/* CLIENT */}
        <View style={styles.clientSection}>
          <Text style={styles.clientText}>Aan:</Text>

          <Text style={styles.clientText}>{debtorName}</Text>

          <Text style={styles.clientText}>{debtorAddress}</Text>

          <Text style={styles.clientText}>{island}</Text>

          <View style={styles.metaBlock}>
            <Text style={styles.clientText}>Datum: {date}</Text>

            <Text style={styles.clientText}>
              Dossiernummer: {reference_number}
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={[styles.paragraph, styles.greeting]}>
            Geachte {debtorName},
          </Text>

          <Text style={styles.paragraph}>
            Ondanks de aanmaning van {aanmaningDate} heeft u niet binnen de
            gestelde termijn aan uw betalingsverplichting voldaan.
          </Text>

          {/* TABLE */}
          <View style={styles.tableWrapper}>
            <View style={styles.tableRow}>
              <Text style={styles.tableTitle}>Specificatie</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Hoofdsom</Text>
              <Text style={styles.tableSymbol}>USD</Text>
              <Text style={styles.tableValue}>
                {formatAmount(amount_original)}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>CFSB-kosten</Text>
              <Text style={styles.tableSymbol}>USD</Text>
              <Text style={styles.tableValue}>{formatAmount(cfsbKosten)}</Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Wij sommeren u de hoofdsom van USD {formatAmount(amount_original)}{" "}
            binnen 2 dagen na dagtekening, uiterlijk {deadlineDate}, volledig te
            voldoen.
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

          {/* SIGNATURE */}
          <View style={styles.signatureWrapper}>
            <View style={styles.signatureContainer}>
              <View style={styles.signatureLine} />

              <Text style={styles.signatureName}>{tenantName}</Text>
            </View>

            <Text style={styles.signatureRole}>
              Schuldeiser / CFSB-deelnemer
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Dit document is automatisch opgesteld en verzonden via het
          CFSB-platform.
        </Text>
      </Page>
    </Document>
  );
};

export default SommatiePDF;
