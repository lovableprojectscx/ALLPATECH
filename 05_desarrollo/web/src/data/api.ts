import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabaseClient";
import {
  ClimaMensualResponseSchema,
  FuentesResponseSchema,
  ImergResponseSchema,
  MercadoResponseSchema,
  NdviResponseSchema,
  OportunidadesContractSchema,
  ParcelasResponseSchema,
  PlanRotacionContractSchema,
  VigilanciaRanchaSchema,
  type ClimaMensualRegistro,
  type Fuente,
  type ImergMes,
  type MercadoMes,
  type NdviParcela,
  type OportunidadItem,
  type OportunidadesContract,
  type Parcela,
  type PlanRotacionContract,
  type VigilanciaRancha,
} from "./schemas";

let localFallbackActive = false;
const fallbackListeners = new Set<(active: boolean) => void>();

export function markLocalFallback(active: boolean) {
  if (localFallbackActive !== active) {
    localFallbackActive = active;
    fallbackListeners.forEach((cb) => cb(active));
  }
}

export function isLocalFallbackActive(): boolean {
  return localFallbackActive;
}

export function subscribeLocalFallback(cb: (active: boolean) => void): () => void {
  fallbackListeners.add(cb);
  cb(localFallbackActive);
  return () => {
    fallbackListeners.delete(cb);
  };
}

export function formatValor(val: string | number | null | undefined, sufijo = ""): string {
  if (val === null || val === undefined || val === "no_disponible" || val === "no disponible") {
    return "no disponible";
  }
  return `${val}${sufijo}`;
}

export function esErrorDeRedSupabase(error: unknown, status?: number): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  if (typeof status === "number" && status >= 400) {
    return false;
  }
  if (error && typeof error === "object") {
    const errObj = error as { status?: unknown; statusCode?: unknown; code?: unknown; message?: unknown };
    const errStatus =
      typeof errObj.status === "number"
        ? errObj.status
        : typeof errObj.statusCode === "number"
        ? errObj.statusCode
        : undefined;
    if (typeof errStatus === "number" && errStatus >= 400) {
      return false;
    }
    const msg = typeof errObj.message === "string" ? errObj.message : "";
    const code = typeof errObj.code === "string" ? errObj.code : "";
    if (
      /failed to fetch|networkerror|network request failed|load failed|fetch failed|econnrefused|etimedout|enotfound|err_internet|err_name_not_resolved|offline/i.test(
        msg
      )
    ) {
      return true;
    }
    if (code.length > 0) {
      return false;
    }
    if (error instanceof Error) {
      return true;
    }
  }
  return error !== null && error !== undefined && status === 0;
}

async function fetchJsonLocal<T>(path: string, notifyOffline = false): Promise<T> {
  if (notifyOffline) {
    markLocalFallback(true);
  }
  const resp = await fetch(path);
  if (!resp.ok) {
    throw new Error(`No se pudo cargar respaldo local ${path} (${resp.status})`);
  }
  return (await resp.json()) as T;
}

export async function getParcelas(client: SupabaseClient | null = getSupabaseClient()): Promise<Parcela[]> {
  let redError = false;
  if (client) {
    try {
      const { data, error, status } = await client.from("parcelas").select("*").order("id");
      if (!error && data && data.length > 0) {
        const mapped = data.map((row: Record<string, unknown>) => ({
          id: row.id,
          distrito: row.distrito,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          elev_dem_m: Number(row.elev_dem_m),
          power_cell_id: row.power_cell_id,
          clima_campana_2025_2026: row.clima_campana_json,
          suelo: row.suelo_json,
          estado: row.estado,
          dato_hasta: row.dato_hasta,
        }));
        return ParcelasResponseSchema.parse(mapped);
      }
      redError = esErrorDeRedSupabase(error, status);
    } catch (err) {
      redError = esErrorDeRedSupabase(err);
    }
  }

  const raw = await fetchJsonLocal<{ parcelas: Array<Record<string, unknown>> }>("/data/parcelas_demo.json", redError);
  const mapped = raw.parcelas.map((p) => ({
    ...p,
    estado: p.estado_elevacion ?? "estimado",
  }));
  return ParcelasResponseSchema.parse(mapped);
}

