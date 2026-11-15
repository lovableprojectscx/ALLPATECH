import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  ETIQUETA_QUECHUA,
  formatearDistrito,
  generarPlantillaFija,
  validarRespuestaIA,
  type DatosChacraIA,
  type IdiomaIA,
} from "./validator.ts";

const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
] as const;
const GEMINI_TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 2_000;
const SYSTEM_PROMPT =
  "Eres un técnico agrario de Ayacucho. Explica en 3 frases cortas (máximo 15 palabras cada una), en palabras simples, qué hacer en esta chacra y por qué. Usa solo los datos dados. No hagas juicios agronómicos ('adecuada para sembrar', 'buena acidez', 'buen momento'). Si dias_helada > 0, menciónalo siempre. Cita al menos un dato con su número. Si mencionas el pH, di solo 'pH {valor}' sin calificarlo. Habla de tú, en frases cortas. No agregues números, porcentajes, fechas ni cultivos que no estén en los datos. No prometas precios ni cosechas ni menciones rancha. Si un dato dice no disponible, no lo menciones.";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
    if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = isAllowedOrigin(origin) ? origin! : "https://muyu.vercel.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function llamarGemini(
  model: string,
  geminiKey: string,
  idiomaInst: string,
  datos: DatosChacraIA,
  thinkingCfg: Record<string, unknown>
): Promise<{ status: number | "timeout"; finishReason: string; text: string; rawBody?: string }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${SYSTEM_PROMPT} ${idiomaInst}` }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Datos JSON de la chacra:\n${JSON.stringify(datos)}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          thinkingConfig: thinkingCfg,
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return { status: resp.status, finishReason: "ERROR", text: "", rawBody: errText };
    }

    const json = await resp.json();
    const cand = json?.candidates?.[0];
    const finishReason = String(cand?.finishReason ?? "UNKNOWN");
    const candidateText =
      cand?.content?.parts
        ?.map((pt: { text?: string }) => pt.text ?? "")
        .join(" ")
        .trim() ?? "";
    return { status: resp.status, finishReason, text: candidateText };
  } catch {
    return { status: "timeout", finishReason: "TIMEOUT", text: "" };
  }
}

async function intentarModeloConRetry(
  model: string,
  geminiKey: string,
  idiomaInst: string,
  datos: DatosChacraIA
): Promise<{ status: number | "timeout"; finishReason: string; text: string; intentos: number }> {
  let thinkingCfg: Record<string, unknown> =
    model === "gemini-2.5-flash" ? { thinkingBudget: 0 } : { thinkingLevel: "low" };

  let intentos = 0;
  for (let round = 0; round < 2; round++) {
    intentos++;
    let res = await llamarGemini(model, geminiKey, idiomaInst, datos, thinkingCfg);
    if (res.status === 400 && res.rawBody?.includes("thinkingLevel")) {
      thinkingCfg = { thinkingBudget: 0 };
      intentos++;
      res = await llamarGemini(model, geminiKey, idiomaInst, datos, thinkingCfg);
    }
    const esTransitorio = res.status === 503 || res.status === 429 || res.status === "timeout";
    if (!esTransitorio || round === 1) {
      return { status: res.status, finishReason: res.finishReason, text: res.text, intentos };
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  return { status: "timeout", finishReason: "TIMEOUT", text: "", intentos };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parcelaId = String(body?.parcela_id ?? "").trim().toUpperCase();
    const rawIdioma = String(body?.idioma ?? "es").trim().toLowerCase();
    const idioma: IdiomaIA = rawIdioma === "en" || rawIdioma === "qu" ? rawIdioma : "es";

    if (!/^P\d{2}$/.test(parcelaId)) {
      return new Response(JSON.stringify({ error: "parcela_id inválido" }), { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Configuración de servidor incompleta" }), { status: 500, headers });
    }

    const sb = createClient(supabaseUrl, serviceKey);

    const [parRes, planRes, imergRes, enisRes, ndviRes, opRes] = await Promise.all([
      sb.from("parcelas").select("*").eq("id", parcelaId).maybeSingle(),
      sb.from("plan_rotacion").select("*").eq("parcela_id", parcelaId).maybeSingle(),
      sb.from("lluvia_imerg_mensual").select("mes_num,anomalia_pct").eq("mes_num", 10).maybeSingle(),
      sb.from("enis").select("valor").ilike("ambito", "%ayacucho%").limit(1).maybeSingle(),
      sb
        .from("ndvi_parcelas")
        .select("ndvi,calendar_date")
        .eq("parcela_id", parcelaId)
        .not("ndvi", "is", null)
        .order("calendar_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("oportunidades")
        .select("codigo,titulo,accion_positiva,por_que_corto,valores_json,estado,nota,prioridad")
        .eq("parcela_id", parcelaId)
        .order("prioridad"),
    ]);

    if (parRes.error || !parRes.data || planRes.error || !planRes.data) {
      return new Response(JSON.stringify({ error: "Parcela no encontrada" }), { status: 404, headers });
    }

    const p = parRes.data as Record<string, unknown>;
    const pl = planRes.data as Record<string, unknown>;
    const climaCampana = (p.clima_campana_json ?? {}) as Record<string, unknown>;
    const suelo = (p.suelo_json ?? {}) as Record<string, unknown>;

    const climaRes = await sb
      .from("clima_mensual")
      .select("humedad_suelo_raiz,mes")
      .eq("cell_key", String(p.power_cell_id))
      .eq("anio", 2026)
      .order("mes", { ascending: false })
      .limit(1)
      .maybeSingle();

    const gwRaw = climaRes.data?.humedad_suelo_raiz;
    const humedadPct =
      typeof gwRaw === "number" ? Math.round(gwRaw * 100) : "no disponible";

    const oportunidadesIA =
      !opRes.error && Array.isArray(opRes.data)
        ? opRes.data.map((row: Record<string, unknown>) => {
            const valObj = (row.valores_json ?? {}) as Record<string, unknown>;
            const { meses: _omitMeses, ...valoresCompactos } = valObj;
            return {
              codigo: String(row.codigo ?? ""),
              titulo: String(row.titulo ?? ""),
              accion_positiva: String(row.accion_positiva ?? ""),
              por_que_corto: String(row.por_que_corto ?? ""),
              estado: String(row.estado ?? ""),
              nota: String(row.nota ?? ""),
              valores: valoresCompactos,
            };
          })
        : [];

    const datos: DatosChacraIA = {
      parcela_id: parcelaId,
      distrito: formatearDistrito(String(p.distrito ?? "")),
      elev_dem_m: Math.round(Number(p.elev_dem_m ?? 0)),
      estrategia_elegida: (String(pl.estrategia_elegida ?? "B") as "A" | "B" | "C"),
      cultivo_asignado: String(pl.cultivo_asignado ?? ""),
      dias_helada: Number(climaCampana.dias_helada ?? 0),
      humedad_suelo_pct: humedadPct,
      ph_suelo: typeof suelo.ph === "number" ? Number(suelo.ph.toFixed(1)) : "no disponible",
      ndvi_ultimo:
        typeof ndviRes.data?.ndvi === "number"
          ? Number(ndviRes.data.ndvi.toFixed(2))
          : "no disponible",
      enis_papa_ayacucho_pct:
        typeof enisRes.data?.valor === "number" ? Number(enisRes.data.valor) : "no disponible",
      lluvia_oct_anomalia_pct:
        typeof imergRes.data?.anomalia_pct === "number"
          ? Number(imergRes.data.anomalia_pct)
          : "no disponible",
      oportunidades: oportunidadesIA,
    };

    const dataHash = await sha256Hex(JSON.stringify({ datos, idioma }));

    // Solo devolver caché si no es plantilla_fija
    const cacheRes = await sb
      .from("ia_explicaciones")
      .select("texto,modelo,creado_en,data_hash")
      .eq("parcela_id", parcelaId)
      .eq("idioma", idioma)
      .maybeSingle();

    if (
      !cacheRes.error &&
      cacheRes.data &&
      cacheRes.data.data_hash === dataHash &&
      cacheRes.data.modelo !== "plantilla_fija"
    ) {
      return new Response(
        JSON.stringify({
          texto: cacheRes.data.texto,
          modelo: cacheRes.data.modelo,
          es_plantilla: false,
          motivo_plantilla: null,
          usado_cache: true,
          etiqueta_quechua: idioma === "qu" ? ETIQUETA_QUECHUA : null,
          datos_usados: datos,
        }),
        { status: 200, headers }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const plantilla = generarPlantillaFija(datos, idioma);

    if (!geminiKey) {
      console.log("[explicar-chacra]", { parcelaId, status: "skip", finishReason: "no_key", textLen: 0, motivo: "sin_key" });
      return new Response(
        JSON.stringify({
          texto: plantilla,
          modelo: "plantilla_fija",
          es_plantilla: true,
          motivo_plantilla: "sin_key",
          usado_cache: false,
          etiqueta_quechua: idioma === "qu" ? ETIQUETA_QUECHUA : null,
          datos_usados: datos,
        }),
        { status: 200, headers }
      );
    }

    const haceUnMin = new Date(Date.now() - 60_000).toISOString();
    const { count } = await sb
      .from("ia_llamadas")
      .select("id", { count: "exact", head: true })
      .gte("creado_en", haceUnMin);

    if ((count ?? 0) >= 30) {
      console.log("[explicar-chacra]", { parcelaId, status: 429, finishReason: "rate_limit", textLen: 0, motivo: "rate_limit" });
      return new Response(
        JSON.stringify({
          texto: plantilla,
          modelo: "plantilla_fija",
          es_plantilla: true,
          motivo_plantilla: "rate_limit",
          usado_cache: false,
          etiqueta_quechua: idioma === "qu" ? ETIQUETA_QUECHUA : null,
          datos_usados: datos,
        }),
        { status: 200, headers }
      );
    }

    await sb.from("ia_llamadas").insert({});

    const idiomaInst =
      idioma === "en"
        ? "Responde en inglés simple."
        : idioma === "qu"
        ? "Responde en quechua ayacuchano (Chanka) simple."
        : "Responde en español simple.";

    let textoFinal = plantilla;
    let modeloUsado = "plantilla_fija";
    let esPlantilla = true;
    let motivoPlantilla: string | null = "sin_respuesta";
    let ultimoStatus: number | "timeout" = "timeout";
    let ultimoFinish = "UNKNOWN";
    let ultimoTextLen = 0;

    for (const model of GEMINI_MODELS) {
      const gRes = await intentarModeloConRetry(model, geminiKey, idiomaInst, datos);
      ultimoStatus = gRes.status;
      ultimoFinish = gRes.finishReason;
      ultimoTextLen = gRes.text.length;

      if (gRes.status === "timeout") {
        motivoPlantilla = "timeout";
        continue;
      }
      if (gRes.status !== 200) {
        motivoPlantilla = `gemini_http_${gRes.status}`;
        continue;
      }
      if (!gRes.text) {
        motivoPlantilla = "vacia";
        continue;
      }
      if (gRes.finishReason === "MAX_TOKENS") {
        motivoPlantilla = "max_tokens";
        continue;
      }

      const check = validarRespuestaIA(gRes.text, datos);
      if (check.valida) {
        textoFinal = gRes.text;
        modeloUsado = model;
        esPlantilla = false;
        motivoPlantilla = null;
        break;
      }
      motivoPlantilla = `validador:${check.motivo ?? "desconocido"}`;
    }

    console.log("[explicar-chacra]", {
      parcelaId,
      idioma,
      modeloRespondio: esPlantilla ? null : modeloUsado,
      respStatus: ultimoStatus,
      finishReason: ultimoFinish,
      textLen: ultimoTextLen,
      esPlantilla,
      motivo: motivoPlantilla,
    });

    // NO guardar en ia_explicaciones cuando es_plantilla sea true
    if (!esPlantilla) {
      await sb.from("ia_explicaciones").upsert(
        {
          parcela_id: parcelaId,
          idioma,
          texto: textoFinal,
          modelo: modeloUsado,
          data_hash: dataHash,
          creado_en: new Date().toISOString(),
        },
        { onConflict: "parcela_id,idioma" }
      );
    }

    return new Response(
      JSON.stringify({
        texto: textoFinal,
        modelo: modeloUsado,
        es_plantilla: esPlantilla,
        motivo_plantilla: motivoPlantilla,
        usado_cache: false,
        etiqueta_quechua: idioma === "qu" ? ETIQUETA_QUECHUA : null,
        datos_usados: datos,
      }),
      { status: 200, headers }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Error procesando solicitud" }), { status: 500, headers });
  }
});
