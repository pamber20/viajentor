/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type { PdfAgencyInfo } from "./types";
import { resolvePdfAgencyInfo } from "./types";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelPaymentDto, TravelVoucherDto } from "@/server/travel/trips";

export async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("data:")) return imageUrl;

  try {
    const res = await fetch(imageUrl, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Error fetching image for Base64 conversion:", err);
    return imageUrl;
  }
}

export async function fetchCurrentAgencyInfo(): Promise<PdfAgencyInfo> {
  try {
    const res = await fetch("/api/settings/branding");
    if (res.ok) {
      const data = await res.json();
      const branding = data?.branding;
      return resolvePdfAgencyInfo(
        {
          name: branding?.name,
          ...branding?.agency,
          theme: {
            primaryColor: branding?.accent,
            pdfNavy: branding?.accent,
            ...branding?.agency?.theme,
          },
        },
        { name: branding?.name, logo: branding?.logo || branding?.favicon }
      );
    }
  } catch (e) {
    console.warn("Could not fetch agency branding, using default:", e);
  }
  return resolvePdfAgencyInfo(null);
}

export async function downloadQuotePdf(
  quote: TravelQuoteDto,
  agencyOverride?: Partial<PdfAgencyInfo>,
  payments?: TravelPaymentDto[]
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const { QuotePDF } = await import("./quote-pdf");

  const baseAgency = agencyOverride ? resolvePdfAgencyInfo(agencyOverride) : await fetchCurrentAgencyInfo();

  let logoUrl = baseAgency.logoUrl;
  if (logoUrl && !logoUrl.startsWith("data:")) {
    try {
      logoUrl = await getBase64ImageFromUrl(logoUrl);
    } catch {
      // ignore
    }
  }

  const finalAgency: PdfAgencyInfo = {
    ...baseAgency,
    logoUrl,
    advisorName: quote.advisorName || baseAgency.advisorName,
  };

  const filename = quote.isBooking
    ? `Reserva_${quote.bookingNumber || quote.quoteNumber || "Viaje"}.pdf`
    : `Cotizacion_${quote.quoteNumber || "Viaje"}.pdf`;

  const blob = await pdf(
    React.createElement(QuotePDF, {
      quote,
      agency: finalAgency,
      currentUser: quote.advisorName || finalAgency.advisorName,
      payments,
    }) as any
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadReceiptPdf(
  payment: TravelPaymentDto | any,
  quote: TravelQuoteDto | any,
  agencyOverride?: Partial<PdfAgencyInfo>
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const { ReceiptPDF } = await import("./receipt-pdf");

  const baseAgency = agencyOverride ? resolvePdfAgencyInfo(agencyOverride) : await fetchCurrentAgencyInfo();

  let logoUrl = baseAgency.logoUrl;
  if (logoUrl && !logoUrl.startsWith("data:")) {
    try {
      logoUrl = await getBase64ImageFromUrl(logoUrl);
    } catch {
      // ignore
    }
  }

  const finalAgency: PdfAgencyInfo = {
    ...baseAgency,
    logoUrl,
  };

  const receiptNum = payment.receiptNumber || (payment.id ? payment.id.slice(0, 6).toUpperCase() : "Pago");
  const filename = `Recibo_Caja_${receiptNum}.pdf`;

  const blob = await pdf(
    React.createElement(ReceiptPDF, {
      payment,
      quote,
      agency: finalAgency,
    }) as any
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadVoucherPdf(
  voucher: TravelVoucherDto | any,
  agencyOverride?: Partial<PdfAgencyInfo>,
  mode: "full" | "hotel" | "flight" | "transfers" | "activities" = "full"
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const { VoucherPDF } = await import("./voucher-pdf");

  const baseAgency = agencyOverride ? resolvePdfAgencyInfo(agencyOverride) : await fetchCurrentAgencyInfo();

  let logoUrl = baseAgency.logoUrl;
  if (logoUrl && !logoUrl.startsWith("data:")) {
    try {
      logoUrl = await getBase64ImageFromUrl(logoUrl);
    } catch {
      // ignore
    }
  }

  const finalAgency: PdfAgencyInfo = {
    ...baseAgency,
    logoUrl,
  };

  const filename = `Voucher_${voucher.voucherNumber || "Turistico"}.pdf`;

  const blob = await pdf(
    React.createElement(VoucherPDF, {
      voucher,
      agency: finalAgency,
      mode,
    }) as any
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