export async function getPlanRotacion(
  client: SupabaseClient | null = getSupabaseClient()
): Promise<PlanRotacionContract> {
  let redError = false;
  if (client) {
    try {
      const [planRes, estRes, parRes] = await Promise.all([
        client.from("plan_rotacion").select("*").order("parcela_id"),
        client.from("estrategias_bandas").select("*"),
        client.from("parcelas").select("id,distrito,elev_dem_m"),
      ]);
      if (!planRes.error && !estRes.error && !parRes.error && planRes.data?.length) {
        const metaColor: Record<string, { color: string; forma: string }> = {
          A: { color: "#B83A00", forma: "▲" },
          B: { color: "#003F6E", forma: "■" },
          C: { color: "#007755", forma: "●" },
        };
        const plan = planRes.data.map((r: Record<string, unknown>) => ({
          parcela_id: r.parcela_id,
          distrito: r.distrito,
          elev_dem_m: Number(r.elev_dem_m),
          cultivo_previo: r.cultivo_previo,
          estrategia_elegida: r.estrategia_elegida,
          color_hex: metaColor[String(r.estrategia_elegida)]?.color ?? "#1C1917",
          forma: metaColor[String(r.estrategia_elegida)]?.forma ?? "●",
          cultivo_asignado: r.cultivo_asignado,
          rotacion_con_leguminosa: r.rotacion_con_leguminosa,
          chuno_tunta: r.chuno_tunta_json,
          estado: r.estado,
          dato_hasta: r.dato_hasta,
        }));

        const porParcela = new Map<string, Record<string, unknown>>();
        for (const p of parRes.data as Array<Record<string, unknown>>) {
          porParcela.set(String(p.id), {
            parcela_id: p.id,
            distrito: p.distrito,
            elev_dem_m: Number(p.elev_dem_m),
            escala_visible: { clima: "~50 km (NASA POWER)", terreno: "30 m (DEM/parcela)" },
            estrategias: {},
          });
        }
        for (const e of estRes.data as Array<Record<string, unknown>>) {
          const entry = porParcela.get(String(e.parcela_id));
          if (!entry) continue;
          (entry.estrategias as Record<string, unknown>)[String(e.estrategia)] = {
            codigo: e.estrategia,
            nombre: e.nombre,
            cultivo_id: e.cultivo_id,
            color_hex: e.color_hex,
            forma: e.forma,
            radar_bandas: e.radar_bandas_json,
            alertas: e.alertas_json,
          };
        }
        return PlanRotacionContractSchema.parse({
          plan,
          comparador: Array.from(porParcela.values()),
        });
      }
      redError =
        esErrorDeRedSupabase(planRes.error, planRes.status) ||
        esErrorDeRedSupabase(estRes.error, estRes.status) ||
        esErrorDeRedSupabase(parRes.error, parRes.status);
    } catch (err) {
      redError = esErrorDeRedSupabase(err);
    }
  }

  const raw = await fetchJsonLocal<{
    plan_rotacion_10_parcelas: unknown[];
    comparador_abc_por_parcela: unknown[];
  }>("/data/plan_rotacion_demo.json", redError);

  return PlanRotacionContractSchema.parse({
    plan: raw.plan_rotacion_10_parcelas,
    comparador: raw.comparador_abc_por_parcela,
  });
}

export async function getImergMensual(client: SupabaseClient | null = getSupabaseClient()): Promise<ImergMes[]> {
  let redError = false;
  if (client) {
    try {
      const { data, error, status } = await client.from("lluvia_imerg_mensual").select("*").order("mes_num");
      if (!error && data && data.length > 0) {
        return ImergResponseSchema.parse(data);
      }
      redError = esErrorDeRedSupabase(error, status);
    } catch (err) {
      redError = esErrorDeRedSupabase(err);
    }
  }

  const raw = await fetchJsonLocal<{
    _metadata: { nota_escala: string };
    meses_jul_oct: Array<Record<string, unknown>>;
  }>("/data/imerg_mensual.json", redError);

  const mapped = raw.meses_jul_oct.map((m) => ({
    ...m,
    nota_escala: raw._metadata.nota_escala,
  }));
  return ImergResponseSchema.parse(mapped);
}

