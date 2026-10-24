/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Path,
  G,
} from "@react-pdf/renderer";
import type { PdfAgencyInfo } from "./types";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelPaymentDto } from "@/server/travel/trips";
import { calculateDetailedQuoteTotals } from "@/lib/travel/pricing";

const styles = StyleSheet.create({
  page: {
    paddingTop: 160,
    paddingHorizontal: 30,
    paddingBottom: 125,
    fontFamily: "Helvetica",
    fontSize: 10,
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "35%",
    left: "10%",
    width: "80%",
    textAlign: "center",
    opacity: 0.04,
    transform: "rotate(-45deg)",
    fontSize: 50,
    fontWeight: "bold",
    zIndex: 0,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 612,
    height: 135,
    zIndex: 10,
  },
  logoInHeader: {
    position: "absolute",
    top: 86,
    left: 0,
    width: 612,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  logoHeader: {
    height: 48,
    width: 190,
    objectFit: "contain",
  },
  sloganInArc: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#ffffff",
    fontSize: 8.5,
    fontFamily: "Helvetica",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  pagination: {
    position: "absolute",
    top: 15,
    right: 30,
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica",
    fontWeight: "bold",
  },
  headerTitleFallback: {
    fontSize: 22,
    fontWeight: "bold",
  },
  pillContainer: {
    alignItems: "center",
    marginBottom: 6,
  },
  pill: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    paddingVertical: 4,
    paddingHorizontal: 15,
    borderRadius: 15,
    textTransform: "uppercase",
  },
  docTitle: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 3,
  },
  docSubTitle: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 15,
    backgroundColor: "#f8fafc",
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridCol: {
    width: "25%",
    marginBottom: 10,
    paddingRight: 5,
  },
  gridColHalf: {
    width: "50%",
    marginBottom: 10,
    paddingRight: 5,
  },
  label: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 10.5,
    fontWeight: "bold",
  },
  valueHighlight: {
    fontSize: 10.5,
    fontWeight: "bold",
  },
  divider: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginVertical: 5,
  },
  financialBlock: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    marginBottom: 8,
  },
  financialCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  financialDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    height: "70%",
    alignSelf: "center",
  },
  financialLabel: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 3,
    marginTop: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
  },
  tableHeaderCell: {
    padding: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  tableRowCell: {
    padding: 8,
    fontSize: 9.5,
  },
  tableRowSub: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    padding: 6,
    fontSize: 9,
    color: "#64748b",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  itineraryCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 8,
  },
  itineraryIcon: {
    width: 25,
    fontSize: 14,
    textAlign: "center",
    alignSelf: "center",
  },
  itineraryContent: {
    flex: 1,
    paddingLeft: 10,
  },
  itineraryType: {
    fontSize: 8.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  itineraryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  itineraryDesc: {
    fontSize: 9.5,
    lineHeight: 1.3,
  },
  incExcContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 6,
    marginBottom: 8,
  },
  incExcBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
  },
  incExcTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
    fontSize: 9.5,
  },
  bulletDot: {
    width: 8,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    color: "#475569",
  },
  policiesBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#ffffff",
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    zIndex: 10,
  },
  footerContent: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 6,
    fontSize: 10.5,
  },
  footerCol: {
    flex: 1,
    alignItems: "center",
    textAlign: "center",
  },
  footerColCenter: {
    flex: 1,
    alignItems: "center",
    textAlign: "center",
  },
  footerColRight: {
    flex: 1,
    alignItems: "center",
    textAlign: "center",
  },
  footerText: {
    color: "#e2e8f0",
    fontSize: 11,
  },
  footerDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    height: "60%",
    marginHorizontal: 15,
  },
});

