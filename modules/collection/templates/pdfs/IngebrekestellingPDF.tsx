import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
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

  bold: {
    fontWeight: "bold",
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

  link: {
    color: "#1D4ED8",
    textDecoration: "underline",
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
  aanmaningDate: string;
  sommatieDate: string;
  totalAmount: string;
}

const IngebrekestellingPDF: React.FC<IngebrekestellingProps> = ({
  logoUrl,
  date,
  debtorName,
  debtorAddress,
  island,
  referenceNumber,
  tenantName,
  aanmaningDate,
  sommatieDate,
  totalAmount,
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
          <Text style={styles.paragraph}>Geachte heer/mevrouw,</Text>

          <Text style={styles.paragraph}>
            Hierbij vragen wij opnieuw uw aandacht voor uw openstaande
            betalingsverplichting.
          </Text>

          <Text style={styles.paragraph}>
            Op {aanmaningDate} hebben wij u aangemaand en op {sommatieDate}{" "}
            gesommeerd om uw openstaande betalingsverplichting te voldoen. Tot
            op heden hebben wij geen volledige betaling ontvangen en is geen
            betalingsregeling tot stand gekomen.
          </Text>

          <Text style={styles.paragraph}>
            Het totale openstaande bedrag bedraagt USD{" "}
            <Text style={styles.bold}>{formatAmount(totalAmount)}</Text>.
          </Text>

          <Text style={styles.paragraph}>
            U wordt hierbij officieel in gebreke gesteld.
          </Text>

          <Text style={styles.paragraph}>
            Als gevolg van het uitblijven van betaling of een
            betalingsregeling wordt een economische blokkade op uw naam
            geregistreerd binnen de CFSB-samenwerking.
          </Text>

          <Text style={styles.paragraph}>Hoogachtend,</Text>

          {/* SIGNATURE */}
          <View style={styles.signatureWrapper}>
            <View style={styles.signatureContainer}>
              <View style={styles.signatureLine} />

              <Text style={styles.signatureName}>{tenantName}</Text>
            </View>

            <Text style={styles.signatureRole}>
              Schuldeiser / CFSB deelnemer
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

export default IngebrekestellingPDF;
