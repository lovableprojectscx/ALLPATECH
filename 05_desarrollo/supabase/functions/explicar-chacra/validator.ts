export type IdiomaIA = "es" | "en" | "qu";

export interface OportunidadIA {
  codigo: string;
  titulo: string;
  accion_positiva: string;
  por_que_corto?: string;
  estado?: string;
  nota?: string;
  valores?: Record<string, unknown>;
}

export interface DatosChacraIA {
  parcela_id: string;
  distrito: string;
  elev_dem_m: number;
  estrategia_elegida: "A" | "B" | "C";
  cultivo_asignado: string;
  dias_helada: number;
  humedad_suelo_pct: number | "no disponible";
  ph_suelo: number | "no disponible";
  ndvi_ultimo: number | "no disponible";
  enis_papa_ayacucho_pct: number | "no disponible";
  lluvia_oct_anomalia_pct: number | "no disponible";
  oportunidades?: OportunidadIA[];
}

export const ETIQUETA_QUECHUA =
  "Borrador automático en quechua — debe revisarlo un hablante";

const DISTRITOS_NOMBRES: Record<string, string> = {
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
};

export function formatearDistrito(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (DISTRITOS_NOMBRES[key]) return DISTRITOS_NOMBRES[key];
  const base = key.replace(/_alta_\d+$/i, "").replace(/_/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const CULTIVOS_CONOCIDOS = [
  "papa",
  "quinua",
  "tarwi",
  "haba",
  "maiz",
  "maíz",
  "cebada",
  "trigo",
  "tuna",
  "oca",
  "olluco",
  "mashua",
  "avena",
  "alfalfa",
];

function extraerNumerosNormalizados(texto: string): string[] {
  // Normalizar separadores de miles como 3,682 -> 3682 antes de extraer decimales
  const sinMiles = texto.replace(/(\d),(\d{3})(?!\d)/g, "$1$2");
  const matches = sinMiles.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  return matches.map((m) => m.replace(",", "."));
}

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Valida que la respuesta de Gemini no invente números ni mencione cultivos no recomendados.
 */
export function validarRespuestaIA(
  respuesta: string,
  datos: DatosChacraIA
): { valida: boolean; motivo?: string } {
  const limpio = respuesta.trim();
  if (!limpio) {
    return { valida: false, motivo: "respuesta_vacia" };
  }

  // 1. Verificar que todo número en la respuesta exista en los datos de entrada (o años 2025/2026)
  const datosSerializados = JSON.stringify(datos);
  const numerosPermitidos = new Set(extraerNumerosNormalizados(datosSerializados));
  numerosPermitidos.add("2025");
  numerosPermitidos.add("2026");

  for (const n of Array.from(numerosPermitidos)) {
    const num = Number(n);
    if (!Number.isNaN(num)) {
      numerosPermitidos.add(String(Math.round(num)));
      numerosPermitidos.add(String(Math.abs(Math.round(num))));
      numerosPermitidos.add(num.toFixed(1));
      numerosPermitidos.add(num.toFixed(2));
    }
  }

  const numerosEnRespuesta = extraerNumerosNormalizados(limpio);
  for (const numResp of numerosEnRespuesta) {
    const absNorm = numResp.startsWith("-") ? numResp.slice(1) : numResp;
    if (!numerosPermitidos.has(numResp) && !numerosPermitidos.has(absNorm)) {
      return { valida: false, motivo: `numero_no_presente:${numResp}` };
    }
  }

  // 2. Verificar que no mencione cultivos distintos al recomendado (o a sus oportunidades)
  const respNorm = normalizarTexto(limpio);
  const recNorm = normalizarTexto(datos.cultivo_asignado);
  const opsNorm = normalizarTexto(JSON.stringify(datos.oportunidades ?? []));
  for (const cultivo of CULTIVOS_CONOCIDOS) {
    const cNorm = normalizarTexto(cultivo);
    const regex = new RegExp(`\\b${cNorm}\\b`, "i");
    if (regex.test(respNorm) && !recNorm.includes(cNorm) && !opsNorm.includes(cNorm)) {
      return { valida: false, motivo: `cultivo_no_recomendado:${cNorm}` };
    }
  }

  return { valida: true };
}

const ESTRATEGIA_TEXTO_ES: Record<"A" | "B" | "C", string> = {
  A: "la que busca mejor precio",
  B: "la que reparte el riesgo (como la quinua)",
  C: "la que cuida el suelo (como el tarwi)",
};

/**
 * Plantilla fija determinista (sin IA) usando solo datos verificados.
 */
export function generarPlantillaFija(
  datos: DatosChacraIA,
  idioma: IdiomaIA
): string {
  const distritoNombre = formatearDistrito(datos.distrito);
  const elevFmt = Math.round(datos.elev_dem_m).toLocaleString("en-US");
  const heladaEs =
    datos.dias_helada > 0
      ? `Desde julio de 2025 hubo ${datos.dias_helada} noches de helada.`
      : `Desde julio de 2025 no hubo noches de helada.`;
  const estTexto = ESTRATEGIA_TEXTO_ES[datos.estrategia_elegida] ?? ESTRATEGIA_TEXTO_ES.B;
  const opPrincipal = datos.oportunidades?.[0]?.accion_positiva;
  const extraOpEs = opPrincipal ? ` Oportunidad clave: ${opPrincipal}` : "";
  const extraOpEn = opPrincipal ? ` Key opportunity: ${opPrincipal}` : "";

  if (idioma === "en") {
    const frostEn =
      datos.dias_helada > 0
        ? `Since July 2025 there were ${datos.dias_helada} frost nights.`
        : `Since July 2025 there were no frost nights.`;
    const estEn =
      datos.estrategia_elegida === "A"
        ? "the option seeking a better price"
        : datos.estrategia_elegida === "C"
        ? "the option that cares for the soil (like tarwi)"
        : "the option that spreads risk (like quinoa)";
    return `Plant ${datos.cultivo_asignado} on your plot in ${distritoNombre} (${elevFmt} m). ${frostEn} Follow ${estEn}.${extraOpEn}`;
  }

  if (idioma === "qu") {
    return `${distritoNombre} llaqtapi (${elevFmt} m) chakrapi ${datos.cultivo_asignado} tarpuy. Julio 2025 watamanta ${datos.dias_helada} tuta qasa karqan. ${datos.estrategia_elegida} ñanta qatiy allpata yakutapas waqaychanapaq.${extraOpEs}`;
  }

  return `Siembra ${datos.cultivo_asignado} en tu chacra de ${distritoNombre} (${elevFmt} m). ${heladaEs} Sigue ${estTexto}.${extraOpEs}`;
}