const renderHtmlToPdf = (htmlText: string, baseStyle: any = {}) => {
  if (!htmlText) return null;

  if (!htmlText.includes("<") && !htmlText.includes(">")) {
    return <Text style={baseStyle}>{htmlText}</Text>;
  }

  const tokens = htmlText.split(
    /(<\/?[a-zA-Z0-9]+(?:\s+[a-zA-Z0-9-]+(?:=(?:'[^']*'|"[^"]*"|[^\s>]+))?)*\s*\/?>)/g
  );

  let currentListType: "ul" | "ol" | null = null;
  let listItemCount = 0;
  const resultElements: React.ReactNode[] = [];
  const styleStack: any[] = [{ ...baseStyle }];

  const getActiveStyle = () => {
    return styleStack.reduce((acc, curr) => ({ ...acc, ...curr }), {});
  };

  let currentTextBuffer: { text: string; style: any }[] = [];

  const flushTextBuffer = () => {
    if (currentTextBuffer.length === 0) return null;
    const textNodes = currentTextBuffer.map((t, idx) => (
      <Text key={idx} style={t.style}>
        {t.text}
      </Text>
    ));
    currentTextBuffer = [];
    return textNodes;
  };

  let tokenKey = 0;

  for (const token of tokens) {
    if (!token) continue;

    if (token.startsWith("<") && token.endsWith(">")) {
      const isClosing = token.startsWith("</");
      const tagMatch = token.match(/<\/?([a-zA-Z0-9]+)/);
      const tagName = tagMatch && tagMatch[1] ? tagMatch[1].toLowerCase() : "";

      if (isClosing) {
        if (
          ["strong", "b", "em", "i", "u", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6"].includes(
            tagName
          )
        ) {
          if (styleStack.length > 1) {
            styleStack.pop();
          }
        }

        if (tagName === "ul" || tagName === "ol") {
          currentListType = null;
        } else if (tagName === "li") {
          const content = flushTextBuffer();
          const bullet = currentListType === "ol" ? `${listItemCount}. ` : "• ";
          resultElements.push(
            <View
              key={tokenKey++}
              style={{
                flexDirection: "row",
                marginLeft: getActiveStyle().marginLeft || 10,
                marginBottom: 2,
              }}
            >
              <Text style={[{ width: 12, fontWeight: "bold" }, getActiveStyle()]}>{bullet}</Text>
              <Text style={[{ flex: 1 }, getActiveStyle()]}>{content}</Text>
            </View>
          );
        } else if (["p", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
          const content = flushTextBuffer();
          if (content) {
            resultElements.push(
              <View
                key={tokenKey++}
                style={{
                  marginBottom: getActiveStyle().marginBottom || 4,
                  marginTop: getActiveStyle().marginTop || 0,
                }}
              >
                <Text style={getActiveStyle()}>{content}</Text>
              </View>
            );
          }
        }
      } else {
        const newStyle: any = {};
        if (tagName === "strong" || tagName === "b") {
          newStyle.fontWeight = "bold";
        } else if (tagName === "em" || tagName === "i") {
          newStyle.fontStyle = "italic";
        } else if (tagName === "u") {
          newStyle.textDecoration = "underline";
        } else if (tagName === "h1") {
          newStyle.fontSize = 16;
          newStyle.fontWeight = "bold";
          newStyle.marginBottom = 6;
          newStyle.marginTop = 10;
        } else if (tagName === "h2") {
          newStyle.fontSize = 14;
          newStyle.fontWeight = "bold";
          newStyle.marginBottom = 5;
          newStyle.marginTop = 8;
        } else if (tagName === "h3") {
          newStyle.fontSize = 12;
          newStyle.fontWeight = "bold";
          newStyle.marginBottom = 4;
          newStyle.marginTop = 6;
        } else if (tagName === "ul") {
          currentListType = "ul";
        } else if (tagName === "ol") {
          currentListType = "ol";
          listItemCount = 0;
        } else if (tagName === "li") {
          const prev = flushTextBuffer();
          if (prev) resultElements.push(<Text key={tokenKey++}>{prev}</Text>);
          if (currentListType === "ol") {
            listItemCount++;
          }
        } else if (tagName === "br") {
          const prev = flushTextBuffer();
          if (prev) {
            resultElements.push(<Text key={tokenKey++}>{prev}</Text>);
          } else {
            resultElements.push(<Text key={tokenKey++}>{"\n"}</Text>);
          }
        }

        if (
          ["strong", "b", "em", "i", "u", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6"].includes(
            tagName
          )
        ) {
          styleStack.push(newStyle);
        }
      }
    } else {
      const decodedText = token
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"');

      currentTextBuffer.push({
        text: decodedText,
        style: getActiveStyle(),
      });
    }
  }

  const finalContent = flushTextBuffer();
  if (finalContent) {
    resultElements.push(<Text key={tokenKey++}>{finalContent}</Text>);
  }

  return <View style={{ flexDirection: "column" }}>{resultElements}</View>;
};

export interface QuotePDFProps {
  quote: TravelQuoteDto;
  agency: PdfAgencyInfo;
  totals?: ReturnType<typeof calculateDetailedQuoteTotals>;
  currentUser?: string;
  payments?: TravelPaymentDto[];
}

export function QuotePDF({ quote, agency, totals: passedTotals, currentUser, payments }: QuotePDFProps) {
  const totals: ReturnType<typeof calculateDetailedQuoteTotals> =
    passedTotals || (quote as any).totals || calculateDetailedQuoteTotals(quote, agency as any);

  const pdfNavy = agency.theme?.pdfNavy || agency.theme?.primaryColor || "#0B3B60";
  const pdfAccent = agency.theme?.pdfAccent || agency.theme?.secondaryColor || "#eab308";
  const pdfBackground = agency.theme?.pdfBackground || "#ffffff";
  const pdfTextPrimary = agency.theme?.pdfTextPrimary || "#334155";
  const pdfTextSecondary = agency.theme?.pdfTextSecondary || "#64748b";

  const inclusions: any = quote.inclusions;
  const exclusions: any = quote.exclusions;

  const safeDate = (dateStr: string | null | undefined) => {
    try {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split("-").map(Number);
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        if (year !== undefined && month !== undefined && day !== undefined) {
          const d = new Date(year, month - 1, day);
          return isNaN(d.getTime()) ? null : d;
        }
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    const d = safeDate(dateStr);
    return d
      ? d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
      : "Por definir";
  };

  const expirationDate = () => {
    const d = safeDate(quote.createdAt);
    if (!d) return "Por definir";
    return new Date(d.getTime() + (quote.validityHours || 48) * 60 * 60 * 1000).toLocaleDateString(
      "es-ES",
      { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    );
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: quote.currency || "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hotelsList = (quote.days || []).flatMap((day) =>
    (day.items || []).filter((item) => item.type === "Hotel")
  );

  const travelersList = quote.travelers || [];
  const finalTotalToDisplay =
    (totals.byHotel?.length || 0) > 1
      ? Math.min(...totals.byHotel!.map((h: any) => h.total))
      : totals.total || totals.finalTotal || 0;

  const totalCuotasPagadas = (quote.amortizationSchedule || [])
    .filter((inst) => inst.status === "paid")
    .reduce((sum, inst) => sum + (inst.amount || 0), 0);

  const totalAbonosRealizados = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const depositoMostrar =
    payments && payments.length > 0
      ? totalAbonosRealizados
      : (quote.minimumDeposit || 0) + totalCuotasPagadas;

  const saldoRestante = Math.max(0, finalTotalToDisplay - depositoMostrar);
  const bookingConfirmationText = agency.bookingConfirmation || quote.bookingConfirmation || "";

  const sanitizeText = (text: string) => {
    if (!text) return "";
    return text.replace(/↔/g, "-").replace(/→/g, "-").replace(/←/g, "-").replace(/–/g, "-");
  };

  const renderItineraryIcon = (type: string, color: string) => {
    switch (type) {
      case "Flight":
        return (
          <Svg width={14} height={14} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
            <Path
              d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z"
              fill={color}
            />
          </Svg>
        );
      case "Hotel":
        return (
          <Svg width={14} height={14} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
            <Path
              d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"
              fill={color}
            />
          </Svg>
        );
      case "Activity":
        return (
          <Svg width={14} height={14} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
            <Path
              d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.11.9 2 2 2h16c1.1 0 2-.89 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-9 7.5h-2v-2h2v2zm0-4.5h-2v-2h2v2zm0-4.5h-2v-2h2v2z"
              fill={color}
            />
          </Svg>
        );
      case "Transport":
      case "Transfer":
        return (
          <Svg width={14} height={14} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
            <Path
              d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.27-3.82c.14-.4.52-.68.96-.68h9.54c.44 0 .82.28.96.68L19 11H5z"
              fill={color}
            />
          </Svg>
        );
      case "Insurance":
        return (
          <Svg width={14} height={14} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
            <Path
              d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"
              fill={color}
            />
          </Svg>
        );
      default:
        return (
          <Svg width={14} height={14} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
            <Path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill={color}
            />
          </Svg>
        );
    }
  };

  return (
    <Document>
      <Page size="LETTER" style={[styles.page, { backgroundColor: pdfBackground, color: pdfTextPrimary }]}>
        {/* Marca de agua */}
        <Text style={[styles.watermark, { color: pdfTextPrimary }]} fixed>
          {agency.name.toUpperCase()} - {quote.isBooking ? "RESERVA" : "COTIZACION"}
        </Text>

        {/* Header Curvo SVG */}
        <View style={styles.header} fixed>
          <Svg width={612} height={90} viewBox="0 0 612 90" style={{ position: "absolute", top: 0, left: 0 }}>
            <Path d="M 0,0 L 612,0 L 612,48 Q 306,98 0,48 Z" fill={pdfAccent} />
            <Path d="M 0,0 L 612,0 L 612,45 Q 306,95 0,45 Z" fill={pdfNavy} />
            <Path d="M 430,78 Q 500,80 565,65" stroke={pdfAccent} strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
            <G transform="translate(560, 56) scale(0.6) rotate(60)">
              <Path
                d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                fill={pdfAccent}
              />
            </G>
          </Svg>

          {agency.slogan && <Text style={styles.sloganInArc}>{agency.slogan}</Text>}

          <Text
            render={({ pageNumber, totalPages }) => `Pag. ${pageNumber}/${totalPages}`}
            style={styles.pagination}
            fixed
          />

          <View style={styles.logoInHeader}>
            {agency.logoUrl && typeof agency.logoUrl === "string" && agency.logoUrl.trim().length > 0 ? (
              <Image src={agency.logoUrl} style={styles.logoHeader} />
            ) : (
              <Text style={[styles.headerTitleFallback, { color: pdfNavy }]}>{agency.name}</Text>
            )}
          </View>
        </View>

        {/* Títulos del Documento */}
        <View style={styles.pillContainer}>
          <Text style={[styles.pill, { backgroundColor: pdfAccent }]}>
            {quote.isBooking ? "Confirmación de Reserva" : "Cotización"}
          </Text>
        </View>
        <Text style={[styles.docTitle, { color: pdfNavy }]}>
          {quote.isBooking ? "RESERVA" : "COTIZACIÓN"} N°{" "}
          {quote.isBooking ? quote.bookingNumber || quote.quoteNumber : quote.quoteNumber}
        </Text>
        <Text style={[styles.docSubTitle, { color: pdfTextSecondary }]}>
          Destino: {quote.destination} | {quote.passengers} Adultos{" "}
          {quote.childPassengers > 0 ? `+ ${quote.childPassengers} Niños` : ""}
        </Text>

        {/* Cuadro de Información General */}
        <View style={styles.card}>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Origen</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{quote.originCity || "Por definir"}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Fecha Inicio</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{formatDate(quote.startDate)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Destino</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{quote.destination}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Fecha Fin</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{formatDate(quote.endDate)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.gridCol}>
              <Text style={styles.label}>Asesor</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>
                {quote.advisorName || agency.advisorName || "No asignado"}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Counter</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>
                {currentUser || quote.counterName || "No asignado"}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Fecha Elaboración</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{formatDate(quote.createdAt)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Límite {quote.isBooking ? "Pago" : "Validez"}</Text>
              <Text style={[styles.valueHighlight, { color: pdfAccent }]}>{expirationDate()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.gridCol}>
              <Text style={styles.label}>Titular</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{quote.clientName || "No especificado"}</Text>
            </View>
            <View style={styles.gridColHalf}>
              <Text style={styles.label}>E-Mail</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{quote.clientEmail || "No especificado"}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Teléfono</Text>
              <Text style={[styles.value, { color: pdfTextPrimary }]}>{quote.clientPhone || "No especificado"}</Text>
            </View>
          </View>
        </View>

        {/* Cuadro Financiero Superior (Solo reservas) */}
        {quote.isBooking && (
          <View style={styles.financialBlock}>
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Valor Total Plan</Text>
              <Text style={[styles.financialValue, { color: pdfNavy }]}>
                {formatCurrencyLocal(finalTotalToDisplay)}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Depósito / Abono</Text>
              <Text style={[styles.financialValue, { color: pdfTextPrimary }]}>
                {formatCurrencyLocal(depositoMostrar)}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Saldo Pendiente</Text>
              <Text style={[styles.financialValue, { color: pdfAccent }]}>
                {formatCurrencyLocal(saldoRestante > 0 ? saldoRestante : 0)}
              </Text>
            </View>
          </View>
        )}

        {/* Observaciones (Solo reservas) */}
        {quote.isBooking && quote.observations && (
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Observaciones de la Reserva</Text>
            <View style={styles.policiesBox}>
              {renderHtmlToPdf(quote.observations, { fontSize: 11, color: pdfTextPrimary })}
            </View>
          </View>
        )}

        {/* Plan de Amortización */}
        {quote.isBooking && quote.amortizationSchedule && quote.amortizationSchedule.length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Plan de Amortización</Text>
            <View style={styles.table}>
              <View style={[styles.tableHeader, { backgroundColor: pdfNavy }]}>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Cuota</Text>
                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Fecha Límite</Text>
                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Valor Cuota</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Estado</Text>
              </View>
              {quote.amortizationSchedule.map((inst, idx) => (
                <View key={inst.id || idx} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableRowCell, { width: "20%", fontWeight: "bold", color: pdfTextPrimary }]}>
                    {inst.code || `Cuota ${idx + 1}`}
                  </Text>
                  <Text style={[styles.tableRowCell, { width: "30%", color: pdfTextSecondary }]}>
                    {formatDate(inst.dueDate)}
                  </Text>
                  <Text style={[styles.tableRowCell, { width: "30%", fontWeight: "bold", color: pdfTextPrimary }]}>
                    {formatCurrencyLocal(inst.amount)}
                  </Text>
                  <Text
                    style={[
                      styles.tableRowCell,
                      {
                        width: "20%",
                        color:
                          inst.status === "paid" ? "#059669" : inst.status === "partial" ? "#3b82f6" : "#d97706",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {inst.status === "paid" ? "Pagada" : inst.status === "partial" ? "Abono" : "Pendiente"}
                  </Text>
                </View>
              ))}
              <View style={[styles.tableRow, { backgroundColor: pdfNavy + "08" }]} wrap={false}>
                <Text style={[styles.tableRowCell, { width: "50%", fontWeight: "bold", color: pdfNavy, textAlign: "right" }]}>
                  Total Programado:
                </Text>
                <Text style={[styles.tableRowCell, { width: "30%", fontWeight: "bold", color: pdfNavy }]}>
                  {formatCurrencyLocal(quote.amortizationSchedule.reduce((sum, i) => sum + i.amount, 0))}
                </Text>
                <Text style={[styles.tableRowCell, { width: "20%" }]}> </Text>
              </View>
            </View>
          </View>
        )}

        {/* Historial de Abonos (Solo reservas) */}
        {quote.isBooking && payments && payments.length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Historial de Abonos</Text>
            <View style={styles.table}>
              <View style={[styles.tableHeader, { backgroundColor: pdfNavy }]}>
                <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Fecha</Text>
                <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Recibo #</Text>
                <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Método de Pago</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Monto</Text>
                <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Cuota Asignada</Text>
              </View>
              {payments.map((payment, idx) => {
                const linkedInst = quote.amortizationSchedule?.find((i) => i.id === payment.installmentId);
                const instLabel = linkedInst ? linkedInst.code || "Cuota" : "-";
                const receiptCode =
                  payment.receiptNumber || (payment.id ? `RC-${payment.id.slice(0, 6).toUpperCase()}` : "N/A");

                return (
                  <View key={payment.id || idx} style={styles.tableRow} wrap={false}>
                    <Text style={[styles.tableRowCell, { width: "18%", color: pdfTextSecondary }]}>
                      {formatDate(payment.date)}
                    </Text>
                    <Text style={[styles.tableRowCell, { width: "22%", fontWeight: "bold", color: pdfTextPrimary }]}>
                      {receiptCode}
                    </Text>
                    <Text style={[styles.tableRowCell, { width: "22%", color: pdfTextPrimary }]}>
                      {payment.method || "N/A"}
                    </Text>
                    <Text style={[styles.tableRowCell, { width: "20%", fontWeight: "bold", color: "#059669" }]}>
                      {formatCurrencyLocal(payment.amount)}
                    </Text>
                    <Text style={[styles.tableRowCell, { width: "18%", color: pdfTextSecondary }]}>
                      {instLabel}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.tableRow, { backgroundColor: pdfNavy + "08" }]} wrap={false}>
                <Text style={[styles.tableRowCell, { width: "62%", fontWeight: "bold", color: pdfNavy, textAlign: "right" }]}>
                  Total Abonado:
                </Text>
                <Text style={[styles.tableRowCell, { width: "20%", fontWeight: "bold", color: "#059669" }]}>
                  {formatCurrencyLocal(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                </Text>
                <Text style={[styles.tableRowCell, { width: "18%" }]}> </Text>
              </View>
            </View>
          </View>
        )}

        {/* Pasajeros */}
        {travelersList.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Datos de los Pasajeros</Text>
            <View style={styles.table}>
              <View style={[styles.tableHeader, { backgroundColor: pdfNavy }]}>
                <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Nombres y Apellidos</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Tipo</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Documento</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Número</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>F. Nacimiento</Text>
              </View>
              {travelersList.map((t, idx) => (
                <View key={idx} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableRowCell, { width: "35%", fontWeight: "bold", color: pdfTextPrimary }]}>
                    {t.firstName} {t.lastName}
                  </Text>
                  <Text style={[styles.tableRowCell, { width: "15%", color: pdfTextSecondary }]}>
                    {t.type || "PASAJERO"}
                  </Text>
                  <Text style={[styles.tableRowCell, { width: "15%", color: pdfTextSecondary }]}>
                    {t.idType || "N/A"}
                  </Text>
                  <Text style={[styles.tableRowCell, { width: "15%", color: pdfTextSecondary }]}>
                    {t.idNumber || "N/A"}
                  </Text>
                  <Text style={[styles.tableRowCell, { width: "20%", color: pdfTextSecondary }]}>
                    {t.birthDate ? formatDate(t.birthDate) : "N/A"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Descripción de Hoteles (Multicotización Segregada) */}
        {hotelsList.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Descripción de Hoteles</Text>
            {hotelsList.map((h, idx) => {
              const hotelTotals = totals.byHotel?.find((ht: any) => ht.hotelId === h.id);
              const totalStr = hotelTotals ? formatCurrencyLocal(hotelTotals.total) : "N/A";

              return (
                <View key={idx} style={{ marginBottom: 15 }} wrap={false}>
                  {!quote.isBooking && hotelsList.length > 1 && (
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: pdfNavy, marginBottom: 4 }}>
                      Opción {idx + 1}: {h.hotelDetails?.hotelName || h.title}
                    </Text>
                  )}
                  <View style={styles.table}>
                    <View style={[styles.tableHeader, { backgroundColor: pdfNavy }]}>
                      <Text style={[styles.tableHeaderCell, { width: quote.isBooking ? "40%" : "30%" }]}>
                        Hotel / Operador
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: quote.isBooking ? "25%" : "20%" }]}>
                        Acomodación
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: quote.isBooking ? "15%" : "10%", textAlign: "center" }]}>
                        Noches
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: quote.isBooking ? "20%" : "20%" }]}>
                        Alimentación
                      </Text>
                      {!quote.isBooking && (
                        <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Inversión</Text>
                      )}
                    </View>
                    <View style={styles.tableRow}>
                      <View style={[styles.tableRowCell, { width: quote.isBooking ? "40%" : "30%" }]}>
                        <Text style={{ fontWeight: "bold", color: pdfTextPrimary }}>
                          {h.hotelDetails?.hotelName || h.title}
                        </Text>
                        {quote.isBooking && (
                          <Text style={{ fontSize: 7, color: pdfTextSecondary, marginTop: 2 }}>
                            OPERADOR: {h.provider || agency.name}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.tableRowCell, { width: quote.isBooking ? "25%" : "20%", color: pdfTextSecondary }]}>
                        {h.hotelDetails?.roomType || "Estándar"}
                      </Text>
                      <Text style={[styles.tableRowCell, { width: quote.isBooking ? "15%" : "10%", textAlign: "center", color: pdfTextSecondary }]}>
                        {quote.nights}
                      </Text>
                      <Text style={[styles.tableRowCell, { width: quote.isBooking ? "20%" : "20%", color: pdfTextSecondary }]}>
                        {h.hotelDetails?.boardBasis || "No especificada"}
                      </Text>
                      {!quote.isBooking && (
                        <View style={[styles.tableRowCell, { width: "20%" }]}>
                          <Text style={{ fontWeight: "bold", color: pdfAccent, fontSize: 12, marginBottom: 2 }}>
                            {totalStr}
                          </Text>
                          {hotelTotals && (hotelTotals.totalAdult !== undefined || hotelTotals.totalChild !== undefined) && (
                            <View style={{ gap: 1, marginTop: 2 }}>
                              <Text style={{ fontSize: 7, color: pdfTextSecondary, fontWeight: "bold" }}>
                                Adultos ({quote.passengers}): {formatCurrencyLocal(hotelTotals.totalAdult || 0)}
                                <Text style={{ fontWeight: "normal" }}>
                                  {" "}
                                  ({formatCurrencyLocal(Math.round((hotelTotals.totalAdult || 0) / quote.passengers))} c/u)
                                </Text>
                              </Text>
                              {quote.childPassengers > 0 && (
                                <Text style={{ fontSize: 7, color: pdfTextSecondary, fontWeight: "bold" }}>
                                  Niños ({quote.childPassengers}): {formatCurrencyLocal(hotelTotals.totalChild || 0)}
                                  <Text style={{ fontWeight: "normal" }}>
                                    {" "}
                                    ({formatCurrencyLocal(Math.round((hotelTotals.totalChild || 0) / quote.childPassengers))} c/u)
                                  </Text>
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    {quote.isBooking && (
                      <View style={styles.tableRowSub}>
                        <Text style={{ color: pdfTextSecondary }}>
                          <Text style={{ fontWeight: "bold", color: pdfTextPrimary }}>Entrega (Check-In):</Text>{" "}
                          {h.hotelDetails?.checkIn ? h.hotelDetails.checkIn : "15:00"} |
                          <Text style={{ fontWeight: "bold", color: pdfTextPrimary }}> Devolución (Check-Out):</Text>{" "}
                          {h.hotelDetails?.checkOut ? h.hotelDetails.checkOut : "12:00"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Propuesta cuando no hay hoteles */}
        {!quote.isBooking && hotelsList.length === 0 && (
          <View style={{ marginBottom: 15 }} wrap={false}>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Propuesta de Inversión</Text>
            <View style={styles.policiesBox}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: pdfTextPrimary }}>
                  Valor Total de la Propuesta:
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: pdfAccent }}>
                  {formatCurrencyLocal(finalTotalToDisplay)}
                </Text>
              </View>
              {(totals.totalAdult > 0 || totals.totalChild > 0) && (
                <View style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6, gap: 2 }}>
                  <Text style={{ fontSize: 9, color: pdfTextSecondary, fontWeight: "bold" }}>
                    Adultos ({quote.passengers}): {formatCurrencyLocal(totals.totalAdult || 0)}
                    <Text style={{ fontWeight: "normal" }}>
                      {" "}
                      ({formatCurrencyLocal(Math.round((totals.totalAdult || 0) / quote.passengers))} c/u)
                    </Text>
                  </Text>
                  {quote.childPassengers > 0 && (
                    <Text style={{ fontSize: 9, color: pdfTextSecondary, fontWeight: "bold" }}>
                      Niños ({quote.childPassengers}): {formatCurrencyLocal(totals.totalChild || 0)}
                      <Text style={{ fontWeight: "normal" }}>
                        {" "}
                        ({formatCurrencyLocal(Math.round((totals.totalChild || 0) / quote.childPassengers))} c/u)
                      </Text>
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Itinerario y Servicios Incluidos */}
        {quote.days?.some((day) => day.items?.some((item) => item.type !== "Hotel")) && (
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Itinerario y Servicios Incluidos</Text>
            <View style={{ gap: 6 }}>
              {quote.days.map((day) =>
                (day.items || [])
                  .filter((item) => item.type !== "Hotel")
                  .map((item) => (
                    <View key={item.id} style={styles.itineraryCard} wrap={false}>
                      <View style={styles.itineraryIcon}>{renderItineraryIcon(item.type, pdfNavy)}</View>
                      <View style={styles.itineraryContent}>
                        <Text style={[styles.itineraryType, { color: pdfAccent }]}>
                          {item.type === "Other"
                            ? "OTRO SERVICIO"
                            : item.type === "Flight"
                            ? "VUELO / TRANSPORTE"
                            : item.type === "Activity"
                            ? "ACTIVIDAD / TOUR"
                            : item.type === "Transfer"
                            ? "TRASLADO"
                            : item.type === "Insurance"
                            ? "SEGURO / ASISTENCIA"
                            : item.type.toUpperCase()}
                        </Text>
                        <Text style={[styles.itineraryTitle, { color: pdfNavy }]}>{sanitizeText(item.title)}</Text>
                        {item.description ? (
                          <Text style={[styles.itineraryDesc, { color: pdfTextSecondary }]}>
                            {sanitizeText(item.description)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))
              )}
            </View>
          </View>
        )}

        {/* Inclusiones y Exclusiones */}
        <View style={styles.incExcContainer}>
          <View style={styles.incExcBox}>
            <Text style={[styles.incExcTitle, { color: "#059669" }]}>Servicios Incluidos</Text>
            {inclusions ? (
              typeof inclusions === "string" ? (
                renderHtmlToPdf(inclusions, { fontSize: 11, color: pdfTextPrimary })
              ) : Array.isArray(inclusions) && inclusions.length > 0 ? (
                inclusions.map((inc: any, i: number) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={[styles.bulletDot, { color: "#059669" }]}>•</Text>
                    <Text style={[styles.bulletText, { color: pdfTextPrimary }]}>{inc}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 8, fontStyle: "italic", color: pdfTextSecondary }}>
                  Consulte con su asesor
                </Text>
              )
            ) : (
              <Text style={{ fontSize: 8, fontStyle: "italic", color: pdfTextSecondary }}>
                Consulte con su asesor
              </Text>
            )}
          </View>
          <View style={styles.incExcBox}>
            <Text style={[styles.incExcTitle, { color: "#dc2626" }]}>No Incluye</Text>
            {exclusions ? (
              typeof exclusions === "string" ? (
                renderHtmlToPdf(exclusions, { fontSize: 11, color: pdfTextPrimary })
              ) : Array.isArray(exclusions) && exclusions.length > 0 ? (
                exclusions.map((exc: any, i: number) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={[styles.bulletDot, { color: "#dc2626" }]}>•</Text>
                    <Text style={[styles.bulletText, { color: pdfTextPrimary }]}>{exc}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 8, fontStyle: "italic", color: pdfTextSecondary }}>
                  Gastos no especificados
                </Text>
              )
            ) : (
              <Text style={{ fontSize: 8, fontStyle: "italic", color: pdfTextSecondary }}>
                Gastos no especificados
              </Text>
            )}
          </View>
        </View>

        {/* Depósito Mínimo Requerido (Solo cotizaciones) */}
        {!quote.isBooking && depositoMostrar > 0 && (
          <View wrap={false} style={{ marginTop: 10 }}>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Depósito Mínimo Requerido</Text>
            <View style={styles.policiesBox}>
              <Text style={{ fontSize: 11, color: pdfTextPrimary }}>
                Para congelar la tarifa y confirmar los servicios de esta propuesta, se requiere un depósito inicial
                mínimo de{" "}
                <Text style={{ fontWeight: "bold", color: pdfAccent }}>{formatCurrencyLocal(depositoMostrar)}</Text>.
              </Text>
            </View>
          </View>
        )}

        {/* Confirmación y Bancos */}
        {!quote.isBooking && (bookingConfirmationText || agency.bankEntity || agency.bankAccount) && (
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Confirmación de Reserva</Text>
            <View style={styles.policiesBox}>
              {bookingConfirmationText &&
                renderHtmlToPdf(bookingConfirmationText, {
                  fontSize: 11,
                  color: pdfTextPrimary,
                  marginBottom: 8,
                  lineHeight: 1.3,
                })}
            </View>
          </View>
        )}

        {/* Políticas Generales (Solo Reservas) */}
        {quote.isBooking && (
          <View>
            <Text style={[styles.sectionTitle, { color: pdfNavy }]}>Políticas y Condiciones Generales</Text>
            <View style={styles.policiesBox}>
              {renderHtmlToPdf(
                agency.generalPolicies ||
                  quote.policies ||
                  "Se aplican las condiciones generales de la agencia y de los prestadores de servicios finales. Esta cotización está sujeta a disponibilidad de cupos y cambios de tarifa sin previo aviso hasta el momento de la confirmación y pago total.",
                { fontSize: 11, color: pdfTextSecondary, lineHeight: 1.4, textAlign: "justify" }
              )}
            </View>
          </View>
        )}

        {/* Footer Brand */}
        <View style={styles.footer} fixed>
          <Svg width={612} height={110} viewBox="0 0 612 110" style={{ position: "absolute", top: 0, left: 0 }}>
            <Path d="M 0,110 L 612,110 L 612,32 Q 306,-3 0,32 Z" fill={pdfAccent} />
            <Path d="M 0,110 L 612,110 L 612,35 Q 306,0 0,35 Z" fill={pdfNavy} />
          </Svg>

          <View style={styles.footerContent}>
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Emails */}
              <View style={styles.footerCol}>
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
                    <Path
                      d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"
                      fill={pdfBackground}
                    />
                  </Svg>
                </View>
                {agency.email && (
                  <Text style={[styles.footerText, { color: "#e2e8f0", marginBottom: 2 }]}>{agency.email.trim()}</Text>
                )}
                {agency.email2 && <Text style={[styles.footerText, { color: "#e2e8f0" }]}>{agency.email2.trim()}</Text>}
              </View>

              <View style={styles.footerDivider} />

              {/* Teléfonos */}
              <View style={styles.footerColCenter}>
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
                    <Path
                      d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                      fill={pdfBackground}
                    />
                  </Svg>
                </View>
                {agency.phone && (
                  <Text style={[styles.footerText, { color: "#e2e8f0", marginBottom: 2 }]}>
                    {(agency.phone.split(",")[0] ?? "").trim()}
                  </Text>
                )}
                {agency.phone2 && (
                  <Text style={[styles.footerText, { color: "#e2e8f0" }]}>
                    {(agency.phone2.split(",")[0] ?? "").trim()}
                  </Text>
                )}
              </View>

              <View style={styles.footerDivider} />

              {/* Web y Redes */}
              <View style={styles.footerColRight}>
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" style={{ alignSelf: "center" }}>
                    <Path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                      fill={pdfBackground}
                    />
                  </Svg>
                </View>
                {agency.website && (
                  <Text style={[styles.footerText, { color: "#e2e8f0", marginBottom: 2 }]}>{agency.website}</Text>
                )}
                {agency.socialMedia?.instagram && (
                  <Text style={[styles.footerText, { color: "#e2e8f0", fontSize: 8.5 }]}>
                    @{agency.socialMedia.instagram.replace(/^@/, "").trim()}
                  </Text>
                )}
                {!agency.socialMedia?.instagram && !agency.website && (
                  <Text style={[styles.footerText, { color: "#e2e8f0" }]}>{agency.name}</Text>
                )}
              </View>
            </View>

            {agency.address && (
              <View style={{ width: "100%", alignItems: "center", marginTop: 3, paddingTop: 3 }}>
                <Text style={[styles.footerText, { color: "#cbd5e1" }]}>
                  {agency.address} {agency.city ? `· ${agency.city}` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
