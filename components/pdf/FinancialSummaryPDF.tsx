import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

export interface FinancialSummaryPDFProps {
  logoUrl: string;
  issueDate: string;
  validUntil: string;
  referenceNumber: string;

  // PERSONAL INFO
  idNumber: string;
  fullName: string;
  address: string;

  // FINANCIAL SUMMARY
  openObligations: string;
  totalOutstandingAmount: string;
  activePaymentPlans: string;
  overduePaymentPlans: string;

  // BLOCK STATUS
  economicBlockRegistered: string;

  // SUMMARY
  summary: string;

  // QR
  qrCode?: string;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    paddingTop: 55,
    paddingBottom: 70,
    paddingHorizontal: 90,
    color: "#111827",
    fontSize: 11,
  },

  // HEADER
  header: {
    marginBottom: 25,
  },

  headerTop: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },

  logo: {
    width: 50,
    height: 50,
    objectFit: "contain",
  },

  title: {
    fontSize: 14,
    fontWeight: "bold",
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#C4C4C4",
    marginTop: 10,
  },

  // SECTION
  section: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 5,
  },

  // TABLE
  table: {
    width: "100%",
  },

  row: {
    flexDirection: "row",
    marginBottom: 2,
  },

  label: {
    width: "45%",
    fontSize: 10,
  },

  value: {
    width: "55%",
    fontSize: 10,
  },

  labelHeader: {
    width: "25%",
    fontSize: 10,
  },

  valueHeader: {
    width: "75%",
    fontSize: 10,
  },

  // TEXT
  paragraph: {
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: "justify",
  },

  paragraphWithoutMargin: {
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: "justify",
  },

  validText: {
    marginTop: 15,
    fontSize: 10,
    lineHeight: 1.4,
    fontWeight: "bold",
  },

  // FOOTER
  // AGREGA ESTOS STYLES NUEVOS

  footer: {
    position: "absolute",
    bottom: 20,
    left: 65,
    right: 65,
  },

  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    paddingTop: 8,
    gap: 10,
  },

  footerText: {
    flex: 1,
    fontSize: 8,
    color: "#6B7280",
    lineHeight: 1.3,
    paddingRight: 10,
  },

  footerQrWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },

  footerQr: {
    width: 28, // ≈ 1cm
    height: 28,
  },

  footerQrText: {
    marginTop: 2,
    fontSize: 6,
    color: "#6B7280",
  },
});

const FinancialSummaryPDF: React.FC<FinancialSummaryPDFProps> = ({
  logoUrl,
  issueDate,
  validUntil,
  referenceNumber,

  idNumber,
  fullName,
  address,

  openObligations,
  totalOutstandingAmount,
  activePaymentPlans,
  overduePaymentPlans,

  economicBlockRegistered,

  summary,

  qrCode,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image style={styles.logo} src={logoUrl} />

            <Text style={styles.title}>Financiële Verklaring</Text>
          </View>

          <View style={styles.divider} />
        </View>
        {/* PERSONAL INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Persoonsgegevens</Text>

          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.labelHeader}>ID / Cedula</Text>

              <Text style={styles.valueHeader}>: {idNumber}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.labelHeader}>Naam</Text>

              <Text style={styles.valueHeader}>: {fullName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.labelHeader}>Adres</Text>

              <Text style={styles.valueHeader}>: {address}</Text>
            </View>

            <View style={[styles.row, { marginTop: 10 }]}>
              <Text style={styles.labelHeader}>Datum van afgifte</Text>

              <Text style={styles.valueHeader}>: {issueDate}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.labelHeader}>Referentienummer</Text>

              <Text style={styles.valueHeader}>: {referenceNumber}</Text>
            </View>
          </View>

          <Text style={styles.validText}>
            Deze financiële verklaring is geldig tot en met {validUntil}.
          </Text>

          <Text style={styles.paragraphWithoutMargin}>
            Vertrouwelijk - uitsluitend bestemd voor de aanvrager.
          </Text>

          <View style={[styles.divider, { marginBottom: 40 }]} />
        </View>
        {/* FINANCIAL SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financieel Overzicht</Text>

          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.label}>
                Aantal openstaande verplichtingen
              </Text>

              <Text style={styles.value}>: {openObligations}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Totaal openstaand bedrag</Text>

              <Text style={styles.value}>: {totalOutstandingAmount}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Actieve betalingsregelingen</Text>

              <Text style={styles.value}>: {activePaymentPlans}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>
                Achterstallige betalingsregelingen
              </Text>

              <Text style={styles.value}>: {overduePaymentPlans}</Text>
            </View>

            <View style={styles.divider} />
          </View>
        </View>
        {/* BLOCK STATUS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blokkadestatus</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Economische blokkade geregistreerd</Text>

            <Text style={styles.value}>: {economicBlockRegistered}</Text>
          </View>

          <View style={styles.divider} />
        </View>
        {/* SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Samenvatting</Text>

          <Text style={styles.paragraph}>{summary}</Text>
        </View>
        {/* DECLARATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verklaring</Text>

          <Text style={styles.paragraph}>
            Deze financiële verklaring toont een overzicht van de gegevens die
            op de datum van afgifte binnen de CFSB-samenwerking zijn
            geregistreerd. De informatie is bedoeld ter ondersteuning van uw
            beoordeling en bescherming.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerContent}>
            {qrCode && (
              <View style={styles.footerQrWrapper}>
                <Image src={qrCode} style={styles.footerQr} />

                <Text style={styles.footerQrText}>Verificatie</Text>
              </View>
            )}
            <Text style={styles.footerText}>
              Dit document is automatisch opgesteld en verzonden binnen de
              CFSB-samenwerking.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default FinancialSummaryPDF;
