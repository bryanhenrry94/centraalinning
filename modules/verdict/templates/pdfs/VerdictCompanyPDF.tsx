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

// Define the interface for the component props
export interface VerdictCompanyPDFProps {
  logoUrl: string;
  sendDate: string;
  company_name: string;
  company_address: string;
  company_island: string;
  companyCity: string;
  debtorName: string;
  vonnisDate: string;
  vonnisAmount: string;
  collectionPercentage: string;
  calculatedCollection: string;
  abbPercentage: string;
  calculatedABB: string;
  daysLate: string;
  interestAmount: string;
  total_amount: string;
  accountNumber: string;
  agentName: string;
}

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
    marginBottom: 30,
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
    marginVertical: 10,
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 11,
    lineHeight: 1.4,
    textAlign: "justify",
    padding: 2,
    width: "30%",
  },
  tableCellRight: {
    fontSize: 11,
    lineHeight: 1.4,
    padding: 2,
    textAlign: "right",
    width: "20%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableCellThird: {
    fontSize: 11,
    lineHeight: 1.4,
    padding: 2,
    width: "30%",
  },
  tableCellDescription: {
    fontSize: 11,
    lineHeight: 1.4,
    padding: 2,
    width: "50%",
  },
  signature: {
    fontSize: 11,
    marginTop: 20,
  },
  attention: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
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
    marginBottom: 5,
  },
  bankInfo: {
    marginTop: 15,
    marginBottom: 15,
    fontSize: 11,
    lineHeight: 1.4,
  },
});

const VerdictCompanyPDF: React.FC<VerdictCompanyPDFProps> = ({
  logoUrl,
  sendDate,
  company_name,
  company_address,
  company_island,
  companyCity,
  debtorName,
  vonnisDate,
  vonnisAmount,
  collectionPercentage,
  calculatedCollection,
  abbPercentage,
  calculatedABB,
  daysLate,
  interestAmount,
  total_amount,
  accountNumber,
  agentName,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image style={styles.logo} src={logoUrl} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>LOONBESLAG</Text>
          <Text>Datum beslag: {sendDate}</Text>
        </View>
      </View>

      {/* Bill To Section */}
      <View style={styles.billTo}>
        <View style={styles.client}>
          <Text style={{ fontWeight: "bold" }}>Aan:</Text>
          <Text>{company_name}</Text>
          <Text>{company_address}</Text>
          <Text>{company_island}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.paragraph}>Geachte heer/mevrouw,</Text>
        <Text style={styles.paragraph}>
          Gerechtsdeurwaarder Wernery F.M. Sambo deelt u mede dat op het salaris
          van Bryan Navarrete werknemer binnen uw organisatie loonbeslag is
          gelegd. Conform de wettelijke bepalingen wordt u verzocht om één derde
          (1/3) van het nettosalaris maandelijks in te houden en over te maken
          naar onderstaande rekening, totdat het volledige bedrag is voldaan.
        </Text>

        <Text style={styles.paragraph}>
          De eerste inhouding dient uiterlijk per 30 november 2025 te worden
          verwerkt. Na volledige betaling ontvangt u een schriftelijke
          bevestiging van opheffing van het loonbeslag. Wij waarderen uw
          medewerking en vertrouwen op een correcte uitvoering binnen onze
          samenwerking. Voor vragen kunt u contact opnemen met de deurwaarder
          via{" "}
          <Text style={styles.link}>
            <Link href="www.centraalinning.com">CFSB</Link>
          </Text>
        </Text>
      </View>

      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: "#000",
          marginVertical: 5,
        }}
      />

      {/* Table Section */}
      <View style={styles.section}>
        <Text style={styles.attention}>GERECHTELIJKE UITSPRAAK:</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Hoofdsom</Text>
            <View style={styles.tableCellRight}>
              <Text>USD</Text>
              <Text>3.152,00</Text>
            </View>
            <Text style={styles.tableCellThird} />
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Rente</Text>
            <View style={styles.tableCellRight}>
              <Text>USD</Text>
              <Text>152,38</Text>
            </View>
            <Text style={styles.tableCellThird}>(1-1-2025 t/m 5-11-2025) </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Overige kosten</Text>
            <View style={styles.tableCellRight}>
              <Text>USD</Text>
              <Text>600,00</Text>
            </View>
            <Text style={styles.tableCellThird} />
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Totaal verschuldigd</Text>
            <View
              style={[
                styles.tableCellRight,
                { borderTopWidth: 2, borderTopColor: "#161515" },
              ]}
            >
              <Text>USD</Text>
              <Text>3.752,38</Text>
            </View>

            <Text style={styles.tableCellThird} />
          </View>
        </View>
      </View>
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: "#000",
          marginVertical: 5,
        }}
      />
      <View style={styles.section}>
        <Text style={styles.attention}>GERECHTELIJKE UITSPRAAK:</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Inhouding</Text>
            <Text style={styles.tableCellDescription}>
              : één derde (1/3) van het nettosalaris
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Eerste inhouding</Text>
            <Text style={styles.tableCellDescription}>
              : uiterlijk per 30 november 2025
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Bank</Text>
            <Text style={styles.tableCellDescription}>
              : MCB - Rekeningnummer 1234567890
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Ten name van</Text>
            <Text style={styles.tableCellDescription}>
              : CFSB
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Omschrijving</Text>
            <Text style={styles.tableCellDescription}>: Bryan Navarrete</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>
        Dit bericht is automatisch opgemaakt en daarom niet ondertekend.
      </Text>
    </Page>
  </Document>
);

export default VerdictCompanyPDF;
