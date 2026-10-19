import { useState, useEffect, useCallback } from "react";

export interface Airline {
  name: string;
  iata: string | null;
  icao: string | null;
  active: boolean;
}

export const FALLBACK_AIRLINES: Airline[] = [
  { name: "Avianca", iata: "AV", icao: "AVA", active: true },
  { name: "Copa Airlines", iata: "CM", icao: "CMP", active: true },
  { name: "LATAM Airlines", iata: "LA", icao: "LAN", active: true },
  { name: "Wingo", iata: "P5", icao: "RPB", active: true },
  { name: "Satena", iata: "9R", icao: "NSE", active: true },
  { name: "Clic Air (EasyFly)", iata: "VE", icao: "EFY", active: true },
  { name: "Iberia", iata: "IB", icao: "IBE", active: true },
  { name: "Air Europa", iata: "UX", icao: "AEA", active: true },
  { name: "Aeroméxico", iata: "AM", icao: "AMX", active: true },
  { name: "Volaris", iata: "Y4", icao: "VOI", active: true },
  { name: "Viva Aerobus", iata: "VB", icao: "VIV", active: true },
  { name: "JetSMART", iata: "JA", icao: "JAT", active: true },
  { name: "American Airlines", iata: "AA", icao: "AAL", active: true },
  { name: "Delta Air Lines", iata: "DL", icao: "DAL", active: true },
  { name: "United Airlines", iata: "UA", icao: "UAL", active: true },
  { name: "Spirit Airlines", iata: "NK", icao: "NKS", active: true },
  { name: "JetBlue", iata: "B6", icao: "JBU", active: true },
];

export const CITY_AIRPORT_MAP: Record<string, string> = {
  medellin: "Jose Maria Cordova (MDE)",
  bogota: "El Dorado (BOG)",
  cali: "Alfonso Bonilla Aragón (CLO)",
  cartagena: "Rafael Núñez (CTG)",
  "santa marta": "Simon Bolivar (SMR)",
  pereira: "Matecaña (PEI)",
  "san andres": "Gustavo Rojas Pinilla (ADZ)",
  cancun: "Aeropuerto Internacional de Cancún (CUN)",
  miami: "Miami International Airport (MIA)",
  madrid: "Adolfo Suárez Madrid–Barajas (MAD)",
  "punta cana": "Punta Cana International Airport (PUJ)",
  paris: "Charles de Gaulle (CDG)",
  orlando: "Orlando International Airport (MCO)",
  panama: "Tocumen International (PTY)",
};

const CACHE_KEY = "vocero_airlines_db";
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 días

export function useAirlines() {
  const [airlines, setAirlines] = useState<Airline[]>(FALLBACK_AIRLINES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAirlines = async () => {
      try {
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem(CACHE_KEY);
          const cachedTime = localStorage.getItem(`${CACHE_KEY}_time`);

          if (cached && cachedTime) {
            const age = Date.now() - Number(cachedTime);
            if (age < CACHE_EXPIRY) {
              setAirlines(JSON.parse(cached));
              return;
            }
          }
        }
      } catch {
        // LocalStorage fallback
      }

      setLoading(true);
      try {
        const response = await fetch("https://api.travelpayouts.com/data/es/airlines.json");
        if (response.ok) {
          const data: Airline[] = await response.json();
          const activeAirlines = data.filter((a) => a.active && a.iata && a.name);
          setAirlines(activeAirlines);

          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(CACHE_KEY, JSON.stringify(activeAirlines));
              localStorage.setItem(`${CACHE_KEY}_time`, String(Date.now()));
            }
          } catch {
            // Ignore quota errors
          }
        }
      } catch (err) {
        console.warn("Failed to fetch world airlines, using fallback dataset", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAirlines();
  }, []);

  const searchAirlines = useCallback(
    (query: string): Airline[] => {
      if (!query || query.trim().length < 2) return [];
      const clean = query.toLowerCase().trim();
      return airlines
        .filter(
          (a) =>
            (a.name && a.name.toLowerCase().includes(clean)) ||
            (a.iata && a.iata.toLowerCase() === clean) ||
            (a.icao && a.icao.toLowerCase() === clean)
        )
        .slice(0, 8);
    },
    [airlines]
  );

  return { airlines, loading, searchAirlines };
}
