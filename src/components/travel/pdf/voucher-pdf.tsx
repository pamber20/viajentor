/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { PdfAgencyInfo } from "./types";
import type { TravelVoucherDto } from "@/server/travel/trips";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#334155",
    backgroundColor: "#ffffff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 15,
  },
  logo: {
    height: 45,
    width: 130,
    objectFit: "contain",
  },
  logoPlaceholder: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  headerInfo: {
    textAlign: "right",
  },
  agencyName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  agencyDetails: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 1.3,
  },
  titleBar: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  titleText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e3a8a",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  mainCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 15,
    backgroundColor: "#ffffff",
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 5,
  },
  gridColHalf: {
    width: "50%",
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#1e293b",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginVertical: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e3a8a",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
    marginBottom: 8,
    marginTop: 10,
  },
  bulletList: {
    marginTop: 5,
    paddingLeft: 10,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
    lineHeight: 1.3,
  },
  bulletPoint: {
    width: 10,
    color: "#f97316",
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
  },
  pnrBox: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 15,
    color: "#ffffff",
    alignItems: "center",
    marginVertical: 10,
  },
  pnrText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#f97316",
    letterSpacing: 2,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#94a3b8",
  },
  greenBanner: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  greenBannerText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "bold",
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 15,
  },
  thanksCol: {
    flex: 1,
  },
  thanksTitle: {
    fontSize: 12.5,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  thanksSub: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 1.3,
  },
  infoBox: {
    width: 220,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 9.5,
    color: "#64748b",
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
  },
  hotelBorderCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#ffffff",
    marginBottom: 15,
  },
  hotelName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  timesContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 6,
  },
  timeCol: {
    flexDirection: "column",
  },
  timeLabel: {
    fontSize: 9.5,
    color: "#64748b",
  },
  timeValue: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 1,
  },
  hotelDetailRow: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.3,
    marginBottom: 3,
  },
  dashedSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderStyle: "dashed",
    marginVertical: 10,
  },
  summaryTitle: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  roomStatusBanner: {
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roomStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#334155",
  },
  roomStatusGreen: {
    color: "#166534",
    fontWeight: "bold",
  },
  roomTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  datesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: "#f8fafc",
    padding: 6,
    borderRadius: 4,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
  },
  dateValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 1,
  },
  detailsTable: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableRowDouble: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableCellLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    padding: 8,
  },
  tableCellRight: {
    flex: 1,
    padding: 8,
  },
  tableCellFull: {
    width: "100%",
    padding: 8,
  },
  cellLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 1,
  },
  cellValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
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
          if (styleStack.length > 1) styleStack.pop();
        }
        if (tagName === "ul" || tagName === "ol") {
          currentListType = null;
        } else if (tagName === "li") {
          const content = flushTextBuffer();
          const bullet = currentListType === "ol" ? `${listItemCount}. ` : "• ";
          resultElements.push(
            <View
              key={tokenKey++}
              wrap={false}
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
                wrap={false}
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
        if (tagName === "strong" || tagName === "b") newStyle.fontWeight = "bold";
        else if (tagName === "em" || tagName === "i") newStyle.fontStyle = "italic";
        else if (tagName === "u") newStyle.textDecoration = "underline";
        else if (tagName === "ul") currentListType = "ul";
        else if (tagName === "ol") {
          currentListType = "ol";
          listItemCount = 0;
        } else if (tagName === "li") {
          const prev = flushTextBuffer();
          if (prev) resultElements.push(<Text key={tokenKey++}>{prev}</Text>);
          if (currentListType === "ol") listItemCount++;
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

export interface VoucherPDFProps {
  voucher: TravelVoucherDto | any;
  agency: PdfAgencyInfo;
  mode?: "full" | "hotel" | "flight" | "transfers" | "activities";
}

export function VoucherPDF({ voucher, agency, mode = "full" }: VoucherPDFProps) {
  const travelersList = voucher.travelers || [];

  const formatDateSpanish = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const parts = dateStr.split(" ");
      const firstPart = parts[0];
      if (!firstPart) return dateStr;
      const d = new Date(firstPart);
      if (isNaN(d.getTime())) return dateStr;
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      const day = d.getUTCDate();
      const month = months[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      return `${day} de ${month} de ${year}`;
    } catch {
      return dateStr;
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    try {
      const inPart = checkIn.split(" ")[0];
      const outPart = checkOut.split(" ")[0];
      if (!inPart || !outPart) return 0;
      const inDate = new Date(inPart);
      const outDate = new Date(outPart);
      const diffTime = outDate.getTime() - inDate.getTime();
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return isNaN(nights) || nights < 0 ? 0 : nights;
    } catch {
      return 0;
    }
  };

  const formatCreationDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const monthsShort = [
        "ene.", "feb.", "mar.", "abr.", "may.", "jun.",
        "jul.", "ago.", "sep.", "oct.", "nov.", "dic."
      ];
      return `${d.getUTCDate().toString().padStart(2, "0")} ${monthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const getTravelersSummary = () => {
    if (travelersList.length === 0) {
      return `${voucher.hotelDetails?.quantity || 1} PAX`;
    }
    const adults = travelersList.filter((t: any) => !t.type || t.type === "ADULTO").length;
    const children = travelersList.filter((t: any) => t.type === "NIÑO").length;
    const infants = travelersList.filter((t: any) => t.type === "INFANTE").length;

    const parts = [];
    if (adults > 0) parts.push(`${adults} ${adults === 1 ? "Adulto" : "Adultos"}`);
    if (children > 0) parts.push(`${children} ${children === 1 ? "Niño" : "Niños"}`);
    if (infants > 0) parts.push(`${infants} ${infants === 1 ? "Infante" : "Infantes"}`);

    return parts.join(", ");
  };

  const hotelNights = voucher.hotelDetails
    ? calculateNights(voucher.hotelDetails.checkIn || "", voucher.hotelDetails.checkOut || "")
    : 0;
  const hotelCreationDate = formatCreationDate(voucher.createdAt || new Date().toISOString());

  return (
    <Document>
      {/* PAGE 1: HOTEL VOUCHER */}
      {voucher.hotelDetails?.name && (mode === "full" || mode === "hotel") ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.headerContainer}>
            {agency.logoUrl ? (
              <Image src={agency.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>{agency.name}</Text>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.agencyName}>{agency.name}</Text>
              <Text style={styles.agencyDetails}>NIT: {agency.nit}</Text>
              <Text style={styles.agencyDetails}>Tel: {agency.phone}</Text>
              <Text style={styles.agencyDetails}>{agency.email}</Text>
            </View>
          </View>

          <View style={styles.greenBanner}>
            <Text style={styles.greenBannerText}>Reservación confirmada</Text>
          </View>

          <View style={styles.topSection}>
            <View style={styles.thanksCol}>
              <Text style={styles.thanksTitle}>¡Gracias por viajar con {agency.name}!</Text>
              <Text style={styles.thanksSub}>
                Si tienes dudas, comunícate con nosotros a cualquiera de nuestros números de atención a cliente.
              </Text>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Localizador:</Text>
                <Text style={styles.infoValue}>{voucher.hotelDetails.confirmationNumber || "N/A"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Creado:</Text>
                <Text style={styles.infoValue}>{hotelCreationDate}</Text>
              </View>
              <View style={styles.infoRowLast}>
                <Text style={styles.infoLabel}>Titular:</Text>
                <Text style={styles.infoValue}>{voucher.hotelDetails.reservationHolder || "N/A"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.hotelBorderCard}>
            <Text style={styles.hotelName}>{voucher.hotelDetails.name}</Text>

            <View style={styles.timesContainer}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Llegada:</Text>
                <Text style={styles.timeValue}>15:00 hrs</Text>
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Salida:</Text>
                <Text style={styles.timeValue}>12:00 hrs</Text>
              </View>
            </View>

            <Text style={styles.hotelDetailRow}>
              <Text style={{ fontWeight: "bold" }}>Ubicación: </Text>
              {voucher.hotelDetails.address || "N/A"}
            </Text>
            <Text style={styles.hotelDetailRow}>
              <Text style={{ fontWeight: "bold" }}>Teléfono: </Text>
              {voucher.hotelDetails.phone || "N/A"}
            </Text>

            <View style={styles.dashedSeparator} />

            <Text style={styles.summaryTitle}>
              {travelersList.length || voucher.hotelDetails.quantity || 1} Huéspedes,{" "}
              {voucher.hotelDetails.roomType || "Habitación Standard"}
            </Text>

            <View style={styles.roomStatusBanner}>
              <Text style={styles.roomStatusText}>{voucher.hotelDetails.roomType || "Habitación Standard"}</Text>
              <Text style={styles.roomStatusGreen}>Reservación confirmada</Text>
            </View>

            <View style={styles.datesGrid}>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>Fecha de llegada:</Text>
                <Text style={styles.dateValue}>{formatDateSpanish(voucher.hotelDetails.checkIn || "")}</Text>
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>Fecha de salida:</Text>
                <Text style={styles.dateValue}>{formatDateSpanish(voucher.hotelDetails.checkOut || "")}</Text>
              </View>
              <View style={[styles.dateCol, { flex: 0.5 }]}>
                <Text style={styles.dateLabel}>Noches:</Text>
                <Text style={styles.dateValue}>{hotelNights}</Text>
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>No. Confirmación:</Text>
                <Text style={styles.dateValue}>{voucher.hotelDetails.confirmationNumber || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.detailsTable}>
              <View style={styles.tableRowDouble}>
                <View style={styles.tableCellLeft}>
                  <Text style={styles.cellLabel}>Titular de la reserva:</Text>
                  <Text style={styles.cellValue}>{voucher.hotelDetails.reservationHolder || "N/A"}</Text>
                </View>
                <View style={styles.tableCellRight}>
                  <Text style={styles.cellLabel}>Huéspedes:</Text>
                  <Text style={styles.cellValue}>{getTravelersSummary()}</Text>
                </View>
              </View>
              <View style={styles.tableRowDouble}>
                <View style={styles.tableCellLeft}>
                  <Text style={styles.cellLabel}>Plan de alimentos:</Text>
                  <Text style={styles.cellValue}>{voucher.hotelDetails.mealPlan || "No especificado"}</Text>
                </View>
                <View style={styles.tableCellRight}>
                  <Text style={styles.cellLabel}>Habitación:</Text>
                  <Text style={styles.cellValue}>
                    {voucher.hotelDetails.accommodation || voucher.hotelDetails.roomType || "Standard"}
                  </Text>
                </View>
              </View>
              <View style={[styles.tableCellFull, { borderBottomWidth: 1, borderBottomColor: "#cbd5e1" }]}>
                <Text style={styles.cellLabel}>Huéspedes / Pasajeros:</Text>
                {travelersList.length > 0 ? (
                  <Text style={[styles.cellValue, { fontWeight: "bold", color: "#0f172a", fontSize: 9.5, lineHeight: 1.4 }]}>
                    {travelersList
                      .map(
                        (t: any, idx: number) =>
                          `${idx + 1}. ${t.firstName} ${t.lastName || ""} (${t.idType || "DOC"}: ${t.idNumber || "N/A"})`
                      )
                      .join("\n")}
                  </Text>
                ) : (
                  <Text style={[styles.cellValue, { fontWeight: "bold", color: "#0f172a", fontSize: 9.5 }]}>
                    {voucher.hotelDetails.reservationHolder || "Según reserva"}
                  </Text>
                )}
              </View>
              <View style={styles.tableCellFull}>
                <Text style={styles.cellLabel}>Características adicionales:</Text>
                <Text style={[styles.cellValue, { fontWeight: "normal", color: "#334155", fontSize: 9.5, lineHeight: 1.3 }]}>
                  {voucher.hotelDetails.notes ||
                    "Vista: Sujeto a disponibilidad. No se incluyen cargos adicionales imprevistos o depósitos de garantía del hotel."}
                </Text>
              </View>
            </View>

            {voucher.hotelDetails.policies ? (
              <View style={{ marginTop: 8 }}>
                <View style={styles.dashedSeparator} />
                <Text style={[styles.cellLabel, { marginBottom: 4, fontWeight: "bold" }]}>
                  Políticas de Cancelación y Cláusulas Operativas:
                </Text>
                {renderHtmlToPdf(voucher.hotelDetails.policies, { fontSize: 9.5, color: "#334155", lineHeight: 1.3 })}
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Reserva Protegida por {agency.name}</Text>
            <Text style={styles.footerText}>Pág. 1</Text>
          </View>
        </Page>
      ) : null}

      {/* PAGE 2: FLIGHT VOUCHER */}
      {voucher.flightDetails?.airline && (mode === "full" || mode === "flight") ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.headerContainer}>
            {agency.logoUrl ? (
              <Image src={agency.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>{agency.name}</Text>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.agencyName}>{agency.name}</Text>
              <Text style={styles.agencyDetails}>NIT: {agency.nit}</Text>
              <Text style={styles.agencyDetails}>Tel: {agency.phone}</Text>
              <Text style={styles.agencyDetails}>{agency.email}</Text>
            </View>
          </View>

          <View style={styles.titleBar}>
            <Text style={styles.titleText}>Voucher de Transporte Aéreo</Text>
          </View>

          <View style={[styles.pnrBox, { marginVertical: 6, padding: 8 }]}>
            <Text style={{ fontSize: 9, textTransform: "uppercase", fontWeight: "bold", color: "#94a3b8" }}>
              Código de Reserva (PNR)
            </Text>
            <Text style={[styles.pnrText, { fontSize: 20, marginTop: 2 }]}>{voucher.flightDetails.pnr || "---"}</Text>
          </View>

          <View style={[styles.mainCard, { padding: 8, marginBottom: 8, marginTop: 0 }]}>
            <Text style={[styles.label, { color: "#1e3a8a", marginBottom: 3, fontSize: 8.5 }]}>
              Pasajeros / Huéspedes:
            </Text>
            {travelersList.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {travelersList.map((t: any, idx: number) => (
                  <View
                    key={t.id || idx}
                    style={{
                      width: travelersList.length > 1 ? "50%" : "100%",
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 2,
                    }}
                  >
                    <Text style={[styles.value, { fontSize: 9, width: 16, color: "#f97316", fontWeight: "bold" }]}>
                      {idx + 1}.
                    </Text>
                    <Text style={[styles.value, { fontSize: 9, color: "#1e293b" }]}>
                      {t.firstName} {t.lastName || ""}
                    </Text>
                    {t.idNumber ? (
                      <Text style={{ fontSize: 8, color: "#64748b", marginLeft: 4 }}>
                        ({t.idType || "Doc"}: {t.idNumber})
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.value, { fontSize: 9, color: "#1e293b" }]}>
                {voucher.hotelDetails?.reservationHolder || "Según reserva"}
              </Text>
            )}
          </View>

          <View style={styles.mainCard}>
            <Text style={[styles.welcomeText, { color: "#f97316", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }]}>
              Vuelo de Ida
            </Text>
            <View style={styles.grid}>
              <View style={styles.gridColHalf}>
                <Text style={styles.label}>Aerolínea</Text>
                <Text style={styles.value}>{voucher.flightDetails.airline}</Text>
              </View>
              <View style={styles.gridColHalf}>
                <Text style={styles.label}>Número de Vuelo</Text>
                <Text style={styles.value}>{voucher.flightDetails.flightNumber || "---"}</Text>
              </View>
              <View style={styles.gridColHalf}>
                <Text style={styles.label}>Ruta de Viaje</Text>
                <Text style={styles.value}>
                  {voucher.flightDetails.departureCity} a {voucher.flightDetails.arrivalCity}
                </Text>
              </View>
              <View style={styles.gridColHalf}>
                <Text style={styles.label}>Fecha y Hora de Salida</Text>
                <Text style={styles.value}>
                  {voucher.flightDetails.departureDate}
                  {voucher.flightDetails.departureTime ? ` a las ${voucher.flightDetails.departureTime}` : ""}
                </Text>
              </View>
            </View>

            {voucher.flightDetails.returnDate ? (
              <>
                <View style={styles.divider} />
                <Text style={[styles.welcomeText, { color: "#1e3a8a", fontSize: 11, marginBottom: 8, marginTop: 4, textTransform: "uppercase" }]}>
                  Vuelo de Regreso
                </Text>
                <View style={styles.grid}>
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Aerolínea de Regreso</Text>
                    <Text style={styles.value}>
                      {voucher.flightDetails.returnAirline || voucher.flightDetails.airline}
                    </Text>
                  </View>
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Número de Vuelo</Text>
                    <Text style={styles.value}>{voucher.flightDetails.returnFlightNumber || "---"}</Text>
                  </View>
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Ruta de Viaje</Text>
                    <Text style={styles.value}>
                      {voucher.flightDetails.arrivalCity} a {voucher.flightDetails.departureCity}
                    </Text>
                  </View>
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Fecha y Hora de Regreso</Text>
                    <Text style={styles.value}>
                      {voucher.flightDetails.returnDate}
                      {voucher.flightDetails.returnTime ? ` a las ${voucher.flightDetails.returnTime}` : ""}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          <Text style={styles.sectionHeader}>Instrucciones de Vuelo</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                Preséntese en el aeropuerto con un mínimo de 3 horas de anticipación para vuelos internacionales y 2
                horas para vuelos nacionales.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                Realice el Web Check-In de la aerolínea 24 horas antes de la salida programada.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                Verifique las dimensiones y peso permitidos de equipaje de bodega y de mano de la aerolínea.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Generado por {agency.name}</Text>
            <Text style={styles.footerText}>Pág. 2</Text>
          </View>
        </Page>
      ) : null}

      {/* PAGE 3: TRANSFERS VOUCHER */}
      {voucher.transfers && voucher.transfers.length > 0 && (mode === "full" || mode === "transfers") ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.headerContainer}>
            {agency.logoUrl ? (
              <Image src={agency.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>{agency.name}</Text>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.agencyName}>{agency.name}</Text>
              <Text style={styles.agencyDetails}>NIT: {agency.nit}</Text>
              <Text style={styles.agencyDetails}>Tel: {agency.phone}</Text>
              <Text style={styles.agencyDetails}>{agency.email}</Text>
            </View>
          </View>

          <View style={styles.titleBar}>
            <Text style={styles.titleText}>Voucher de Traslados</Text>
          </View>

          <View style={[styles.mainCard, { padding: 10, marginBottom: 12 }]}>
            <Text style={styles.label}>Pasajeros / Titular de la Reserva</Text>
            {travelersList.length > 0 ? (
              <View style={{ marginTop: 4 }}>
                {travelersList.map((t: any, idx: number) => (
                  <View
                    key={t.id || idx}
                    style={{ flexDirection: "row", alignItems: "center", marginTop: idx > 0 ? 3 : 1 }}
                  >
                    <Text style={[styles.value, { fontSize: 9.5, width: 18, color: "#f97316", fontWeight: "bold" }]}>
                      {idx + 1}.
                    </Text>
                    <Text style={[styles.value, { fontSize: 9.5, color: "#1e293b" }]}>
                      {t.firstName} {t.lastName || ""}
                    </Text>
                    {t.idNumber ? (
                      <Text style={{ fontSize: 9, color: "#64748b", marginLeft: 6 }}>
                        ({t.idType || "Doc"}: {t.idNumber})
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.value, { fontSize: 10, marginTop: 3 }]}>
                {voucher.hotelDetails?.reservationHolder || "Según reserva"}
              </Text>
            )}
          </View>

          {voucher.transfers.map((tr: any, idx: number) => (
            <View key={tr.id || idx} style={styles.mainCard}>
              <Text style={[styles.label, { color: "#f97316", fontSize: 11, marginBottom: 4 }]}>
                {tr.type === "airport-hotel"
                  ? "TRASLADO: AEROPUERTO ➔ HOTEL"
                  : tr.type === "hotel-airport"
                  ? "TRASLADO: HOTEL ➔ AEROPUERTO"
                  : `TRASLADO #${idx + 1}`}
              </Text>
              <View style={styles.grid}>
                <View style={styles.gridColHalf}>
                  <Text style={styles.label}>Punto de Recogida</Text>
                  <Text style={styles.value}>{tr.pickupLocation || "N/A"}</Text>
                </View>
                <View style={styles.gridColHalf}>
                  <Text style={styles.label}>Punto de Destino</Text>
                  <Text style={styles.value}>{tr.dropoffLocation || "N/A"}</Text>
                </View>
                <View style={styles.gridColHalf}>
                  <Text style={styles.label}>Fecha de Recogida</Text>
                  <Text style={styles.value}>{formatDateSpanish(tr.pickupDate)}</Text>
                </View>
                <View style={styles.gridColHalf}>
                  <Text style={styles.label}>Hora de Recogida</Text>
                  <Text style={styles.value}>{tr.pickupTime || "Por confirmar con operador"}</Text>
                </View>
                {tr.provider ? (
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Operador / Proveedor</Text>
                    <Text style={styles.value}>{tr.provider}</Text>
                  </View>
                ) : null}
                {tr.vehicleType ? (
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Tipo de Vehículo</Text>
                    <Text style={styles.value}>{tr.vehicleType}</Text>
                  </View>
                ) : null}
              </View>
              {tr.notes ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.label}>Notas adicionales</Text>
                  <Text style={[styles.value, { fontWeight: "normal", fontSize: 9.5 }]}>{tr.notes}</Text>
                </View>
              ) : null}
            </View>
          ))}

          <Text style={styles.sectionHeader}>Instrucciones de Traslado</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                El conductor o representante del operador llevará un cartel con el nombre del titular de la reserva.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                Para recogidas en aeropuerto, diríjase a la salida principal tras reclamar el equipaje.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                Estar atento en el lobby del hotel con 15 minutos de antelación a la hora indicada.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Generado por {agency.name}</Text>
            <Text style={styles.footerText}>Traslados</Text>
          </View>
        </Page>
      ) : null}

      {/* PAGE 4: ACTIVITIES VOUCHER */}
      {voucher.activities && voucher.activities.length > 0 && (mode === "full" || mode === "activities") ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.headerContainer}>
            {agency.logoUrl ? (
              <Image src={agency.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>{agency.name}</Text>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.agencyName}>{agency.name}</Text>
              <Text style={styles.agencyDetails}>NIT: {agency.nit}</Text>
              <Text style={styles.agencyDetails}>Tel: {agency.phone}</Text>
              <Text style={styles.agencyDetails}>{agency.email}</Text>
            </View>
          </View>

          <View style={styles.titleBar}>
            <Text style={styles.titleText}>Voucher de Actividades y Tours</Text>
          </View>

          <View style={[styles.mainCard, { padding: 10, marginBottom: 12 }]}>
            <Text style={styles.label}>Pasajeros Registrados</Text>
            {travelersList.length > 0 ? (
              <View style={{ marginTop: 4 }}>
                {travelersList.map((t: any, idx: number) => (
                  <View
                    key={t.id || idx}
                    style={{ flexDirection: "row", alignItems: "center", marginTop: idx > 0 ? 3 : 1 }}
                  >
                    <Text style={[styles.value, { fontSize: 9.5, width: 18, color: "#f97316", fontWeight: "bold" }]}>
                      {idx + 1}.
                    </Text>
                    <Text style={[styles.value, { fontSize: 9.5, color: "#1e293b" }]}>
                      {t.firstName} {t.lastName || ""}
                    </Text>
                    {t.idNumber ? (
                      <Text style={{ fontSize: 9, color: "#64748b", marginLeft: 6 }}>
                        ({t.idType || "Doc"}: {t.idNumber})
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.value, { fontSize: 10, marginTop: 3 }]}>
                {voucher.hotelDetails?.reservationHolder || "Según reserva"}
              </Text>
            )}
          </View>

          {voucher.activities.map((act: any, idx: number) => (
            <View key={act.id || idx} style={styles.mainCard}>
              <Text style={[styles.welcomeText, { color: "#1e3a8a", fontSize: 12, marginBottom: 6 }]}>
                {act.title || `Actividad #${idx + 1}`}
              </Text>
              <View style={styles.grid}>
                <View style={styles.gridColHalf}>
                  <Text style={styles.label}>Fecha Programada</Text>
                  <Text style={styles.value}>{formatDateSpanish(act.date)}</Text>
                </View>
                <View style={styles.gridColHalf}>
                  <Text style={styles.label}>Hora de Inicio</Text>
                  <Text style={styles.value}>{act.time || "Por confirmar"}</Text>
                </View>
                {act.location ? (
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Punto de Encuentro</Text>
                    <Text style={styles.value}>{act.location}</Text>
                  </View>
                ) : null}
                {act.provider ? (
                  <View style={styles.gridColHalf}>
                    <Text style={styles.label}>Operador del Tour</Text>
                    <Text style={styles.value}>{act.provider}</Text>
                  </View>
                ) : null}
              </View>
              {act.description ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.label}>Descripción / Detalles</Text>
                  <Text style={[styles.value, { fontWeight: "normal", fontSize: 9.5, color: "#334155" }]}>
                    {act.description}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}

          <Text style={styles.sectionHeader}>Recomendaciones para Actividades</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                Presentar este voucher impreso o digital al operador en el punto de encuentro.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>Llegar 15 minutos antes de la hora acordada para la actividad.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                Llevar documento de identidad original y ropa/equipo adecuado para el tour.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Generado por {agency.name}</Text>
            <Text style={styles.footerText}>Actividades</Text>
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
