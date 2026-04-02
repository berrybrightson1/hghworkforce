"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f8fafc",
    padding: 5,
  },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    fontWeight: "bold",
    fontSize: 9,
  },
  tableCell: {
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
});

interface ReportData {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
}

export const ReportDocument = ({ data }: { data: ReportData }) => {
  const colWidth = `${100 / data.headers.length}%`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.subtitle}</Text>
        </View>

        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRow}>
            {data.headers.map((h, i) => (
              <View key={i} style={[styles.tableColHeader, { width: colWidth }]}>
                <Text style={styles.tableCellHeader}>{h}</Text>
              </View>
            ))}
          </View>
          {/* Body */}
          {data.rows.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              {row.map((cell, j) => (
                <View key={j} style={[styles.tableCol, { width: colWidth }]}>
                  <Text style={styles.tableCell}>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Generated on {new Date().toLocaleString()} &bull; HGH WorkForce
        </Text>
      </Page>
    </Document>
  );
};