export async function getClimaMensual(
  client: SupabaseClient | null = getSupabaseClient()
): Promise<ClimaMensualRegistro[]> {
  let redError = false;
  if (client) {
    try {
      const { data, error, status } = await client
        .from("clima_mensual")
        .select("cell_key,anio,mes,t2m_media_c,anomalia_t2m_c,puesto_calor,humedad_suelo_raiz,estado,dato_hasta")
        .eq("anio", 2026)
        .order("mes");
      if (!error && data && data.length > 0) {
        return ClimaMensualResponseSchema.parse(data);
      }
      redError = esErrorDeRedSupabase(error, status);
    } catch (err) {
      redError = esErrorDeRedSupabase(err);
    }
  }

  const raw = await fetchJsonLocal<{
    celdas: Record<string, { registros: Array<Record<string, unknown>> }>;
  }>("/data/clima_mensual.json", redError);

  const out: Array<Record<string, unknown>> = [];
  for (const [cellKey, info] of Object.entries(raw.celdas)) {
    for (const r of info.registros) {
      if (r.anio === 2026) {
        out.push({ cell_key: cellKey, ...r });
      }
    }
  }
  return ClimaMensualResponseSchema.parse(out);
}

export async function getMercadoPapa(client: SupabaseClient | null = getSupabaseClient()): Promise<MercadoMes[]> {
  let redError = false;
  if (client) {
    try {
      const { data, error, status } = await client
        .from("mercado_papa_mensual")
        .select("*")
        .order("anio")
        .order("mes");
      if (!error && data && data.length > 0) {
        return MercadoResponseSchema.parse(data);
      }
      redError = esErrorDeRedSupabase(error, status);
    } catch (err) {
      redError = esErrorDeRedSupabase(err);
    }
  }

  const raw = await fetchJsonLocal<{ mercado_papa_mensual: unknown[] }>("/data/mercado_resumen.json", redError);
  return MercadoResponseSchema.parse(raw.mercado_papa_mensual);
}

export async function getFuentes(client: SupabaseClient | null = getSupabaseClient()): Promise<Fuente[]> {
  if (client) {
    try {
      const { data, error, status } = await client.from("fuentes").select("*").order("id");
      if (!error && data && data.length > 0) {
        return FuentesResponseSchema.parse(data);
      }
      if (esErrorDeRedSupabase(error, status)) {
        markLocalFallback(true);
      }
    } catch (err) {
      if (esErrorDeRedSupabase(err)) {
        markLocalFallback(true);
      }
    }
  }

  return FuentesResponseSchema.parse([
    {
      id: "nasa_power",
      nombre: "NASA POWER MERRA-2",
      escala: "~50 km",
      url_o_referencia: "https://power.larc.nasa.gov/",
      estado: "observado",
      dato_hasta: "2026-10-31",
    },
    {
      id: "gpm_imerg",
      nombre: "NASA GPM IMERG Late V07",
      escala: "0.1 grados",
      url_o_referencia: "https://giovanni.gsfc.nasa.gov/",
      estado: "observado",
      dato_hasta: "2026-10-31",
    },
    {
      id: "emmsa_siea",
      nombre: "EMMSA / MIDAGRI-SIEA",
      escala: "GMML Lima",
      url_o_referencia: "https://www.gob.pe/midagri",
      estado: "observado",
      dato_hasta: "2026-11-13",
    },
  ]);
}

export async function getNdviParcelas(
  client: SupabaseClient | null = getSupabaseClient()
): Promise<NdviParcela[]> {
  let redError = false;
  if (client) {
    try {
      const { data, error, status } = await client
        .from("ndvi_parcelas")
        .select("parcela_id,calendar_date,ndvi,estado,dato_hasta")
        .order("calendar_date");
      if (!error && data) {
        if (data.length === 0) {
          return [];
        }
        const grouped = new Map<string, NdviParcela>();
        for (const row of data as Array<Record<string, unknown>>) {
          const pid = String(row.parcela_id);
          if (!grouped.has(pid)) {
            grouped.set(pid, {
              parcela_id: pid,
              dato_hasta: String(row.dato_hasta ?? "no disponible"),
              registros: [],
            });
          }
          grouped.get(pid)!.registros.push({
            calendar_date: String(row.calendar_date),
            ndvi: row.ndvi === null ? "no disponible" : Number(row.ndvi),
            estado: (row.estado as NdviParcela["registros"][number]["estado"]) ?? "no_disponible",
          });
        }
        return NdviResponseSchema.parse(Array.from(grouped.values()));
      }
      redError = esErrorDeRedSupabase(error, status);
    } catch (err) {
      redError = esErrorDeRedSupabase(err);
    }
  }

  try {
    const raw = await fetchJsonLocal<{ parcelas: NdviParcela[] }>("/data/ndvi_parcelas.json", redError);
    return NdviResponseSchema.parse(raw.parcelas ?? []);
  } catch {
    return [];
  }
}

