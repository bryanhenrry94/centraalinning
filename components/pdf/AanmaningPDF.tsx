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
    paddingTop: 75,
    paddingBottom: 55,
    paddingHorizontal: 95,
    color: "#111827",
    fontSize: 11,
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

  // CLIENT INFO
  clientSection: {
    marginBottom: 40,
  },

  clientText: {
    fontSize: 10,
    lineHeight: 1.35,
  },

  metaBlock: {
    marginTop: 20,
  },

  // CONTENT
  content: {
    marginTop: 5,
  },

  paragraph: {
    marginBottom: 15,
    fontSize: 10,
    textAlign: "justify",
    lineHeight: 1,
  },

  greeting: {
    marginBottom: 20,
  },

  // TABLE
  tableWrapper: {
    marginTop: 10,
    marginBottom: 20,
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

export interface AanmaningPDFProps {
  logoUrl: string;
  date: string;
  debtorName: string;
  debtorAddress: string;
  island: string;
  reference_number: string;
  total_amount: string;
  bankName: string;
  accountNumber: string;
  digitalFileCosts: string;
  amount_original: string;
  extraCosts: string;
  calculatedABB: string;
  tenantName: string;
}

const AanmaningPDF: React.FC<AanmaningPDFProps> = ({
  logoUrl,
  date,
  debtorName,
  debtorAddress,
  island,
  reference_number,
  total_amount,
  bankName,
  accountNumber,
  digitalFileCosts,
  amount_original,
  extraCosts,
  calculatedABB,
  tenantName,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image style={styles.logo} src={logoUrl} />

            <Text style={styles.title}>Aanmaning</Text>
          </View>

          <View style={styles.divider} />
        </View>

        {/* CLIENT INFO */}
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
            verplichting en verzoeken wij u deze tijdig te voldoen.
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
              <Text style={styles.tableValue}>
                {`${(Number(digitalFileCosts) + Number(extraCosts)).toFixed(2)}`}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>ABB 6%</Text>
              <Text style={styles.tableSymbol}>USD</Text>
              <Text style={styles.tableValue}>{calculatedABB}</Text>
            </View>

            <View style={[styles.tableRow]}>
              <Text style={styles.totalLabel}>Totaalbedrag te voldoen</Text>
              <Text style={styles.totalSymbol}>USD</Text>
              <Text style={styles.totalValue}>{total_amount}</Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            {
              "Wij verzoeken u het totale bedrag binnen 14 dagen na dagtekening van deze brief te voldoen."
            }
          </Text>

          <Text style={styles.paragraph}>
            Om te betalen of een betalingsregeling te treffen, kunt u gebruik
            maken van de betalingslink die aan u is verstrekt of inloggen via{" "}
            <Link src="https://www.centraalinning.com" style={styles.link}>
              www.centraalinning.com
            </Link>
          </Text>

          <Text style={[styles.paragraph]}>
            Betalingen dienen tijdig te worden voldaan om automatische
            verwerking binnen het systeem mogelijk te maken. Bij uitblijven van
            betaling wordt extra administratieve opvolging kosten automatisch in
            rekening gebracht een bedrag van USD 150,00 en voortgezet volgens de
            vastgestelde stappen.
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
          {
            "Dit document is automatisch opgesteld en verzonden binnen de CFSB-samenwerking. \nBeheer en administratie: CIO"
          }
        </Text>
      </Page>
    </Document>
  );
};

export default AanmaningPDF;
