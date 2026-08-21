import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

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
    marginTop: 30,
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
  listItem: {
    fontSize: 11,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  table: {
    marginVertical: 20,
    width: "55%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 11,
    padding: 2,
    width: "60%",
  },
  tableCellRight: {
    fontSize: 11,
    padding: 2,
    textAlign: "right",
    width: "40%",
  },
  signature: {
    fontSize: 11,
    marginTop: 20,
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

export interface EmployerMatchPDFProps {
  logoUrl: string;
  fullname: string;
  letterDate: string;
  debtClaimReference: string;
  creditorName: string;
  employerName: string;
  gracePeriodDays: number;
  outstandingAmount: string;
  deadlineDate: string;
}

const EmployerMatchPDF: React.FC<EmployerMatchPDFProps> = ({
  logoUrl,
  fullname,
  letterDate,
  debtClaimReference,
  creditorName,
  employerName,
  gracePeriodDays,
  outstandingAmount,
  deadlineDate,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image style={styles.logo} src={logoUrl} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>Collectieve Opvolging</Text>
          <Text style={{ fontSize: 11 }}>Datum: {letterDate}</Text>
          <Text style={{ fontSize: 11 }}>Dossiernummer: {debtClaimReference}</Text>
        </View>
      </View>

      {/* Bill To Section */}
      <View style={styles.billTo}>
        <View style={styles.client}>
          <Text style={{ fontWeight: "bold" }}>Aan:</Text>
          <Text>{fullname}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.paragraph}>Geachte {fullname},</Text>

        <Text style={styles.paragraph}>
          Uw openstaande financiële verplichting bij {creditorName} is
          opgenomen in de Collectieve Opvolging.
        </Text>

        <Text style={styles.paragraph}>
          Binnen de financiële samenwerking is bevestigd dat u in dienst bent
          bij {employerName}.
        </Text>

        <Text style={styles.paragraph}>
          U heeft vanaf de datum van deze brief nog {gracePeriodDays} dagen om
          uw openstaande financiële verplichting zelf op te lossen door:
        </Text>

        <Text style={styles.listItem}>
          • het volledige openstaande bedrag te betalen; of
        </Text>
        <Text style={styles.listItem}>• een betalingsregeling aan te vragen.</Text>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Openstaand bedrag</Text>
            <Text style={styles.tableCellRight}>{outstandingAmount}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Uiterste reactiedatum</Text>
            <Text style={styles.tableCellRight}>{deadlineDate}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          Indien binnen deze termijn geen volledige betaling of
          betalingsregeling tot stand komt, wordt {employerName} geïnformeerd
          over de openstaande financiële verplichting.
        </Text>

        <Text style={styles.paragraph}>
          Vanaf dat moment kunnen betaling en het aanvragen van een
          betalingsregeling binnen de Collectieve Opvolging alleen via uw
          werkgever plaatsvinden.
        </Text>

        <Text style={styles.paragraph}>Hoogachtend,</Text>

        <View style={styles.signature}>
          <Text style={{ fontSize: 11 }}>{creditorName}</Text>
          <Text style={{ fontSize: 11 }}>Schuldeiser / CFSB-deelnemer</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Deze brief is automatisch opgesteld binnen de CFSB-samenwerking.
      </Text>
    </Page>
  </Document>
);

export default EmployerMatchPDF;
