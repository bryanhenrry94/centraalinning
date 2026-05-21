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

  tableSymbolWithUnderline: {
    width: "12%",
    fontSize: 10,
    lineHeight: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },

  tableValue: {
    width: "16%",
    fontSize: 10,
    textAlign: "right",
    lineHeight: 1,
  },

  tableValueWithUnderline: {
    width: "16%",
    fontSize: 10,
    textAlign: "right",
    lineHeight: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },

  totalLabel: {
    width: "72%",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 5,
    paddingTop: 5,
    lineHeight: 1,
  },

  totalSymbol: {
    width: "12%",
    fontWeight: "bold",
    fontSize: 10,
    marginTop: 5,
    paddingTop: 5,
    lineHeight: 1,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },

  totalValue: {
    width: "16%",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 5,
    paddingTop: 5,
    lineHeight: 1,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },

  separator: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    marginTop: 6,
    marginBottom: 6,
  },

  totalRow: {
    marginTop: 5,
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

export interface SommatiePDFProps {
  logoUrl: string;
  date: string;
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
  debtorName,
  debtorAddress,
  island,
  reference_number,
  total_amount,
  amount_original,
  calculatedABB,
  tenantName,
  administrativeCosts,
  additionalCosts,
  additionalABB,
}) => {
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
            Op 10 mei 2026 hebben wij u reeds verzocht om uw openstaande
            verplichting te voldoen.
          </Text>

          {/* TABLE */}
          <View style={styles.tableWrapper}>
            <View style={styles.tableRow}>
              <Text style={styles.tableTitle}>Specificatie</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Hoofdsom</Text>
              <Text style={styles.tableSymbol}>USD</Text>
              <Text style={styles.tableValue}>{amount_original}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>
                Administratieve opvolgingskosten
              </Text>
              <Text style={styles.tableSymbol}>USD</Text>
              <Text style={styles.tableValue}>{administrativeCosts}</Text>
            </View>

            <View style={[styles.tableRow, { marginBottom: 5 }]}>
              <Text style={[styles.tableLabel, { paddingBottom: 5 }]}>
                ABB 6%
              </Text>
              <Text
                style={[styles.tableSymbolWithUnderline, { paddingBottom: 5 }]}
              >
                USD
              </Text>
              <Text
                style={[styles.tableValueWithUnderline, { paddingBottom: 5 }]}
              >
                {calculatedABB}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>
                Aanvullende opvolgingskosten
              </Text>
              <Text style={styles.tableSymbol}>USD</Text>
              <Text style={styles.tableValue}>{additionalCosts}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>ABB 6%</Text>
              <Text style={styles.tableSymbol}>USD</Text>
              <Text style={styles.tableValue}>{additionalABB}</Text>
            </View>

            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Totaal te voldoen</Text>
              <Text style={styles.totalSymbol}>USD</Text>
              <Text style={styles.totalValue}>{total_amount}</Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Wij verzoeken u het totale openstaande bedrag binnen 2 dagen na
            dagtekening van deze brief te voldoen.
          </Text>

          <Text style={styles.paragraph}>
            Om te betalen of een betalingsregeling te treffen, kunt u gebruik
            maken van de aan u verstrekte betaallink of inloggen via{" "}
            <Link src="https://www.cfsbgroup.com" style={styles.link}>
              www.cfsbgroup.com
            </Link>
          </Text>

          <Text style={styles.paragraph}>
            {"Indien betaling uitblijft, wordt uw openstaande verplichting verhoogd met USD\u00A0250,00 " +
              "aan administratieve opvolgingskosten, exclusief 6% ABB. De opvolging wordt vervolgens " +
              "automatisch voortgezet volgens de vastgestelde stappen binnen de CFSB-samenwerking, " +
              "waaronder een ingebrekestelling."}
          </Text>

          <Text style={styles.paragraph}>Met vriendelijke groet,</Text>

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
          {"\n"}
          Beheer en administratie: CIO
        </Text>
      </Page>
    </Document>
  );
};

export default SommatiePDF;