export interface FechasResumen {
  clima: string;
  mercado: string;
}

export async function getFechasResumen(
  client: SupabaseClient | null = getSupabaseClient()
): Promise<FechasResumen> {
  if (client) {
    try {
      const [pRes, cRes, mRes] = await Promise.all([
        client.from("parcelas").select("dato_hasta").order("dato_hasta", { ascending: false }).limit(1),
        client.from("clima_mensual").select("dato_hasta").order("dato_hasta", { ascending: false }).limit(1),
        client.from("mercado_papa_mensual").select("dato_hasta").order("dato_hasta", { ascending: false }).limit(1),
      ]);
      const climaFechas = [pRes.data?.[0]?.dato_hasta, cRes.data?.[0]?.dato_hasta].filter(
        (v): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
      );
      const mercadoVal = mRes.data?.[0]?.dato_hasta;
      const clima = climaFechas.length > 0 ? climaFechas.sort().reverse()[0] : "2026-11-12";
      const mercado =
        typeof mercadoVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(mercadoVal)
          ? mercadoVal
          : "2026-11-13";
      return { clima, mercado };
    } catch {
      // fallback abajo
    }
  }
  return { clima: "2026-11-12", mercado: "2026-11-13" };
}

export interface ExplicacionIAResponse {
  texto: string;
  modelo: string;
  es_plantilla: boolean;
  motivo_plantilla?: string;
  usado_cache: boolean;
  etiqueta_quechua: string | null;
  datos_usados: Record<string, unknown>;
}

export async function getOportunidades(
  client: SupabaseClient | null = getSupabaseClient()
): Promise<OportunidadesContract> {
  let redError = false;
  if (client) {
    try {
      const { data, error, status } = await client
        .from("oportunidades")
        .select(
          "parcela_id,codigo,titulo,accion_positiva,por_que_corto,accion_ficha,valores_json,fuente,escala,estado,nota,dato_hasta,prioridad"
        )
        .order("parcela_id")
        .order("prioridad");
      if (!error && data && data.length > 0) {
        const resp = await fetch("/data/oportunidades.json");
        if (resp.ok) {
          const base = OportunidadesContractSchema.parse(await resp.json());
          const porParcelaMap = new Map<string, OportunidadItem[]>();
          for (const row of data) {
            const pid = String(row.parcela_id);
            const list = porParcelaMap.get(pid) ?? [];
            list.push({
              codigo: String(row.codigo),
              titulo: String(row.titulo),
              accion_positiva: String(row.accion_positiva),
              por_que_corto: String(row.por_que_corto),
              accion_ficha: String(row.accion_ficha),
              valores_json: (row.valores_json ?? undefined) as Record<string, unknown> | undefined,
              fuente: String(row.fuente),
              escala: String(row.escala),
              estado: row.estado as OportunidadItem["estado"],
              nota: String(row.nota),
              dato_hasta: String(row.dato_hasta),
              prioridad: typeof row.prioridad === "number" ? row.prioridad : undefined,
            });
            porParcelaMap.set(pid, list);
          }
          base.por_parcela = base.por_parcela.map((p) => {
            const ops = porParcelaMap.get(p.parcela_id);
            return ops && ops.length > 0 ? { ...p, oportunidades: ops } : p;
          });
          return base;
        }
      }
      redError = esErrorDeRedSupabase(error, status);
    } catch (err) {
      redError = esErrorDeRedSupabase(err);
    }
  }

  const raw = await fetchJsonLocal<unknown>("/data/oportunidades.json", redError);
  return OportunidadesContractSchema.parse(raw);
}

export async function getVigilanciaRancha(): Promise<VigilanciaRancha> {
  const resp = await fetch("/data/vigilancia_rancha.json");
  if (!resp.ok) {
    throw new Error(`No se pudo cargar vigilancia_rancha.json (${resp.status})`);
  }
  return VigilanciaRanchaSchema.parse(await resp.json());
}

