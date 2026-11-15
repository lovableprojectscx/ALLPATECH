import type { DictKey } from "../i18n";
import type { OportunidadCooperativa, OportunidadItem } from "./schemas";

type OpLike = Pick<
  OportunidadItem | OportunidadCooperativa,
  "codigo" | "titulo" | "accion_positiva" | "por_que_corto" | "nota"
> & {
  valores_json?: Record<string, unknown>;
};

export function normalizarTextoHelada(texto: string): string {
  return texto.replace(
    /Esta campaña hubo (\d+) noches con helada/gi,
    "Desde julio de 2025: $1 noches con helada"
  );
}

const OP_KEYS: Record<string, { title: DictKey; text: DictKey }> = {
  O1: { title: "opO1Title", text: "opO1Text" },
  O2: { title: "opO2Title", text: "opO2Text" },
  O3: { title: "opO3Title", text: "opO3Text" },
  O4: { title: "opO4Title", text: "opO4Text" },
  O5: { title: "opO5Title", text: "opO5Text" },
  O6: { title: "opO6Title", text: "opO6Text" },
};

export function formatOportunidadCard(
  op: OpLike,
  t: (key: DictKey) => string,
  fallbackValores?: Record<string, unknown>
): { titulo: string; frase: string; detalle: string } {
  const keys = OP_KEYS[op.codigo];
  const vals = op.valores_json ?? fallbackValores ?? {};

  const titulo = keys ? t(keys.title) : op.titulo;
  let frase = keys ? t(keys.text) : op.accion_positiva;

  if (op.codigo === "O2") {
    const mesInicio = String(vals.ventana_inicio_mes ?? "noviembre");
    const mesFin = String(vals.ventana_fin_mes ?? "marzo");
    frase = frase.replace("{mes_inicio}", mesInicio).replace("{mes_fin}", mesFin);
  } else if (op.codigo === "O3") {
    const fecha = String(vals.fecha_estimada_2026_texto ?? "30 de diciembre");
    const n = String(vals.adelanto_dias ?? 10);
    frase = frase.replace("{fecha}", fecha).replace("{n}", n);
  }

  const accion = normalizarTextoHelada(op.accion_positiva);
  const porque = normalizarTextoHelada(op.por_que_corto);
  const nota = op.nota ? ` (${op.nota})` : "";
  const detalle = `${accion} ${porque}${nota}`.trim();

  return { titulo, frase, detalle };
}
