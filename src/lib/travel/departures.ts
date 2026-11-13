import type {
  TravelDay,
  TravelInstallment,
  TravelItineraryItem,
  TravelPackageDeparture,
} from "./types";

function newId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Returns today's YYYY-MM-DD in UTC (or Colombia local if needed; ISO date string comparison).
 */
export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns true when `startDate` is a valid YYYY-MM-DD strictly before `referenceDate` (defaults to today).
 */
export function isDeparturePast(
  startDate?: string | null,
  referenceDate: string = getTodayIsoDate(),
): boolean {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return false;
  return startDate < referenceDate;
}

/**
 * Normalizes a list of departures or synthesizes a single legacy departure from package-level fields.
 */
export function resolvePackageDepartures(pkg: {
  startDate?: string | null;
  endDate?: string | null;
  nights?: number | null;
  days?: TravelDay[] | null;
  selectedHotelId?: string | null;
  amortizationSchedule?: TravelInstallment[] | null;
  departures?: TravelPackageDeparture[] | null;
  status?: string | null;
}): TravelPackageDeparture[] {
  if (Array.isArray(pkg.departures) && pkg.departures.length > 0) {
    return pkg.departures.map((dep, idx) => ({
      id: dep.id || `dep-${idx + 1}`,
      startDate: dep.startDate ?? "",
      endDate: dep.endDate ?? "",
      nights: Number(dep.nights ?? 0),
      days: Array.isArray(dep.days) ? dep.days : [],
      selectedHotelId: dep.selectedHotelId ?? null,
      amortizationSchedule: Array.isArray(dep.amortizationSchedule)
        ? dep.amortizationSchedule
        : [],
      spots:
        dep.spots === null || dep.spots === undefined || dep.spots === ("" as unknown)
          ? null
          : Number(dep.spots),
      status: dep.status === "closed" ? "closed" : "active",
      ...(dep.totals ? { totals: dep.totals } : {}),
    }));
  }

  return [
    {
      id: "default",
      startDate: pkg.startDate ?? "",
      endDate: pkg.endDate ?? "",
      nights: Number(pkg.nights ?? 0),
      days: Array.isArray(pkg.days) ? pkg.days : [],
      selectedHotelId: pkg.selectedHotelId ?? null,
      amortizationSchedule: Array.isArray(pkg.amortizationSchedule)
        ? pkg.amortizationSchedule
        : [],
      spots: null,
      status: pkg.status === "inactive" ? "closed" : "active",
    },
  ];
}

/**
 * Filters out closed and past departures. Used for the AI catalog and the quote package selector.
 */
export function getActiveFutureDepartures(
  departures: TravelPackageDeparture[],
  referenceDate: string = getTodayIsoDate(),
): TravelPackageDeparture[] {
  return departures.filter(
    (dep) => dep.status !== "closed" && !isDeparturePast(dep.startDate, referenceDate),
  );
}

/**
 * Computes the lowest adult/total price across active future departures (or all departures if none are future/active).
 */
export function getLowestDepartureAdultPrice(
  departures: TravelPackageDeparture[],
  referenceDate?: string,
): number | null {
  const activeFuture = getActiveFutureDepartures(departures, referenceDate);
  const pool = activeFuture.length > 0 ? activeFuture : departures;
  let minPrice: number | null = null;

  for (const dep of pool) {
    const totals = dep.totals;
    if (!totals) continue;
    const candidates: number[] = [];
    if (Array.isArray(totals.byHotel) && totals.byHotel.length > 0) {
      for (const opt of totals.byHotel) {
        if (typeof opt.totalAdult === "number" && Number.isFinite(opt.totalAdult) && opt.totalAdult > 0) {
          candidates.push(opt.totalAdult);
        } else if (typeof opt.total === "number" && Number.isFinite(opt.total) && opt.total > 0) {
          candidates.push(opt.total);
        }
      }
    } else if (typeof totals.totalAdult === "number" && Number.isFinite(totals.totalAdult) && totals.totalAdult > 0) {
      candidates.push(totals.totalAdult);
    } else if (typeof totals.finalTotal === "number" && Number.isFinite(totals.finalTotal) && totals.finalTotal > 0) {
      candidates.push(totals.finalTotal);
    }

    for (const price of candidates) {
      if (minPrice === null || price < minPrice) {
        minPrice = price;
      }
    }
  }

  return minPrice;
}

/**
 * Computes the integer day difference (`toDate - fromDate`) between two YYYY-MM-DD strings.
 */
