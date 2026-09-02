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

export interface BlokkadePDFProps {
  logoUrl: string;
  date: string;
  referenceNumber: string;
  debtorName: string;
  debtorAddress: string;
  island: string;
  tenantName: string;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    paddingTop: 55,
    paddingBottom: 55,
    paddingHorizontal: 75,
    color: "#111827",
    fontSize: 11,
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
    // marginBottom: 10,
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
    borderBottomColor: "#7C7C7C",
  },

  metaBlock: {
    marginTop: 20,
  },

  // CLIENT
  clientSection: {
    marginTop: 12,
    marginBottom: 45,
  },

  clientText: {
    fontSize: 11,
    lineHeight: 1.3,
  },

  clientBold: {
    fontSize: 11,
    fontWeight: "bold",
    lineHeight: 1,
  },

  // CONTENT
  content: {
    width: "100%",
  },

  paragraph: {
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 1,
    textAlign: "justify",
  },

  strongText: {
    fontWeight: "bold",
  },

  attention: {
    marginTop: 10,
    marginBottom: 18,
    fontSize: 11,
    fontWeight: "bold",
  },

  listItem: {
    paddingLeft: 10,
    fontSize: 11,
    lineHeight: 1,
    textAlign: "justify",
  },

  // TABLE
  tableWrapper: {
    marginTop: 10,
    marginBottom: 30,
    width: "60%",
  },

  tableTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
  },

  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  tableLabel: {
    width: "70%",
    fontSize: 11,
  },

  tableValue: {
    width: "30%",
    fontSize: 11,
    textAlign: "right",
  },

  separator: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    marginTop: 6,
    marginBottom: 6,
  },

  totalRow: {
    marginTop: 8,
  },

  totalLabel: {
    width: "70%",
    fontSize: 11,
    fontWeight: "bold",
  },

  totalValue: {
    width: "30%",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "right",
  },

  // SIGNATURE
  signatureWrapper: {
    marginTop: 5,
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
    marginTop: -5
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

const BlokkadePDF: React.FC<BlokkadePDFProps> = ({
  logoUrl,
  date,
  referenceNumber,
  debtorName,
  debtorAddress,
  island,
  tenantName,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image style={styles.logo} src={logoUrl} />

            <Text style={styles.title}>Blokkade</Text>
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
            Er is een economische blokkade op uw naam geregistreerd binnen de
            CFSB-samenwerking.
          </Text>

          <Text style={styles.paragraph}>
            Deze blokkade is het gevolg van het niet nakomen van uw
            betalingsverplichting.
          </Text>

          <Text style={styles.paragraph}>
            U kunt deze blokkade laten opheffen door:
          </Text>

          <Text style={[styles.listItem]}>
            • het openstaande bedrag volledig te voldoen; of
          </Text>

          <Text style={styles.listItem}>
            • een betalingsregeling te treffen en deze correct na te komen.
          </Text>

          <Text style={[styles.paragraph, { marginTop: 10 }]}>
            Om te betalen, een betalingsregeling te treffen of een Financiële
            Verklaring aan te vragen, kunt u gebruikmaken van de aan u
            verstrekte betaallink of inloggen via{" "}
            <Link src="https://www.cfsbgroup.com" style={styles.link}>
              www.cfsbgroup.com
            </Link>{" "}
          </Text>

          <Text style={[styles.paragraph, { marginTop: 20 }]}>
            Hoogachtend,
          </Text>

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

export default BlokkadePDF;
