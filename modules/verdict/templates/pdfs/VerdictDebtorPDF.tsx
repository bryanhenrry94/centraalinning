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
  table: {
    marginVertical: 20,
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
    borderTopWidth: 2,
    borderTopColor: "#161515",
    marginTop: 10,
  },
  signature: {
    fontSize: 11,
    marginTop: 20,
  },
  attention: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
  },
  listItem: {
    fontSize: 11,
    marginBottom: 8,
    paddingLeft: 10,
  },
  closing: {
    marginTop: 40,
    fontSize: 11,
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
  paragraphMarginTop: {
    marginTop: 20,
    marginBottom: 14,
  },
  bold: {
    fontWeight: "bold",
  },
  list: {
    marginLeft: 20,
  },
  bullet: {
    width: 10,
    marginRight: 5,
  },
  link: {
    color: "#333",
    textDecoration: "underline",
  },
  section: {
    marginBottom: 20,
  },
  bankInfo: {
    marginTop: 15,
    marginBottom: 15,
    fontSize: 11,
    lineHeight: 1.4,
  },
});

export interface VerdictDebtorPDFProps {
  logoUrl: string;
  debtorName: string;
  reference: string;
  sentence_date: string;
  sentence_amount: string;
  bankAccountNumber: string;
  date: string;
}

const VerdictDebtorPDF: React.FC<VerdictDebtorPDFProps> = ({
  logoUrl,
  debtorName,
  reference,
  sentence_date,
  sentence_amount,
  bankAccountNumber,
  date,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image style={styles.logo} src={logoUrl} />
          </View>
          <View style={styles.meta}>
            <Text style={styles.title}>Waarschuwing vóór loonbeslag</Text>
            <Text>Datum: {date}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Geachte heer <Text style={styles.bold}>{debtorName}</Text>,
          </Text>

          <Text style={styles.paragraph}>
            Er is bij CFSB een gerechtelijk vonnis
            tegen u geregistreerd (vonnisnummer {reference}, uitspraakdatum{" "}
            {sentence_date}). Dit vonnis is bevestigd door de deurwaarder Juan Perez van de
            schuldeiser en opgenomen voor centrale betaling via CFSB, waartoe
            u verplicht bent.
          </Text>

          <Text style={styles.paragraph}>
            Het totaal verschuldigde bedrag bedraagt USD{" "}
            {formatAmount(sentence_amount)}. U
            dient dit bedrag binnen 2 dagen te voldoen op: Bank MCB
            Rekeningnummer (derdengelden) {bankAccountNumber}.
          </Text>

          <Text style={styles.paragraph}>
            Indien u niet tijdig betaalt, zal de centrale uitvoering definitief
            plaatsvinden, waaronder beslaglegging op uw inkomen via de
            aangesloten organisaties, totdat het volledige bedrag is voldaan.
          </Text>

          <Text style={styles.paragraph}>
            Om het vonnis te bekijken kunt u zich registreren of inloggen via{" "}
            <Text style={styles.link}>CFSB</Text>.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Dit bericht is automatisch gegenereerd door CFSB.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default VerdictDebtorPDF;
