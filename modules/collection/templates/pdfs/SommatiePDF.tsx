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
  debtorName: string;
  debtorAddress: string;
  island: string;
  reference_number: string;
  total_amount: string;
  amount_original: string;
  calculatedABB: string;
  tenantName: string;
  administrativeCosts: string;
  additionalCosts: string;
  additionalABB: string;
}

const SommatiePDF: React.FC<SommatiePDFProps> = ({
  logoUrl,
  date,
  aanmaningDate,
  debtorName,
  debtorAddress,
  island,
  reference_number,
  amount_original,
  calculatedABB,
  tenantName,
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

            <Text style={styles.title}>Sommatie</Text>
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
            Geachte heer/mevrouw,
          </Text>

          <Text style={styles.paragraph}>
            Hierbij vragen wij uw aandacht voor onderstaande openstaande
            verplichting.
          </Text>

          <Text style={styles.paragraph}>
            Op {aanmaningDate} hebben wij u reeds verzocht uw openstaande
            verplichting te voldoen. Binnen de gestelde termijn heeft geen
            volledige betaling plaatsgevonden en is geen betalingsregeling
            getroffen.
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
              <Text style={styles.tableValue}>
                {formatAmount(cfsbKosten)}
              </Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Wij verzoeken u de openstaande hoofdsom binnen 2 dagen na
            dagtekening van deze brief volledig te voldoen.
          </Text>

          <Text style={styles.paragraph}>
            Om volledige toegang tot uw CFSB-account te krijgen, dient u in te
            loggen op uw account en eerst de openstaande CFSB-kosten van USD{" "}
            {formatAmount(cfsbKosten)} volledig te betalen.
          </Text>

          <Text style={styles.paragraph}>
            Indien binnen deze termijn geen volledige betaling plaatsvindt of
            geen betalingsregeling wordt getroffen, wordt het dossier volgens
            de geldende CFSB-procedure verder opgevolgd. Bij het uitblijven
            van een oplossing kan een economische blokkade worden
            geactiveerd. Aanvullende kosten kunnen van toepassing zijn.
          </Text>

          <Text style={styles.paragraph}>Hoogachtend,</Text>

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
          Dit document is automatisch opgesteld en verzonden binnen de
          CFSB-samenwerking.
        </Text>
      </Page>
    </Document>
  );
};

export default SommatiePDF;
