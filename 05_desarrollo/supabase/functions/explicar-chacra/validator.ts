export type IdiomaIA = "es" | "en" | "qu";

export interface OportunidadResumenIA {
  codigo: string;
  titulo: string;
  accion_positiva: string;
  por_que_corto?: string;
  estado: string;
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
  oportunidades?: OportunidadResumenIA[];
}

export const ETIQUETA_QUECHUA =
  "Borrador automático en quechua — debe revisarlo un hablante";

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
  const matches = texto.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
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

  // 1. Verificar que todo número en la respuesta exista en los datos de entrada
  const datosSerializados = JSON.stringify(datos);
  const numerosPermitidos = new Set(extraerNumerosNormalizados(datosSerializados));
  // También permitir enteros redondeados de los flotantes presentes en datos
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

  // 2. Verificar que no mencione cultivos distintos al recomendado o a las oportunidades reales
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
  const heladaEs =
    datos.dias_helada > 0
      ? `Desde julio de 2025 hubo ${datos.dias_helada} noches de helada.`
      : `Desde julio de 2025 no hubo noches de helada.`;
  const estTexto = ESTRATEGIA_TEXTO_ES[datos.estrategia_elegida] ?? ESTRATEGIA_TEXTO_ES.B;
  const topOp = datos.oportunidades?.[0];

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
    const cierreEn = topOp ? `${topOp.codigo}: ${topOp.accion_positiva}` : `Follow ${estEn}.`;
    return `Plant ${datos.cultivo_asignado} on plot ${datos.parcela_id} (${datos.distrito}, ${Math.round(datos.elev_dem_m)} m). ${frostEn} ${cierreEn}`;
  }

  if (idioma === "qu") {
    return `${datos.parcela_id} chakrapi (${datos.distrito}, ${Math.round(datos.elev_dem_m)} m) ${datos.cultivo_asignado} tarpuy. Julio 2025 watamanta ${datos.dias_helada} tuta qasa karqan. ${datos.estrategia_elegida} ñanta qatiy allpata yakutapas waqaychanapaq.`;
  }

  const cierreEs = topOp ? topOp.accion_positiva : `Sigue ${estTexto}.`;
  return `Siembra ${datos.cultivo_asignado} en tu chacra ${datos.parcela_id} (${datos.distrito}, ${Math.round(datos.elev_dem_m)} m). ${heladaEs} ${cierreEs}`;
}
