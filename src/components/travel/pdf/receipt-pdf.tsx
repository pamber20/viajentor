/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { PdfAgencyInfo } from "./types";
import type { TravelPaymentDto } from "@/server/travel/trips";
import type { TravelQuoteDto } from "@/server/travel/quotes";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 15,
    marginBottom: 20,
  },
  logo: {
    height: 50,
    width: 120,
    objectFit: "contain",
  },
  agencyInfo: {
    alignItems: "flex-end",
    textAlign: "right",
  },
  agencyName: {
    fontSize: 12,
    fontWeight: "bold",
  },
  agencyNit: {
    fontSize: 8,
    marginTop: 2,
  },
  receiptTitleContainer: {
    alignItems: "center",
    marginVertical: 15,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  receiptSubtitle: {
    fontSize: 9,
    marginTop: 3,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 15,
    backgroundColor: "#f8fafc",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridCol: {
    width: "50%",
    marginBottom: 10,
  },
  label: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: "bold",
  },
  amountBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  notesBox: {
    marginTop: 10,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.4,
    fontStyle: "italic",
  },
  footer: {
    marginTop: 50,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 15,
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    textAlign: "center",
    lineHeight: 1.4,
  },
});

export interface ReceiptPDFProps {
  payment: TravelPaymentDto | {
    id: string;
    amount: number;
    date: string;
    method: string;
    receiptNumber?: string | null;
    reference?: string | null;
    notes?: string | null;
    installmentId?: string | null;
  };
  quote: TravelQuoteDto | {
    quoteNumber: string;
    bookingNumber?: string | null;
    clientName: string;
    destination: string;
    currency?: string;
    amortizationSchedule?: Array<{ id: string; code?: string }>;
  };
  agency: PdfAgencyInfo;
}

export function ReceiptPDF({ payment, quote, agency }: ReceiptPDFProps) {
  const pdfNavy = agency.theme?.pdfNavy || agency.theme?.primaryColor || "#0B3B60";
  const pdfAccent = agency.theme?.pdfAccent || agency.theme?.secondaryColor || "#eab308";
  const pdfBackground = agency.theme?.pdfBackground || "#ffffff";
  const pdfTextPrimary = agency.theme?.pdfTextPrimary || "#334155";
  const pdfTextSecondary = agency.theme?.pdfTextSecondary || "#64748b";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: quote.currency || "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      if (typeof dateStr === "string" && dateStr.includes("-") && dateStr.length === 10) {
        const d = new Date(dateStr + "T00:00:00");
        return isNaN(d.getTime())
          ? dateStr
          : d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const installment =
    payment.installmentId && quote.amortizationSchedule
      ? quote.amortizationSchedule.find((i) => i.id === payment.installmentId)
      : null;

  return (
    <Document>
      <Page size="LETTER" style={[styles.page, { backgroundColor: pdfBackground, color: pdfTextPrimary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: pdfAccent }]}>
          {agency.logoUrl && typeof agency.logoUrl === "string" && agency.logoUrl.trim().length > 0 ? (
            <Image src={agency.logoUrl} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "bold", color: pdfNavy }}>{agency.name}</Text>
          )}
          <View style={styles.agencyInfo}>
            <Text style={[styles.agencyName, { color: pdfNavy }]}>{agency.name}</Text>
            <Text style={[styles.agencyNit, { color: pdfTextSecondary }]}>
              NIT: {agency.nit} {agency.rnt ? `| RNT: ${agency.rnt}` : ""}
            </Text>
            <Text style={[styles.agencyNit, { marginTop: 1, color: pdfTextSecondary }]}>
              {agency.address} {agency.phone ? `| ${agency.phone.split(",")[0]}` : ""}
            </Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.receiptTitleContainer}>
          <Text style={[styles.receiptTitle, { color: pdfNavy }]}>Recibo de Caja</Text>
          <Text style={[styles.receiptSubtitle, { color: pdfTextSecondary }]}>
            Constancia oficial de abono o pago de servicios de viaje
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Cliente / Pagador</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{quote.clientName}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Fecha de Pago</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{formatDate(payment.date)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Servicio / Concepto</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>
                Abono a plan de viaje con destino {quote.destination}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Referencia Reserva</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>
                {quote.bookingNumber || quote.quoteNumber}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Método de Pago</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{payment.method}</Text>
            </View>
            {payment.receiptNumber && (
              <View style={styles.gridCol}>
                <Text style={styles.label}>N° de Recibo</Text>
                <Text style={[styles.value, { color: pdfTextPrimary }]}>{payment.receiptNumber}</Text>
              </View>
            )}
            {installment && (
              <View style={styles.gridCol}>
                <Text style={styles.label}>Cuota Asignada</Text>
                <Text style={[styles.value, { color: pdfTextPrimary }]}>{installment.code || "Asignada"}</Text>
              </View>
            )}
            {payment.reference && (
              <View style={styles.gridCol}>
                <Text style={styles.label}>Referencia de Pago</Text>
                <Text style={[styles.value, { color: pdfTextPrimary }]}>{payment.reference}</Text>
              </View>
            )}
          </View>

          {/* Amount Box */}
          <View style={[styles.amountBox, { borderColor: pdfNavy, backgroundColor: pdfBackground }]}>
            <Text style={[styles.amountLabel, { color: pdfTextSecondary }]}>Monto Recibido</Text>
            <Text style={[styles.amountValue, { color: pdfNavy }]}>{formatCurrency(payment.amount)}</Text>
          </View>

          {/* Notes */}
          {payment.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.label}>Observaciones / Notas</Text>
              <Text style={[styles.notesText, { color: pdfTextPrimary }]}>&ldquo;{payment.notes}&rdquo;</Text>
            </View>
          )}

          {/* Signatures */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
            <View
              style={{
                width: "45%",
                height: 60,
                borderWidth: 1,
                borderColor: pdfTextSecondary,
                flexDirection: "column",
              }}
            >
              <View
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: pdfTextSecondary,
                  paddingVertical: 4,
                  backgroundColor: "#f8fafc",
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: "bold", textAlign: "center", color: pdfTextPrimary }}>
                  ELABORADO POR:
                </Text>
              </View>
            </View>
            <View
              style={{
                width: "45%",
                height: 60,
                borderWidth: 1,
                borderColor: pdfTextSecondary,
                flexDirection: "column",
              }}
            >
              <View
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: pdfTextSecondary,
                  paddingVertical: 4,
                  backgroundColor: "#f8fafc",
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: "bold", textAlign: "center", color: pdfTextPrimary }}>
                  AUTORIZADO POR:
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: pdfTextSecondary }]}>
            Este recibo de caja es un soporte de pago interno y no reemplaza a la factura de venta correspondiente.
          </Text>
          <Text style={[styles.footerText, { marginTop: 4, fontWeight: "bold", color: pdfNavy }]}>
            ¡Gracias por confiar en {agency.name}!
          </Text>
        </View>
      </Page>
    </Document>
  );
}
