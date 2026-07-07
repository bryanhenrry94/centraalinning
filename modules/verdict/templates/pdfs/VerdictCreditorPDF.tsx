import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export interface VerdictCreditorPDFProps {
  logoUrl: string;
  invoice_number: string;
  creditor_name: string;
  debtorName: string;
  date: string;
  total_amount: string;
  reference_number?: string;
}

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
  subtitle: {
    fontSize: 11,
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

const VerdictCreditorPDF: React.FC<VerdictCreditorPDFProps> = ({
  logoUrl,
  invoice_number,
  creditor_name,
  debtorName,
  date,
  total_amount,
  reference_number,
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
            <Text style={styles.title}>FACTUUR {invoice_number}</Text>
            <Text>Datum: {date}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Geachte heer <Text style={styles.bold}>{creditor_name}</Text>,
          </Text>
          <Text style={styles.paragraph}>
            Hierbij ontvangt u de factuur voor de kosten voor de uitvoering van
            uw vonnis.{" "}
            <Text style={styles.bold}>
              ({reference_number}) {creditor_name} vs {debtorName}{" "}
            </Text>
            via het Centraal Incassoplatform (CI), factuurnummer CI{" "}
            {invoice_number}, ten bedrage van USD {total_amount}. Deze factuur
            zal rechtstreeks worden verrekend met het bedrag dat u te ontvangen
            heeft via de debiteur.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Dit bericht is automatisch gegenereerd door het Centraal
            Incassoplatform (CI).
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default VerdictCreditorPDF;