export async function explicarChacra(
  parcela: Parcela,
  planItem: { estrategia_elegida: string; cultivo_asignado: string } | undefined,
  idioma: "es" | "en" | "qu",
  oportunidades: OportunidadItem[] = []
): Promise<ExplicacionIAResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/explicar-chacra`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          parcela_id: parcela.id,
          idioma,
          oportunidades: oportunidades.map((o) => ({
            codigo: o.codigo,
            titulo: o.titulo,
            accion_positiva: o.accion_positiva,
            por_que_corto: o.por_que_corto,
          })),
        }),
      });
      if (resp.ok) {
        return (await resp.json()) as ExplicacionIAResponse;
      }
    } catch {
      // Conmuta a plantilla fija local sin mostrar error técnico
    }
  }

  const cultivo = planItem?.cultivo_asignado ?? "cultivo recomendado";
  const estrategia = (planItem?.estrategia_elegida ?? "B") as "A" | "B" | "C";
  const heladas = parcela.clima_campana_2025_2026.dias_helada;
  const distNormMap: Record<string, string> = {
    huanta: "Huanta",
    quinua: "Quinua",
    acosvinchos: "Acosvinchos",
    pacaycasa: "Pacaycasa",
    chiara_alta_2: "Chiara",
    chiara_alta_1: "Chiara",
    acocro: "Acocro",
    vinchos_alta_1: "Vinchos",
    cangallo: "Cangallo",
    vilcashuaman: "Vilcashuamán",
    "san jose de ticllas": "San José de Ticllas",
    "carmen alto": "Carmen Alto",
    "san juan bautista": "San Juan Bautista",
    "jesus nazareno": "Jesús Nazareno",
    "andres avelino caceres": "Andrés Avelino Cáceres",
  };
  const distRaw = parcela.distrito.trim();
  const distKey = distRaw.toLowerCase();
  const distBase = distKey.replace(/_alta_\d+$/i, "").replace(/_/g, " ");
  const distNombre =
    distNormMap[distKey] ??
    distBase.charAt(0).toUpperCase() + distBase.slice(1);
  const elevFmt = Math.round(parcela.elev_dem_m).toLocaleString("en-US");
  const opPrincipal = oportunidades[0]?.accion_positiva;
  const estTextoEs: Record<"A" | "B" | "C", string> = {
    A: "la estrategia que busca mejor precio",
    B: "la estrategia que reparte el riesgo (como la quinua)",
    C: "la estrategia que cuida el suelo (como el tarwi)",
  };
  const estTextoEn: Record<"A" | "B" | "C", string> = {
    A: "the option seeking a better price",
    B: "the option that spreads risk (like quinoa)",
    C: "the option that cares for the soil (like tarwi)",
  };
  const extraOpEs = opPrincipal ? ` Oportunidad clave: ${opPrincipal}` : "";
  const extraOpEn = opPrincipal ? ` Key opportunity: ${opPrincipal}` : "";
  const texto =
    idioma === "en"
      ? `Plant ${cultivo} on your plot in ${distNombre} (${elevFmt} m). ${
          heladas > 0
            ? `Since July 2025 there were ${heladas} frost nights.`
            : "Since July 2025 there were no frost nights."
        } Follow ${estTextoEn[estrategia] ?? estTextoEn.B}.${extraOpEn}`
      : idioma === "qu"
      ? `${distNombre} llaqtapi (${elevFmt} m) chakrapi ${cultivo} tarpuy. Julio 2025 watamanta ${heladas} tuta qasa karqan. ${estrategia} ñanta qatiy allpata yakutapas waqaychanapaq.${extraOpEs}`
      : `Siembra ${cultivo} en tu chacra de ${distNombre} (${elevFmt} m). ${
          heladas > 0
            ? `Desde julio de 2025 hubo ${heladas} noches de helada.`
            : "Desde julio de 2025 no hubo noches de helada."
        } Sigue ${estTextoEs[estrategia] ?? estTextoEs.B}.${extraOpEs}`;

  return {
    texto,
    modelo: "plantilla_fija",
    es_plantilla: true,
    motivo_plantilla: "sin_key",
    usado_cache: false,
    etiqueta_quechua: idioma === "qu" ? "Borrador de IA en quechua, sin revisar por un hablante nativo" : null,
    datos_usados: {
      parcela_id: parcela.id,
      distrito: distNombre,
      elev_dem_m: Math.round(parcela.elev_dem_m),
      estrategia_elegida: estrategia,
      cultivo_asignado: cultivo,
      dias_helada: heladas,
      oportunidades: oportunidades.map((o) => ({
        codigo: o.codigo,
        titulo: o.titulo,
        accion_positiva: o.accion_positiva,
      })),
    },
  };
}
