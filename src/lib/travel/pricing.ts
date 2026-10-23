import type {
  AgencyBranding,
  TravelDay,
  TravelInstallment,
} from "./types";

export interface PricingQuoteInput {
  passengers: number;
  childPassengers?: number;
  currency: string;
  markupPercentage?: number;
  taxes?: number;
  agencyCommission?: number;
  administrativeFee?: number;
  profitability?: number;
  days: TravelDay[];
}

export function getProfitabilityDivisor(
  profitabilityValue: number | undefined,
  agencyProfitability: number | undefined
): number {
  const val =
    profitabilityValue !== undefined && profitabilityValue > 0
      ? profitabilityValue
      : agencyProfitability !== undefined && agencyProfitability > 0
        ? agencyProfitability
        : 0.75;

  if (val > 0 && val < 1) {
    return val;
  }

  // Si es >= 1 (ej: 25%), divisor = 1 - 0.25 = 0.75
  const marginPercent = val;
  const divisor = marginPercent >= 100 ? 0.01 : 1 - marginPercent / 100;
  return divisor;
}

export interface DetailedOptionTotals {
  subtotal: number;
  hotelSubtotal: number;
  otherSubtotal: number;
  markupAmount: number;
  taxAmount: number;
  commissionAmount: number;
  total: number;
  totalAdult: number;
  totalChild: number;
  flightsTotal: number;
  byHotel: {
    hotelId: string;
    hotelTitle: string;
    hotelSubtotal: number;
    flightsTotal: number;
    otherSubtotal: number;
    markupAmount: number;
    taxAmount: number;
    commissionAmount: number;
    total: number;
    totalAdult: number;
    totalChild: number;
  }[];
}

export interface DetailedQuoteTotals extends DetailedOptionTotals {
  finalTotal: number;
  options: {
    A: DetailedOptionTotals;
    B: DetailedOptionTotals;
    C: DetailedOptionTotals;
  };
}