export function diffIsoDays(fromDate?: string | null, toDate?: string | null): number {
  if (
    !fromDate ||
    !toDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
  ) {
    return 0;
  }
  const fromMs = Date.parse(`${fromDate}T00:00:00Z`);
  const toMs = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  return Math.round((toMs - fromMs) / 86_400_000);
}

/**
 * Shifts a YYYY-MM-DD date string by `deltaDays` in UTC. Returns original value if empty/invalid.
 */
export function shiftIsoDate(isoDate: string | undefined, deltaDays: number): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || deltaDays === 0) {
    return isoDate ?? "";
  }
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(ms)) return isoDate;
  const shifted = new Date(ms + deltaDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Deep-clones `days` with fresh IDs and shifts item dates (`flightDetails`, `hotelDetails`, `transferDetails`)
 * from `fromStartDate` to `toStartDate`. Preserves all prices so the user can edit them per departure.
 */
export function shiftDaysToDeparture(params: {
  days: TravelDay[];
  fromStartDate?: string | null;
  toStartDate?: string | null;
  targetNights?: number | null;
}): TravelDay[] {
  const { days, fromStartDate, toStartDate, targetNights } = params;
  const deltaDays = diffIsoDays(fromStartDate, toStartDate);

  const cloned: TravelDay[] = (days || []).map((day, idx) => ({
    id: newId("day"),
    dayNumber: day.dayNumber ?? idx + 1,
    items: (day.items || []).map((item): TravelItineraryItem => {
      const next: TravelItineraryItem = {
        ...item,
        id: newId("item"),
      };
      if (item.flightDetails) {
        next.flightDetails = {
          ...item.flightDetails,
          departureDate: shiftIsoDate(item.flightDetails.departureDate, deltaDays),
          arrivalDate: shiftIsoDate(item.flightDetails.arrivalDate, deltaDays),
        };
      }
      if (item.hotelDetails) {
        next.hotelDetails = {
          ...item.hotelDetails,
          checkIn: shiftIsoDate(item.hotelDetails.checkIn, deltaDays),
          checkOut: shiftIsoDate(item.hotelDetails.checkOut, deltaDays),
        };
      }
      if (item.transferDetails) {
        next.transferDetails = {
          ...item.transferDetails,
          date: shiftIsoDate(item.transferDetails.date, deltaDays),
        };
      }
      if (item.assignedOptions) {
        next.assignedOptions = [...item.assignedOptions];
      }
      return next;
    }),
  }));

  if (typeof targetNights === "number" && Number.isFinite(targetNights) && targetNights >= 0) {
    const desiredDays = Math.max(1, targetNights + 1);
    while (cloned.length < desiredDays) {
      cloned.push({
        id: newId("day"),
        dayNumber: cloned.length + 1,
        items: [],
      });
    }
    if (cloned.length > desiredDays) {
      cloned.length = desiredDays;
    }
  }

  return cloned.map((d, i) => ({ ...d, dayNumber: i + 1 }));
}

export function formatDepartureRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return "Sin fechas";
  if (startDate && endDate) return `${startDate} al ${endDate}`;
  return startDate || endDate || "Sin fechas";
}

export type ResolveDepartureResult =
  | { ok: true; departure: TravelPackageDeparture }
  | {
      ok: false;
      reason:
        | "no_active_future_departures"
        | "departure_not_found"
        | "departure_unavailable"
        | "departure_required";
    };

/**
 * Resolves and validates the target departure for a quote (e.g., AI `create_quote`).
 * - Rejects closed or past departures.
 * - Requires `requestedDepartureId` when the package has more than 1 active future departure.
 */
export function resolveDepartureForQuote(
  pkg: Parameters<typeof resolvePackageDepartures>[0],
  requestedDepartureId?: string | null,
  referenceDate: string = getTodayIsoDate(),
): ResolveDepartureResult {
  const allDeps = resolvePackageDepartures(pkg);
  const activeFutureDeps = getActiveFutureDepartures(allDeps, referenceDate);

  if (activeFutureDeps.length === 0) {
    return { ok: false, reason: "no_active_future_departures" };
  }

  if (requestedDepartureId && requestedDepartureId.trim()) {
    const reqId = requestedDepartureId.trim();
    const match = allDeps.find((d) => d.id === reqId);
    if (!match) {
      return { ok: false, reason: "departure_not_found" };
    }
    if (match.status === "closed" || isDeparturePast(match.startDate, referenceDate)) {
      return { ok: false, reason: "departure_unavailable" };
    }
    return { ok: true, departure: match };
  }

  if (activeFutureDeps.length > 1) {
    return { ok: false, reason: "departure_required" };
  }

  return { ok: true, departure: activeFutureDeps[0]! };
}
