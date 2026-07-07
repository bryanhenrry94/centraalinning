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

export interface VerdictApprovalPDFProps {
  logoUrl: string;
  date: string;
  bailiffName: string;
  creditor_name: string;
  reference: string;
  sentence_date: string;
  sentence_amount: string;
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
});

const VerdictApprovalPDF: React.FC<VerdictApprovalPDFProps> = ({
  logoUrl,
  date,
  bailiffName,
  creditor_name,
  reference,
  sentence_date,
  sentence_amount,
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
            <Text style={styles.title}>Gerechtelijke Vonnis</Text>
            <Text style={styles.title}>
              Verzoek tot centrale tenuitvoerlegging
            </Text>
            <Text>Verzenddatum: {date}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Geachte heer <Text style={styles.bold}>{bailiffName}</Text>,
          </Text>

          <Text style={styles.paragraph}>
            De schuldeiser {creditor_name} heeft in het Centraal Incassoplatform
            (CI) een vonnis geregistreerd, betreffende vonnisnummer {reference},
            uitspraakdatum {sentence_date}, met een toegewezen vordering van USD{" "}
            {sentence_amount}.
          </Text>

          <Text style={styles.paragraph}>
            De schuldeiser is voor deze registratie aan het CI 15% van het
            vorderingsbedrag verschuldigd. Deze kosten gelden als proceskosten
            en kunnen worden verhaald op de debiteur. Het vonnis is aan dit
            bericht toegevoegd.
          </Text>

          <Text style={styles.paragraph}>
            Voor de uitvoering is de tussenkomst van een deurwaarder vereist. U
            wordt hierbij verzocht dit vonnis te controleren en de centrale
            tenuitvoerlegging via het CI te bevestigen. Door centrale uitvoering
            via het CI wordt het vonnis namens u als deurwaarder uitgevoerd,
            waarbij alle aangesloten bedrijven en organisaties verplicht zijn
            inhoudingen te verrichten ten gunste van de schuldeiser.
          </Text>

          <Text style={styles.paragraph}>
            Voordelen voor u als deurwaarder{"\n"}Als deelnemend deurwaarder:
          </Text>

          <View style={styles.list}>
            <View style={styles.listItem}>
              <Text>
                • krijgt u toegang tot extra opdrachten van verschillende
                schuldeisers;
              </Text>
            </View>
            <View style={styles.listItem}>
              <Text>
                • Hoeft u niet langer iedere debiteur afzonderlijk te benaderen;
              </Text>
            </View>
            <View style={styles.listItem}>
              <Text>
                • Betaalt u eenmalig registratiekosten, een vaste maandelijkse
                samenwerkingsfee en een vonnisbijdrage van 5% over uw factuur
                (betekening en beslaglegging).
              </Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            U kunt zich registreren of inloggen via{" "}
            <Link src="https://www.centraalinning.com" style={styles.link}>
              www.centraalinning.com
            </Link>{" "}
            om het vonnis te bekijken en de centrale tenuitvoerlegging te
            bevestigen.
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

export default VerdictApprovalPDF;
