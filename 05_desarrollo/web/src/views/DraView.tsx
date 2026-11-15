import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EstadoBadge } from "../components/EstadoBadge";
import { FuenteDisclosure } from "../components/FuenteDisclosure";
import { MercadoSection } from "../components/MercadoSection";
import { getClimaMensual, getFuentes, getImergMensual, getMercadoPapa } from "../data/api";
import type { Fuente } from "../data/schemas";
import { useI18n } from "../i18n";

const NOMBRES_MES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct"];
const NOMBRES_MES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

export default function DraView() {
  const { lang, t } = useI18n();
  const climaQ = useQuery({ queryKey: ["clima-mensual"], queryFn: () => getClimaMensual() });
  const imergQ = useQuery({ queryKey: ["imerg-mensual"], queryFn: () => getImergMensual() });
  const mercadoQ = useQuery({ queryKey: ["mercado-papa"], queryFn: () => getMercadoPapa() });
  const fuentesQ = useQuery({ queryKey: ["fuentes"], queryFn: () => getFuentes() });

  if (climaQ.isLoading || imergQ.isLoading || mercadoQ.isLoading || fuentesQ.isLoading) {
    return (
      <div style={{ display: "grid", gap: "20px" }} aria-busy="true">
        <div className="muyu-skeleton" style={{ height: "280px" }} />
        <div className="muyu-skeleton" style={{ height: "280px" }} />
        <div className="muyu-skeleton" style={{ height: "280px" }} />
      </div>
    );
  }

  if (climaQ.error || imergQ.error || mercadoQ.error || !climaQ.data || !imergQ.data || !mercadoQ.data) {
    return (
      <div className="muyu-card" role="alert">
        <p style={{ margin: 0, fontWeight: 700 }}>{t("errorLoad")}</p>
      </div>
    );
  }

  const fuentesMap: Record<string, Fuente> = {};
  for (const f of fuentesQ.data ?? []) {
    fuentesMap[f.id] = f;
  }

  const monthNames = lang === "es" ? NOMBRES_MES_ES : NOMBRES_MES_EN;
  const serieHuanta = climaQ.data
    .filter((r) => r.cell_key === "c-26_-119")
    .map((r) => ({
      mes: monthNames[r.mes - 1] ?? String(r.mes),
      diferencia_c: typeof r.anomalia_t2m_c === "number" ? Number(r.anomalia_t2m_c.toFixed(1)) : 0,
    }));

  const imergData = imergQ.data.map((m) => ({
    mes: m.mes,
    lluvia_2026_mm: typeof m.total_2026_mm === "number" ? Number(m.total_2026_mm.toFixed(1)) : null,
    mediana_mm: typeof m.mediana_2001_2025_mm === "number" ? Number(m.mediana_2001_2025_mm.toFixed(1)) : null,
  }));

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <div
        className="muyu-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          borderLeft: "6px solid var(--quinua)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.35rem" }}>{t("draHeadline")}</h2>
        <button type="button" className="muyu-btn-primary no-print" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />
          <span>{t("draPrintBtn")}</span>
        </button>
      </div>

      {/* 1. Temperatura */}
      <section className="muyu-card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{t("draTempTitle")}</h3>
          <EstadoBadge estado="observado" />
        </div>

        <div className="muyu-chart-box" role="img" aria-label={t("draTempTitle")}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieHuanta}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C4D1CE" />
              <XAxis dataKey="mes" tick={{ fill: "#14303A" }} />
              <YAxis unit=" °C" tick={{ fill: "#14303A" }} />
              <Tooltip />
              <Legend />
              <ReferenceArea y1={-0.5} y2={0.5} fill="#9CC3D5" fillOpacity={0.35} />
              <ReferenceLine y={0} stroke="#14303A" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="diferencia_c"
                name="2026 (°C sobre lo normal)"
                stroke="#B83A00"
                strokeWidth={3}
                dot={{ r: 4, fill: "#B83A00" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <FuenteDisclosure
          fuente="NASA POWER MERRA-2"
          escala="~50 km (Huanta)"
          fecha="octubre de 2026"
          detalleTecnico={t("draTempTech")}
        />
      </section>

      {/* 2. Lluvia */}
      <section className="muyu-card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{t("draRainTitle")}</h3>
          <EstadoBadge estado="observado" />
        </div>

        <div className="muyu-chart-box" role="img" aria-label={t("draRainTitle")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={imergData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C4D1CE" />
              <XAxis dataKey="mes" tick={{ fill: "#14303A" }} />
              <YAxis unit=" mm" tick={{ fill: "#14303A" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="lluvia_2026_mm" name="2026 (mm)" fill="#003F6E" />
              <Bar dataKey="mediana_mm" name="Años anteriores (mm)" fill="#007755" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <FuenteDisclosure
          fuente="NASA GPM IMERG Late V07"
          escala="0.1° (~10 km)"
          fecha="octubre de 2026"
          detalleTecnico={t("draRainTech")}
        />
      </section>

      {/* 3. Mercado papa */}
      <MercadoSection mercado={mercadoQ.data} fuentesMap={fuentesMap} />
    </div>
  );
}