export function calculateDetailedQuoteTotals(
  quote: PricingQuoteInput,
  agency?: AgencyBranding | null
): DetailedQuoteTotals {
  const divisor = getProfitabilityDivisor(
    quote.profitability,
    agency?.profitability
  );
  const adults = quote.passengers || 1;
  const children = quote.childPassengers || 0;
  const totalPax = adults + children;
  const taxesRate = (quote.taxes || 0) / 100;
  const commissionRate = (quote.agencyCommission || 0) / 100;
  const adminFeeTotal = (quote.administrativeFee || 0) * totalPax;

  const calculateForOption = (optionId: "A" | "B" | "C"): DetailedOptionTotals => {
    let flightsTotal = 0;
    const hotels: { id: string; title: string; price: number }[] = [];
    let otherTotal = 0;

    quote.days?.forEach((day) => {
      day.items?.forEach((item) => {
        const isAssigned =
          !item.assignedOptions ||
          item.assignedOptions.includes("Shared") ||
          item.assignedOptions.includes(optionId);

        if (isAssigned) {
          if (item.type === "Flight") {
            flightsTotal += item.totalPrice || 0;
          } else if (item.type === "Hotel") {
            hotels.push({
              id: item.id,
              title: item.title,
              price: item.totalPrice || 0,
            });
          } else {
            otherTotal += item.totalPrice || 0;
          }
        }
      });
    });

    const byHotel = hotels.map((hotel) => {
      const markupAmount = hotel.price / divisor - hotel.price;
      const withMarkup = flightsTotal + (hotel.price + markupAmount) + otherTotal;
      const taxAmount = withMarkup * taxesRate;
      const commissionAmount = withMarkup * commissionRate;
      const total = withMarkup + taxAmount + commissionAmount + adminFeeTotal;

      let adultBase = 0;
      let childBase = 0;

      quote.days?.forEach((day) => {
        day.items?.forEach((item) => {
          const isAssigned =
            !item.assignedOptions ||
            item.assignedOptions.includes("Shared") ||
            item.assignedOptions.includes(optionId);

          if (isAssigned) {
            if (item.id === hotel.id) {
              const hotelTotalPriceWithMarkup = hotel.price + markupAmount;
              if (item.pricePerPerson) {
                const rawNetAdult = item.netPriceAdult || 0;
                const rawNetChild = item.netPriceChild || 0;
                const rawMarkAdult = item.markupAdult || 0;
                const rawMarkChild = item.markupChild || 0;

                const baseAdultVal = (rawNetAdult + rawMarkAdult) * adults;
                const baseChildVal = (rawNetChild + rawMarkChild) * children;
                const baseTotal = baseAdultVal + baseChildVal;

                if (baseTotal > 0) {
                  const ratioAdult = baseAdultVal / baseTotal;
                  const ratioChild = baseChildVal / baseTotal;
                  adultBase += hotelTotalPriceWithMarkup * ratioAdult;
                  childBase += hotelTotalPriceWithMarkup * ratioChild;
                } else {
                  adultBase += hotelTotalPriceWithMarkup * (adults / totalPax);
                  childBase += hotelTotalPriceWithMarkup * (children / totalPax);
                }
              } else {
                adultBase += hotelTotalPriceWithMarkup;
              }
            } else {
              if (item.pricePerPerson) {
                const netAdult =
                  item.netPriceAdult !== undefined
                    ? item.netPriceAdult
                    : item.netPrice || 0;
                const netChild = item.netPriceChild || 0;
                const markAdult = item.markupAdult || 0;
                const markChild = item.markupChild || 0;

                if (item.type === "Insurance") {
                  adultBase += (netAdult + markAdult) * adults;
                  childBase += (netAdult + markAdult) * children;
                } else {
                  adultBase += (netAdult + markAdult) * adults;
                  childBase += (netChild + markChild) * children;
                }
              } else {
                adultBase += item.totalPrice || 0;
              }
            }
          }
        });
      });

      const totalBase = adultBase + childBase;
      let totalAdult = 0;
      let totalChild = 0;

      if (totalBase > 0) {
        totalAdult = total * (adultBase / totalBase);
        totalChild = total * (childBase / totalBase);
      } else {
        totalAdult = total;
        totalChild = 0;
      }

      return {
        hotelId: hotel.id,
        hotelTitle: hotel.title,
        hotelSubtotal: hotel.price,
        flightsTotal,
        otherSubtotal: otherTotal,
        markupAmount,
        taxAmount,
        commissionAmount,
        total,
        totalAdult,
        totalChild,
      };
    });

    const hotelSubtotal = hotels.reduce((sum, h) => sum + h.price, 0);
    const otherSubtotal = flightsTotal + otherTotal;
    const subtotal = hotelSubtotal + otherSubtotal;
    const markupAmount = hotelSubtotal / divisor - hotelSubtotal;
    const withMarkup = hotelSubtotal + markupAmount + otherSubtotal;
    const taxAmount = withMarkup * taxesRate;
    const commissionAmount = withMarkup * commissionRate;
    const total = withMarkup + taxAmount + commissionAmount + adminFeeTotal;

    let genAdultBase = 0;
    let genChildBase = 0;

    quote.days?.forEach((day) => {
      day.items?.forEach((item) => {
        const isAssigned =
          !item.assignedOptions ||
          item.assignedOptions.includes("Shared") ||
          item.assignedOptions.includes(optionId);

        if (isAssigned) {
          if (item.type === "Hotel") {
            const hotelMarkup = item.totalPrice / divisor - item.totalPrice;
            const hotelTotalWithMarkup = item.totalPrice + hotelMarkup;

            if (item.pricePerPerson) {
              const rawNetAdult = item.netPriceAdult || 0;
              const rawNetChild = item.netPriceChild || 0;
              const rawMarkAdult = item.markupAdult || 0;
              const rawMarkChild = item.markupChild || 0;

              const baseAdultVal = (rawNetAdult + rawMarkAdult) * adults;
              const baseChildVal = (rawNetChild + rawMarkChild) * children;
              const baseTotal = baseAdultVal + baseChildVal;

              if (baseTotal > 0) {
                genAdultBase += hotelTotalWithMarkup * (baseAdultVal / baseTotal);
                genChildBase += hotelTotalWithMarkup * (baseChildVal / baseTotal);
              } else {
                genAdultBase += hotelTotalWithMarkup * (adults / totalPax);
                genChildBase += hotelTotalWithMarkup * (children / totalPax);
              }
            } else {
              genAdultBase += hotelTotalWithMarkup;
            }
          } else {
            if (item.pricePerPerson) {
              const netAdult =
                item.netPriceAdult !== undefined
                  ? item.netPriceAdult
                  : item.netPrice || 0;
              const netChild = item.netPriceChild || 0;
              const markAdult = item.markupAdult || 0;
              const markChild = item.markupChild || 0;

              if (item.type === "Insurance") {
                genAdultBase += (netAdult + markAdult) * adults;
                genChildBase += (netAdult + markAdult) * children;
              } else {
                genAdultBase += (netAdult + markAdult) * adults;
                genChildBase += (netChild + markChild) * children;
              }
            } else {
              genAdultBase += item.totalPrice || 0;
            }
          }
        }
      });
    });

    const genTotalBase = genAdultBase + genChildBase;
    let genTotalAdult = 0;
    let genTotalChild = 0;

    if (genTotalBase > 0) {
      genTotalAdult = total * (genAdultBase / genTotalBase);
      genTotalChild = total * (genChildBase / genTotalBase);
    } else {
      genTotalAdult = total;
      genTotalChild = 0;
    }

    return {
      subtotal,
      hotelSubtotal,
      otherSubtotal,
      markupAmount,
      taxAmount,
      commissionAmount,
      total,
      totalAdult: genTotalAdult,
      totalChild: genTotalChild,
      byHotel,
      flightsTotal,
    };
  };

  const results = {
    A: calculateForOption("A"),
    B: calculateForOption("B"),
    C: calculateForOption("C"),
  };

  const finalTotal =
    (results.B.byHotel?.length || 0) > 1
      ? Math.min(...results.B.byHotel.map((h) => h.total))
      : results.B.total;

  return {
    ...results.B,
    total: results.B.total,
    finalTotal,
    options: results,
  };
}

