import { CloudRain, Snowflake, Sprout, Sun, TrendingUp } from "lucide-react";
import type { CalendarioChacra as CalendarioChacraType } from "../data/schemas";
import { useI18n } from "../i18n";

interface CalendarioChacraProps {
  calendario: CalendarioChacraType;
  modo?: "completa" | "simple";
  titulo?: string;
}

export function CalendarioChacra({
  calendario,
  modo = "completa",
  titulo,
}: CalendarioChacraProps) {
  const { lang, t } = useI18n();
  const isSimple = modo === "simple";
  const meses = calendario.meses;

  const mostrarLluvia = !isSimple;
  const mostrarTuna = calendario.tiene_tuna;
  const mostrarPrecioPapa = !isSimple && calendario.tiene_papa_en_plan;

  const colStart = 96;
  const colW = 52;
  const rowH = 34;

  // Construcción dinámica de filas según modo y aplicabilidad de la chacra
  type FilaDef = { id: string; label: string; y: number };
  const filas: FilaDef[] = [];
  let cursorY = 34;

  filas.push({
    id: "siembra",
    label: lang === "en" ? "Plant / Grow" : "Siembra",
    y: cursorY,
  });
  cursorY += rowH + 6;

  filas.push({
    id: "helada",
    label: lang === "en" ? "Frost risk" : "Helada",
    y: cursorY,
  });
  cursorY += rowH + 6;

  if (mostrarLluvia) {
    filas.push({
      id: "lluvia",
      label: lang === "en" ? "Rains" : "Lluvias",
      y: cursorY,
    });
    cursorY += rowH + 6;
  }

  if (mostrarTuna) {
    filas.push({
      id: "tuna",
      label: lang === "en" ? "Prickly pear" : "Tuna",
      y: cursorY,
    });
    cursorY += rowH + 6;
  }

  if (mostrarPrecioPapa) {
    filas.push({
      id: "precio",
      label: lang === "en" ? "Lima ref." : "Precio ref.",
      y: cursorY,
    });
    cursorY += rowH + 6;
  }

  const svgWidth = colStart + meses.length * colW + 12;
  const svgHeight = cursorY + 8;

  const filaPorId = Object.fromEntries(filas.map((f) => [f.id, f])) as Record<string, FilaDef>;

  // Índice del último mes seguro (cosecha antes del retorno de heladas en modo simple)
  const ultimoSeguroIdx = meses.reduce(
    (acc, m, idx) => (m.ventana_segura ? idx : acc),
    -1
  );

  return (
    <div
      className="muyu-calendario-box"
      style={{
        border: "1px solid var(--borde)",
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        background: "var(--blanco)",
        marginTop: 12,
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <strong style={{ fontSize: "0.98rem", color: "var(--noche)" }}>
          {titulo ?? t("calendarHeading")}
        </strong>
        <span className="muyu-muted" style={{ fontSize: "0.82rem" }}>
          {lang === "en" ? "Aug 2026 – Jul 2027" : "Ago 2026 – Jul 2027"}
        </span>
      </div>

      {/* Leyenda visual: color + icono/forma + palabra */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 14px",
          fontSize: "0.82rem",
          marginBottom: 10,
          color: "var(--noche)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Sprout size={14} aria-hidden="true" color="#007755" />
          <span>● {t("calendarLegendSafe")}</span>
        </span>
        {calendario.tiene_helada && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Snowflake size={14} aria-hidden="true" color="#003F6E" />
            <span>■ {t("calendarLegendFrost")}</span>
          </span>
        )}
        {mostrarLluvia && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CloudRain size={14} aria-hidden="true" color="#003F6E" />
            <span>◆ {t("calendarLegendRain")}</span>
          </span>
        )}
        {mostrarTuna && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Sun size={14} aria-hidden="true" color="#B83A00" />
            <span>▲ {t("calendarLegendTuna")}</span>
          </span>
        )}
        {mostrarPrecioPapa && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={14} aria-hidden="true" color="#007755" />
            <span>▲ {t("calendarLegendPriceHigh")} / ▼ {t("calendarLegendPriceLow")}</span>
          </span>
        )}
      </div>

      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <svg
          role="img"
          aria-label={calendario.aria_label}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: "100%",
            minWidth: 620,
            height: "auto",
            display: "block",
            fontFamily: "var(--font-body)",
          }}
        >
          {/* Cabecera de meses Ago–Jul */}
          {meses.map((m, idx) => {
            const x = colStart + idx * colW;
            return (
              <g key={m.mes_num}>
                <rect
                  x={x + 1}
                  y={2}
                  width={colW - 2}
                  height={24}
                  rx={4}
                  fill="#EEF2F1"
                />
                <text
                  x={x + colW / 2}
                  y={18}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="#14303A"
                >
                  {m.mes_corto}
                </text>
                <line
                  x1={x}
                  y1={28}
                  x2={x}
                  y2={svgHeight - 4}
                  stroke="#E2E8E6"
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* Etiquetas de fila */}
          {filas.map((f) => (
            <text
              key={f.id}
              x={4}
              y={f.y + 21}
              fontSize={12}
              fontWeight={700}
              fill="#14303A"
            >
              {f.label}
            </text>
          ))}

          {/* Fila: Siembra / ventana segura */}
          {meses.map((m, idx) => {
            const x = colStart + idx * colW + 2;
            const y = filaPorId.siembra.y;
            const esCosechaSimple =
              isSimple && calendario.tiene_helada && idx === ultimoSeguroIdx;
            if (!m.ventana_segura) {
              return (
                <text
                  key={`s-${m.mes_num}`}
                  x={x + (colW - 4) / 2}
                  y={y + 21}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#6B7280"
                >
                  —
                </text>
              );
            }
            return (
              <g key={`s-${m.mes_num}`}>
                <rect
                  x={x}
                  y={y + 2}
                  width={colW - 4}
                  height={rowH - 4}
                  rx={5}
                  fill={esCosechaSimple ? "#FDF3D7" : "#DFF2E8"}
                  stroke={esCosechaSimple ? "#B83A00" : "#007755"}
                  strokeWidth={1.2}
                />
                <text
                  x={x + (colW - 4) / 2}
                  y={y + 21}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  fill={esCosechaSimple ? "#7C2D12" : "#005A40"}
                >
                  {esCosechaSimple ? "● Cos." : "● Ok"}
                </text>
              </g>
            );
          })}

          {/* Fila: Helada */}
          {meses.map((m, idx) => {
            const x = colStart + idx * colW + 2;
            const y = filaPorId.helada.y;
            if (!m.riesgo_helada) {
              return (
                <text
                  key={`h-${m.mes_num}`}
                  x={x + (colW - 4) / 2}
                  y={y + 21}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#6B7280"
                >
                  —
                </text>
              );
            }
            return (
              <g key={`h-${m.mes_num}`}>
                <rect
                  x={x}
                  y={y + 2}
                  width={colW - 4}
                  height={rowH - 4}
                  rx={5}
                  fill="#DCEBF5"
                  stroke="#003F6E"
                  strokeWidth={1.2}
                />
                <text
                  x={x + (colW - 4) / 2}
                  y={y + 21}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#003F6E"
                >
                  ■ Frío
                </text>
              </g>
            );
          })}

          {/* Fila: Lluvias (modo completa) */}
          {mostrarLluvia &&
            filaPorId.lluvia &&
            meses.map((m, idx) => {
              const x = colStart + idx * colW + 2;
              const y = filaPorId.lluvia.y;
              if (!m.inicio_normal_lluvias) {
                return (
                  <text
                    key={`l-${m.mes_num}`}
                    x={x + (colW - 4) / 2}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#6B7280"
                  >
                    —
                  </text>
                );
              }
              return (
                <g key={`l-${m.mes_num}`}>
                  <rect
                    x={x}
                    y={y + 2}
                    width={colW - 4}
                    height={rowH - 4}
                    rx={5}
                    fill="#E6EEF7"
                    stroke="#003F6E"
                    strokeWidth={1.2}
                    strokeDasharray={m.lluvias_2026_pendientes ? "3 2" : undefined}
                  />
                  <text
                    x={x + (colW - 4) / 2}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="#003F6E"
                  >
                    ◆ Pend.
                  </text>
                </g>
              );
            })}

          {/* Fila: Tuna (si aplica) */}
          {mostrarTuna &&
            filaPorId.tuna &&
            meses.map((m, idx) => {
              const x = colStart + idx * colW + 2;
              const y = filaPorId.tuna.y;
              if (!m.cosecha_tuna) {
                return (
                  <text
                    key={`t-${m.mes_num}`}
                    x={x + (colW - 4) / 2}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#6B7280"
                  >
                    —
                  </text>
                );
              }
              return (
                <g key={`t-${m.mes_num}`}>
                  <rect
                    x={x}
                    y={y + 2}
                    width={colW - 4}
                    height={rowH - 4}
                    rx={5}
                    fill="#FBE7DD"
                    stroke="#B83A00"
                    strokeWidth={1.3}
                  />
                  <text
                    x={x + (colW - 4) / 2}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="#B83A00"
                  >
                    ▲ Tuna
                  </text>
                </g>
              );
            })}

          {/* Fila: Precio referencia papa (solo P10 en modo completa) */}
          {mostrarPrecioPapa &&
            filaPorId.precio &&
            meses.map((m, idx) => {
              const x = colStart + idx * colW + 2;
              const y = filaPorId.precio.y;
              if (!m.precio_papa_bajo && !m.precio_papa_alto) {
                return (
                  <text
                    key={`p-${m.mes_num}`}
                    x={x + (colW - 4) / 2}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#6B7280"
                  >
                    —
                  </text>
                );
              }
              const esAlto = m.precio_papa_alto;
              return (
                <g key={`p-${m.mes_num}`}>
                  <rect
                    x={x}
                    y={y + 2}
                    width={colW - 4}
                    height={rowH - 4}
                    rx={5}
                    fill={esAlto ? "#DFF2E8" : "#FBE7DD"}
                    stroke={esAlto ? "#007755" : "#B83A00"}
                    strokeWidth={1.2}
                  />
                  <text
                    x={x + (colW - 4) / 2}
                    y={y + 21}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill={esAlto ? "#005A40" : "#B83A00"}
                  >
                    {esAlto ? "▲ Alto" : "▼ Bajo"}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      <p
        data-calendario-resumen="true"
        style={{
          margin: "10px 0 0",
          fontSize: "0.94rem",
          fontWeight: 600,
          color: "var(--noche)",
        }}
      >
        {calendario.frase_resumen}
      </p>
      {mostrarPrecioPapa && (
        <p className="muyu-muted" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
          Precios de papa en Lima (EMMSA): referencia de años anteriores, no pronóstico. Varía mucho (en marzo de 2026 llegó a S/ 1.81).
        </p>
      )}
    </div>
  );
}
