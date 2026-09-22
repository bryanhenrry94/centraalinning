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
    paddingHorizontal: 80,
    color: "#111827",
    fontSize: 10,
    lineHeight: 1.45,
  },

  // HEADER
  header: {
    marginBottom: 15,
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
    marginTop: 18,
    marginBottom: 45,
  },

  clientText: {
    fontSize: 11,
    lineHeight: 1,
  },

  clientBold: {
    fontSize: 11,
    fontWeight: "bold",
    lineHeight: 1.35,
  },

  metaBlock: {
    marginTop: 18,
  },

  // CONTENT
  content: {
    width: "100%",
  },

  paragraph: {
    marginBottom: 12,
    fontSize: 10,
    lineHeight: 1,
    textAlign: "justify",
  },

  greeting: {
    marginBottom: 22,
  },

  attention: {
    marginTop: 10,
    marginBottom: 18,
    fontSize: 11,
    fontWeight: "bold",
  },

  listItem: {
    marginBottom: 10,
    paddingLeft: 10,
    fontSize: 11,
    lineHeight: 1.4,
    textAlign: "justify",
  },

  // TABLE
  tableWrapper: {
    marginTop: 10,
    marginBottom: 20,
    width: "60%",
  },

  tableTitle: {
    fontWeight: "bold",
    fontSize: 11,
    lineHeight: 1,
    marginBottom: 5,
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

export interface IngebrekestellingProps {
  logoUrl: string;
  date: string;
  debtorName: string;
  debtorAddress: string;
  island: string;
  referenceNumber: string;
  tenantName: string;
  bankName: string;
  accountNumber: string;
  amount_original: string;
  cfsbKosten: string;
}

const IngebrekestellingPDF: React.FC<IngebrekestellingProps> = ({
  logoUrl,
  date,
  debtorName,
  debtorAddress,
  island,
  referenceNumber,
  tenantName,
  bankName,
  accountNumber,
  amount_original,
  cfsbKosten,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image style={styles.logo} src={logoUrl} />

            <Text style={styles.title}>Ingebrekestelling</Text>
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
              Dossiernummer: {referenceNumber}
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>Geachte {debtorName},</Text>

          <Text style={styles.paragraph}>
            Ondanks onze eerdere aanmaning en sommatie is de openstaande
            betalingsverplichting tot op heden niet voldaan. U bent hiermee
            in gebreke.
          </Text>

          <Text style={styles.paragraph}>
            Wij stellen u hierbij formeel in gebreke en geven u een laatste
            termijn om aan uw betalingsverplichting te voldoen.
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
            Wij verzoeken u de openstaande hoofdsom van USD{" "}
            {formatAmount(amount_original)} binnen 2 dagen na dagtekening van
            deze brief volledig te voldoen.
          </Text>

          <Text style={styles.paragraph}>
            U kunt hiervoor inloggen op uw CFSB-account en daar de
            betalingsgegevens bekijken, de CFSB-kosten voldoen of, indien
            beschikbaar, een betalingsregeling aanvragen. De hoofdsom dient
            rechtstreeks te worden overgemaakt aan {tenantName} op{" "}
            {bankName}, bankrekening {accountNumber}.
          </Text>

          <Text style={styles.paragraph}>
            Indien u buiten CFSB betaalt, vermeld dan uw naam en
            dossiernummer {referenceNumber}. De CFSB-kosten van USD{" "}
            {formatAmount(cfsbKosten)} blijven afzonderlijk verschuldigd en
            dienen rechtstreeks aan CFSB te worden betaald.
          </Text>

          <Text style={styles.paragraph}>
            Indien binnen de gestelde termijn niet aan de
            betalingsverplichting wordt voldaan, zullen verdere maatregelen
            worden genomen. Dit kan onder meer leiden tot de registratie van
            een economische blokkade en/of overdracht van het dossier voor
            gerechtelijke opvolging. Alle aanvullende kosten die hieruit
            voortvloeien, komen voor uw rekening.
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
          Dit bericht is automatisch opgesteld en verzonden via CFSB.
        </Text>
      </Page>
    </Document>
  );
};

export default IngebrekestellingPDF;
