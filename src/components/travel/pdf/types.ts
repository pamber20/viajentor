export interface PdfAgencyInfo {
  id?: string;
  name: string;
  nit: string;
  rnt?: string;
  phone: string;
  phone2?: string;
  address?: string;
  city?: string;
  email: string;
  email2?: string;
  website?: string;
  advisorName?: string;
  logoUrl?: string;
  bankEntity?: string;
  bankAccount?: string;
  generalPolicies?: string;
  bookingConfirmation?: string;
  slogan?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    pdfNavy?: string;
    pdfAccent?: string;
    pdfBackground?: string;
    pdfTextPrimary?: string;
    pdfTextSecondary?: string;
  };
}

export function resolvePdfAgencyInfo(
  agency?: Partial<PdfAgencyInfo> | null,
  orgFallback?: { name?: string; logo?: string | null }
): PdfAgencyInfo {
  const name = agency?.name || orgFallback?.name || "Agencia de Viajes";
  const rawLogo = agency?.logoUrl ?? orgFallback?.logo;
  const logoUrl =
    typeof rawLogo === "string" && rawLogo.trim().length > 0 ? rawLogo.trim() : undefined;

  return {
    id: agency?.id,
    name,
    nit: agency?.nit || "000000000-0",
    rnt: agency?.rnt,
    phone: agency?.phone || "",
    phone2: agency?.phone2,
    address: agency?.address || "",
    city: agency?.city || "",
    email: agency?.email || "",
    email2: agency?.email2,
    website: agency?.website,
    advisorName: agency?.advisorName,
    logoUrl,
    bankEntity: agency?.bankEntity,
    bankAccount: agency?.bankAccount,
    generalPolicies: agency?.generalPolicies,
    bookingConfirmation: agency?.bookingConfirmation,
    slogan: agency?.slogan,
    socialMedia: agency?.socialMedia,
    theme: {
      primaryColor: agency?.theme?.primaryColor || "#0B3B60",
      secondaryColor: agency?.theme?.secondaryColor || "#eab308",
      pdfNavy: agency?.theme?.pdfNavy || "#0B3B60",
      pdfAccent: agency?.theme?.pdfAccent || "#eab308",
      pdfBackground: agency?.theme?.pdfBackground || "#ffffff",
      pdfTextPrimary: agency?.theme?.pdfTextPrimary || "#334155",
      pdfTextSecondary: agency?.theme?.pdfTextSecondary || "#64748b",
      ...agency?.theme,
    },
  };
}