export interface DistributedPayment {
  installmentId: string;
  code: string;
  amount: number;
}

export function distributePaymentToInstallments(
  installments: TravelInstallment[],
  paidMap: Record<string, number>,
  paymentAmount: number,
  targetInstallmentId?: string
): {
  distributions: DistributedPayment[];
  updatedInstallments: TravelInstallment[];
} {
  const targetIndex = targetInstallmentId
    ? installments.findIndex((inst) => inst.id === targetInstallmentId)
    : 0;

  const currentPaid = { ...paidMap };
  const distributions: DistributedPayment[] = [];
  let remaining = paymentAmount;
  let currentIndex = Math.max(0, targetIndex);

  while (remaining > 0 && currentIndex < installments.length) {
    const inst = installments[currentIndex]!;
    const code = inst.code || `Cuota #${currentIndex + 1}`;
    const alreadyPaid = currentPaid[inst.id] || 0;
    const balance = Math.max(0, inst.amount - alreadyPaid);
    const isLast = currentIndex === installments.length - 1;

    if (balance > 0 || isLast) {
      const allocated = isLast ? remaining : Math.min(remaining, balance);
      if (allocated > 0) {
        distributions.push({
          installmentId: inst.id,
          code,
          amount: allocated,
        });
        currentPaid[inst.id] = alreadyPaid + allocated;
        remaining -= allocated;
      }
    }
    currentIndex++;
  }

  const updatedInstallments = installments.map((inst) => {
    const totalPaidForInst = currentPaid[inst.id] || 0;
    const status: "paid" | "partial" | "pending" =
      totalPaidForInst >= inst.amount
        ? "paid"
        : totalPaidForInst > 0
          ? "partial"
          : "pending";
    return {
      ...inst,
      status,
    };
  });

  return {
    distributions,
    updatedInstallments,
  };
}

export function formatCurrency(amount: number, currency: string = "COP"): string {
  const rounded = Math.round(amount || 0);
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(rounded);
  }
  if (currency === "EUR") {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(rounded);
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(rounded);
}

export function generateAutoInstallments(
  totalAmount: number,
  numInstallments: number,
  frequency: "weekly" | "fortnightly" | "monthly" = "monthly",
  firstDate: string = new Date().toISOString().split("T")[0]!,
  generateIdFn: () => string = () => Math.random().toString(36).slice(2, 9)
): TravelInstallment[] {
  if (numInstallments <= 0 || totalAmount <= 0) return [];

  const baseAmount = Math.floor(totalAmount / numInstallments);
  const remainder = totalAmount - baseAmount * numInstallments;

  const installments: TravelInstallment[] = [];
  let curr = new Date(firstDate);
  if (isNaN(curr.getTime())) curr = new Date();

  for (let i = 0; i < numInstallments; i++) {
    const amount = i === numInstallments - 1 ? baseAmount + remainder : baseAmount;
    const dateStr = curr.toISOString().split("T")[0]!;

    installments.push({
      id: generateIdFn(),
      code: `Cuota ${i + 1}/${numInstallments}`,
      dueDate: dateStr,
      amount,
      status: "pending",
    });

    if (frequency === "weekly") {
      curr.setDate(curr.getDate() + 7);
    } else if (frequency === "fortnightly") {
      curr.setDate(curr.getDate() + 14);
    } else {
      curr.setMonth(curr.getMonth() + 1);
    }
  }

  return installments;
}
