import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Register fonts if needed (using default ones for now)

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  companyDetails: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  payslipTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
    color: "#0f172a",
  },
  period: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "right",
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#f8fafc",
    padding: 5,
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderBottom: 1,
    borderBottomColor: "#f1f5f9",
  },
  label: {
    flex: 1,
  },
  value: {
    width: 100,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  employeeGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  employeeCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: "#f1f5f9",
    marginTop: 10,
  },
  totalLabel: {
    flex: 1,
    fontWeight: "bold",
  },
  totalValue: {
    width: 100,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 12,
  },
});

interface PayslipData {
  company: {
    name: string;
    address?: string;
    logoUrl?: string;
  };
  theme?: {
    primaryHex: string;
    accentHex: string;
    variant: string;
  };
  employee: {
    name: string;
    code: string;
    department: string;
    jobTitle: string;
    bankName?: string;
    bankAccount?: string;
  };
  period: {
    start: string;
    end: string;
  };
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  summary: {
    grossPay: number;
    totalDeductions: number;
    netPay: number;
  };
}

export const PayslipDocument = ({ data }: { data: PayslipData }) => {
  const primary = data.theme?.primaryHex ?? "#0f172a";
  const accent = data.theme?.accentHex ?? "#b45309";
  const striped = data.theme?.variant === "STRIPED";

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: accent }]}>
          <View>
            <Text style={[styles.companyName, { color: primary }]}>{data.company.name}</Text>
            {data.company.address && (
              <Text style={styles.companyDetails}>{data.company.address}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.payslipTitle, { color: accent }]}>PAYSLIP</Text>
            <Text style={styles.period}>
              {new Date(data.period.start).toLocaleDateString()} - {new Date(data.period.end).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Employee Info */}
        <View style={styles.employeeGrid}>
          <View style={styles.employeeCol}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>Employee Name</Text>
              <Text style={styles.infoValue}>{data.employee.name}</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Employee Code</Text>
              <Text style={styles.infoValue}>{data.employee.code}</Text>
            </View>
          </View>
          <View style={styles.employeeCol}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{data.employee.department}</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Job Title</Text>
              <Text style={styles.infoValue}>{data.employee.jobTitle}</Text>
            </View>
          </View>
          <View style={styles.employeeCol}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>Bank</Text>
              <Text style={styles.infoValue}>{data.employee.bankName || "N/A"}</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Account Number</Text>
              <Text style={styles.infoValue}>{data.employee.bankAccount || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { backgroundColor: striped ? "#f8fafc" : "#f8fafc", borderBottomColor: accent }]}>
            EARNINGS
          </Text>
          {data.earnings.map((item, i) => (
            <View key={i} style={[styles.row, striped && i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
              <Text style={styles.label}>{item.name}</Text>
              <Text style={styles.value}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Deductions */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { borderBottomColor: accent }]}>DEDUCTIONS</Text>
          {data.deductions.map((item, i) => (
            <View key={i} style={[styles.row, striped && i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
              <Text style={styles.label}>{item.name}</Text>
              <Text style={styles.value}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ marginTop: 30 }}>
          <View style={styles.row}>
            <Text style={styles.label}>Gross Earnings</Text>
            <Text style={styles.value}>{formatCurrency(data.summary.grossPay)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Deductions</Text>
            <Text style={styles.value}>{formatCurrency(data.summary.totalDeductions)}</Text>
          </View>
          <View style={[styles.totalRow, { backgroundColor: `${accent}15` }]}>
            <Text style={[styles.totalLabel, { color: primary }]}>NET PAY</Text>
            <Text style={[styles.totalValue, { color: primary }]}>GHS {formatCurrency(data.summary.netPay)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is a computer generated payslip and does not require a signature.</Text>
          <Text style={{ marginTop: 5 }}>&copy; {new Date().getFullYear()} {data.company.name}. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
};
