import { z } from "zod";
import { parseBody, withAuth } from "@/lib/api";
import { chatJson, type ChatMessage } from "@/lib/ai";

export const dynamic = "force-dynamic";

const aiSuggestSchema = z.object({
  destination: z.string().trim().min(1, "El destino es obligatorio"),
  nights: z.number().int().positive().default(4),
  passengers: z.number().int().positive().default(2),
  travelReason: z.string().optional(),
  currency: z.enum(["COP", "USD", "EUR"]).default("COP"),
  preferences: z.record(z.boolean()).optional(),
});

const aiItineraryResponseSchema = z.object({
  destinationDescription: z.string(),
  recommendedInclusions: z.string(),
  recommendedExclusions: z.string(),
  recommendedPolicies: z.string(),
  days: z.array(
    z.object({
      dayNumber: z.number().int().positive(),
      title: z.string(),
      items: z.array(
        z.object({
          type: z.enum(["Flight", "Hotel", "Activity", "Transfer", "Insurance", "Other"]),
          title: z.string(),
          description: z.string(),
          estimatedNetPrice: z.number().nonnegative(),
          provider: z.string().optional(),
        })
      ),
    })
  ),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, aiSuggestSchema);
  if (!body.ok) return body.response;

  const { destination, travelReason, currency, preferences } = body.data;
  const nights = body.data.nights ?? 4;
  const passengers = body.data.passengers ?? 2;

  const prefList = preferences
    ? Object.entries(preferences)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ")
    : "Estándar / Vacacional";

  const systemPrompt = `Eres un experto cotizador y diseñador de itinerarios turísticos de alta gama para agencias de viajes en América Latina.
Tu objetivo es armar un itinerario detallado, atractivo y realista día por día con sus servicios (Vuelo, Hotel, Actividad/Tour, Traslado, Asistencia médica) con precios netos estimados acordes al destino y moneda (${currency}).`;

  const userPrompt = `Genera una propuesta de itinerario completa para:
- Destino: ${destination}
- Duración: ${nights} noches (${nights + 1} días)
- Pasajeros: ${passengers} persona(s)
- Motivo de viaje: ${travelReason || "Vacaciones"}
- Preferencias: ${prefList}
- Moneda: ${currency}

Incluye:
1. Descripción atractiva del destino.
2. Inclusiones recomendadas.
3. Exclusiones estándar.
4. Políticas sugeridas.
5. Días del itinerario (del día 1 al ${nights + 1}) con ítems de tipo Flight, Hotel, Activity, Transfer, Insurance.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const aiResult = await chatJson(aiItineraryResponseSchema, messages, {
    organizationId: session.organizationId,
    timeoutMs: 45000,
  });

  if (aiResult.ok) {
    return Response.json({ suggestion: aiResult.data });
  }

  // Fallback si la IA no está configurada o hubo hipo del proveedor: plantilla estructurada
  console.warn("[ai-suggest] fallback a plantilla estructurada:", aiResult.detail);

  const fallbackDays = Array.from({ length: nights + 1 }, (_, i) => {
    const dayNumber = i + 1;
    if (dayNumber === 1) {
      return {
        dayNumber: 1,
        title: `Llegada a ${destination} y Check-in`,
        items: [
          {
            type: "Transfer" as const,
            title: `Traslado Aeropuerto - Hotel en ${destination}`,
            description: "Servicio privado con chofer y asistencia en terminal",
            estimatedNetPrice: currency === "COP" ? 90000 : 35,
            provider: "Operador Receptivo",
          },
          {
            type: "Hotel" as const,
            title: `Alojamiento Seleccionado en ${destination}`,
            description: `Estadía ${nights} noches en acomodación confort con desayuno incluido`,
            estimatedNetPrice: (currency === "COP" ? 350000 : 90) * nights,
            provider: "Hotel Aliado",
          },
        ],
      };
    }
    if (dayNumber === nights + 1) {
      return {
        dayNumber,
        title: `Despedida y Retorno desde ${destination}`,
        items: [
          {
            type: "Transfer" as const,
            title: `Traslado Hotel - Aeropuerto ${destination}`,
            description: "Traslado coordinado con 3 horas de anticipación al vuelo",
            estimatedNetPrice: currency === "COP" ? 90000 : 35,
            provider: "Operador Receptivo",
          },
        ],
      };
    }
    return {
      dayNumber,
      title: `Exploración y Tours en ${destination}`,
      items: [
        {
          type: "Activity" as const,
          title: `Tour Guiado Destacado día ${dayNumber}`,
          description: "Recorrido turístico con guía certificado, entradas y refrigerio",
          estimatedNetPrice: (currency === "COP" ? 180000 : 45) * passengers,
          provider: "Operador Local",
        },
      ],
    };
  });

  return Response.json({
    suggestion: {
      destinationDescription: `Disfruta de una experiencia inolvidable en ${destination}, explorando sus mejores atractivos, cultura y gastronomía con asistencia personalizada de la agencia.`,
      recommendedInclusions: "• Alojamiento según categoría seleccionada con desayuno diario\n• Traslados aeropuerto - hotel - aeropuerto\n• Tours y actividades guiadas mencionadas\n• Asistencia médica internacional",
      recommendedExclusions: "• Gastos personales y propinas\n• Bebidas o comidas no especificadas\n• Vuelos no especificados",
      recommendedPolicies: "• Tarifas sujetas a disponibilidad y cambio sin previo aviso hasta confirmar reserva con abono inicial.\n• Política de cancelación según condiciones de cada proveedor.",
      days: fallbackDays,
    },
    fallback: true,
  });
});
