import type { schema } from "@/lib/db";
import type { TravelPackageDto } from "@/server/travel/packages";

type AgentProfile = typeof schema.agentProfile.$inferSelect;
type KbEntry = typeof schema.kbEntry.$inferSelect;

/** Marcador del prompt del juez: el ai-mock lo usa para despachar veredictos. */
export const JUDGE_MARKER = "[JUEZ]";

export function renderKb(entries: KbEntry[]): string {
  if (entries.length === 0) return "(knowledge base vacío)";
  return entries
    .map((e) =>
      e.kind === "qa"
        ? `P: ${e.question}\nR: ${e.answer}`
        : (e.content ?? "")
    )
    .filter(Boolean)
    .join("\n\n");
}

export function renderPackagesCatalog(packages?: TravelPackageDto[]): string | null {
  if (!packages || packages.length === 0) return null;

  const catalogEntries = packages.map((pkg, idx) => {
    const origin = pkg.originCity
      ? `${pkg.originCity} (${pkg.departureAirport || "aeropuerto"})`
      : "Ciudad base";
    const dest = `${pkg.destination} (${pkg.arrivalAirport || "aeropuerto"})`;
    const fechas = `${pkg.startDate} al ${pkg.endDate} (${pkg.nights} noches)`;
    const deposito =
      pkg.minimumDeposit > 0
        ? `Separa con $${pkg.minimumDeposit.toLocaleString("es-CO")} ${pkg.currency} por persona (abono mes a mes)`
        : "Abono según políticas de la agencia";

    let hotelTarifas = "";
    if (pkg.totals?.byHotel && pkg.totals.byHotel.length > 0) {
      hotelTarifas = pkg.totals.byHotel
        .map((h, i) => {
          const adultUnit = Math.round(h.totalAdult / (pkg.passengers || 1));
          const childUnit =
            pkg.childPassengers > 0 && h.totalChild > 0
              ? Math.round(h.totalChild / pkg.childPassengers)
              : null;
          let precioStr = `Adulto: $${adultUnit.toLocaleString("es-CO")} ${pkg.currency} c/u`;
          if (childUnit !== null) {
            precioStr += ` | Niño: $${childUnit.toLocaleString("es-CO")} ${pkg.currency} c/u`;
          }
          return `    • Opción #${i + 1} - ${h.hotelTitle}: ${precioStr}`;
        })
        .join("\n");
    } else {
      const adultUnit = Math.round(
        (pkg.totals?.totalAdult ?? pkg.totals?.finalTotal ?? 0) / (pkg.passengers || 1)
      );
      const childUnit =
        pkg.childPassengers > 0 && (pkg.totals?.totalChild ?? 0) > 0
          ? Math.round(pkg.totals.totalChild / pkg.childPassengers)
          : null;
      let precioStr = `Adulto: $${adultUnit.toLocaleString("es-CO")} ${pkg.currency} c/u`;
      if (childUnit !== null) {
        precioStr += ` | Niño: $${childUnit.toLocaleString("es-CO")} ${pkg.currency} c/u`;
      }
      hotelTarifas = `    • Tarifa Base: ${precioStr}`;
    }

    const inc = pkg.inclusions ? `  - Inclusiones: ${pkg.inclusions.replace(/\n+/g, " · ")}` : null;
    const pol = pkg.policies ? `  - Políticas: ${pkg.policies.replace(/\n+/g, " ")}` : null;

    return [
      `[PAQUETE #${idx + 1}: "${pkg.title}"]`,
      `  - Trayecto: ${origin} ➔ ${dest}`,
      `  - Fechas: ${fechas}`,
      `  - Opciones de Hotel y Tarifas Unitarias:`,
      hotelTarifas,
      `  - Reserva: ${deposito}`,
      inc,
      pol,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "CATÁLOGO DE PAQUETES TURÍSTICOS VIGENTES (Fuente para cotizaciones y promociones de viaje):",
    ...catalogEntries,
    "Instrucciones para cotizar paquetes a los clientes:",
    "- Cuando pregunten por destinos o paquetes, responde amablemente con las fechas, trayecto, inclusiones y las opciones de hotel disponibles.",
    "- Si el cliente indica cuántos adultos y niños viajan, calcula y entrégale el valor total por cada hotel: (Adultos × Tarifa Adulto) + (Niños × Tarifa Niño).",
    "- Menciona siempre el valor para separar por persona y la facilidad de abonar mes a mes.",
    "- Anima al cliente a elegir una opción para apartar su cupo y solicitar sus datos de contacto.",
  ].join("\n\n");
}

/**
 * 029 — Va al final de los mensajes del turno, después del historial. Las
 * respuestas anteriores del agente llegan como texto plano, y con ellas a la
 * vista el modelo contestaba en texto plano: cada turno después del primero
 * gastaba un reintento para conseguir el JSON.
 */
export const TURN_FORMAT_REMINDER =
  'Responde ahora con UN objeto JSON de acción (por ejemplo {"action":"reply","text":"..."}), aunque tus mensajes anteriores aparezcan como texto plano.';

/**
 * System prompt del agente (v1: inyecta el KB completo — el límite se
 * documenta con el contador de tamaño en la UI).
 */
export function buildAgentSystemPrompt(input: {
  profile: AgentProfile;
  kb: KbEntry[];
  stages: { name: string }[];
  /**
   * 015 — ¿esta instancia tiene agenda? Apagada, el prompt no gasta ni un
   * token en hablar de horarios: la agenda no existe aquí.
   */
  agenda?: boolean;
  packages?: TravelPackageDto[];
}): string {
  const { profile } = input;
  const stageNames = input.stages.map((s) => s.name).join(" | ");
  const packagesBlock = renderPackagesCatalog(input.packages);
  const agendaLines = input.agenda
    ? [
        '- {"action":"offer_slots","reply":"..."} — ofrecer horarios para agendar (reply es solo la frase de entrada; los horarios los pone el sistema).',
        '- {"action":"book_slot","startUtc":"<uno de los horarios que el sistema ofreció, en ISO UTC>","reply":"..."} — agendar el horario que el cliente eligió.',
      ]
    : [];
  const agendaRules = input.agenda
    ? [
        "- NUNCA escribas tú los horarios ni los inventes: usa offer_slots y el sistema pega los reales.",
        "- book_slot solo acepta un horario que el sistema ofreció antes en ESTA conversación. Si el cliente pide otro, vuelve a ofrecer con offer_slots.",
        "- Si el cliente quiere CANCELAR una cita → handoff: esa decisión no es tuya.",
      ]
    : [];
  return [
    `Eres "${profile.name}", el asistente de WhatsApp de este negocio. Respondes SIEMPRE en español neutro, con mensajes breves y naturales para chat.`,
    profile.tone ? `Tono: ${profile.tone}` : null,
    profile.instructions ? `Instrucciones del negocio:\n${profile.instructions}` : null,
    profile.escalationRules
      ? `Reglas de escalado a humano:\n${profile.escalationRules}`
      : null,
    profile.greeting ? `Saludo sugerido para conversaciones nuevas: ${profile.greeting}` : null,
    `CONOCIMIENTO DEL NEGOCIO (tu única fuente de verdad; si algo no está aquí, NO lo inventes — di que lo confirmarás con el equipo o escala):\n${renderKb(input.kb)}`,
    packagesBlock,
    `Etapas del pipeline disponibles: ${stageNames}`,
    [
      "En cada turno respondes ÚNICAMENTE un objeto JSON con UNA acción:",
      // 029 — Sin condición, el modelo callaba ante «Hola prueba 1» (8 de 8).
      '- {"action":"none"} — no enviar nada. SOLO cuando el último mensaje del cliente cierra la conversación sin pedir nada («ok», «gracias», un emoji) y lo que preguntó ya tiene respuesta.',
      '- {"action":"reply","text":"..."} — responder al cliente.',
      '- {"action":"update_lead","note":"...","reply":"..."} — guardar una nota del lead (si el cliente espera respuesta, incluye reply).',
      '- {"action":"move_stage","stage":"<nombre exacto de etapa>","reply":"..."} — mover el lead (si el cliente espera respuesta, incluye reply).',
      '- {"action":"handoff","reason":"...","farewell":"..."} — escalar a un humano (farewell opcional para despedirte).',
      ...agendaLines,
      "Reglas duras:",
      "- Todo mensaje del cliente que no sea un cierre recibe respuesta: un saludo, un mensaje corto, raro o confuso, o un «hola, prueba» se contestan (saluda y ofrece ayuda). Nunca supongas que es una prueba o un error.",
      "- Si el cliente pide hablar con una persona/humano/asesor → handoff.",
      "- Si la pregunta NO está cubierta por el conocimiento → NO inventes: responde que lo confirmarás o escala.",
      "- Si detectas intención clara de compra → move_stage a la etapa de interesados y confirma al cliente.",
      ...agendaRules,
      "- JSON puro, sin markdown ni texto adicional.",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Prompt del juez del Laboratorio: UNA llamada por conversación (FR-032). */
export function buildJudgePrompt(input: {
  persona: string;
  transcript: { role: "cliente" | "agente"; text: string }[];
  kbText: string;
  behaviorText: string;
}): { system: string; user: string } {
  const system = [
    `${JUDGE_MARKER} Eres un evaluador de calidad independiente de agentes de WhatsApp. Evalúas UNA conversación simulada completa contra el conocimiento y comportamiento configurados. Eres estricto: la alucinación (inventar datos que no están en el conocimiento) es la falla más grave.`,
    "Respondes ÚNICAMENTE un objeto JSON con este esquema:",
    '{"veredicto":"verde"|"amarillo"|"rojo","hallazgos":[{"tipo":"alucinacion"|"fuera_de_kb"|"debio_escalar"|"tono","evidencia":"cita textual del transcript","sugerencia":{"pregunta":"...","respuesta":"..."}}]}',
    "- verde: sin problemas relevantes. amarillo: mejorable. rojo: falla grave.",
    "- `sugerencia` es opcional: inclúyela cuando una nueva entrada P/R del knowledge base evitaría el problema.",
    "- Si el agente respondió sobre un tema que NO está en el conocimiento → hallazgo fuera_de_kb (o alucinacion si afirmó datos concretos).",
    "- Si el cliente pidió un humano y no hubo escalado → debio_escalar.",
  ].join("\n");

  const transcript = input.transcript
    .map((t) => `${t.role === "cliente" ? "CLIENTE" : "AGENTE"}: ${t.text}`)
    .join("\n");

  const user = [
    `PERSONA SIMULADA: ${input.persona}`,
    `COMPORTAMIENTO CONFIGURADO:\n${input.behaviorText || "(sin configurar)"}`,
    `CONOCIMIENTO CONFIGURADO:\n${input.kbText || "(vacío)"}`,
    `TRANSCRIPT COMPLETO:\n${transcript}`,
    "Evalúa y responde el JSON.",
  ].join("\n\n");

  return { system, user };
}
