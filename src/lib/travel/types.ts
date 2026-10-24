export type TravelCurrency = "COP" | "USD" | "EUR";

export type TravelItemType =
  | "Flight"
  | "Hotel"
  | "Activity"
  | "Transfer"
  | "Insurance"
  | "Other";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "completed";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "emitted"
  | "operating"
  | "completed"
  | "cancelled";

export interface FlightDetails {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  cabin: "Economica" | "Premium Economy" | "Ejecutiva" | "Primera Clase";
  baggageAllowance?: string;
}

export interface HotelDetails {
  hotelName: string;
  address: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  boardBasis:
    | "Solo Habitacion"
    | "Desayuno"
    | "Media Pension"
    | "Pension Completa"
    | "Todo Incluido";
  stars?: number;
  phone?: string;
}

export interface TransferDetails {
  pickupPoint: string;
  dropoffPoint: string;
  date: string;
  time: string;
  vehicleType: string;
  passengers: number;
}

export interface TravelItineraryItem {
  id: string;
  type: TravelItemType;
  title: string;
  description: string;
  netPrice: number;
  markup: number;
  totalPrice: number;
  pricePerPerson?: boolean;
  netPriceAdult?: number;
  netPriceChild?: number;
  markupAdult?: number;
  markupChild?: number;

  pnr?: string;
  confirmationNo?: string;
  locator?: string;
  imageUrl?: string;
  provider?: string;
  supplierPaymentStatus?: "pending" | "paid";
  supplierPaymentDate?: string;
  supplierPaymentMethod?: string;
  supplierPaymentReference?: string;
  supplierPaymentNotes?: string;

  flightDetails?: FlightDetails;
  hotelDetails?: HotelDetails;
  transferDetails?: TransferDetails;
  assignedOptions?: ("A" | "B" | "C" | "Shared")[];
}

export interface TravelDay {
  id: string;
  dayNumber: number;
  items: TravelItineraryItem[];
}

export interface TravelInstallment {
  id: string;
  code?: string;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "partial";
}

export interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
  idType: string;
  idNumber: string;
  eps?: string;
  phone?: string;
  email?: string;
  originCity?: string;
  vaccines?: string;
  observations?: string;
  birthDate?: string;
  type?: "ADULTO" | "NIÑO" | "INFANTE";
}

export interface TransferDetail {
  id: string;
  type: "airport-hotel" | "hotel-airport" | "custom";
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  vehicleType?: string;
  provider?: string;
  notes?: string;
}

export interface ActivityDetail {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration?: string;
  location?: string;
  provider?: string;
  notes?: string;
}

export interface TravelSupplierNegotiatedRate {
  description: string;
  rate: number;
  currency: TravelCurrency;
  validUntil: string;
}

export interface TravelSupplierHotelMeta {
  checkInTime?: string;
  checkOutTime?: string;
  hotelAddress?: string;
  hotelPhoneCode?: string;
  hotelPhone?: string;
  hotelPolicies?: string;
}

export type TravelSupplierType =
  | "hotel"
  | "airline"
  | "operator"
  | "transport"
  | "insurance"
  | "other";

export interface TravelSupplier {
  id: string;
  organizationId: string;
  name: string;
  type: TravelSupplierType;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  negotiatedRates?: TravelSupplierNegotiatedRate[] | null;
  commission?: number | null;
  sla?: string | null;
  rating?: number | null;
  notes?: string | null;
  active: boolean;
  operatingCities?: string[] | null;
  hotelMeta?: TravelSupplierHotelMeta | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyBranding {
  nit?: string;
  rnt?: string;
  slogan?: string;
  bankEntity?: string;
  bankAccount?: string;
  phone?: string;
  phone2?: string;
  address?: string;
  city?: string;
  email?: string;
  email2?: string;
  website?: string;
  advisorName?: string;
  generalPolicies?: string;
  bookingConfirmation?: string;
  profitability?: number;
  freelanceCommission?: number;
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
