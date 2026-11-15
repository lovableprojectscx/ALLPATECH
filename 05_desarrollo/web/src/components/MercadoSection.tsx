import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Fuente, MercadoMes } from "../data/schemas";
import { useI18n } from "../i18n";
import { EstadoBadge } from "./EstadoBadge";
import { FuenteDisclosure } from "./FuenteDisclosure";

interface MercadoSectionProps {
  mercado: MercadoMes[];
  fuentesMap: Record<string, Fuente>;
}

function formatMiles(val: number): string {
  return Math.round(val)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function MercadoSection({ mercado, fuentesMap }: MercadoSectionProps) {
  const { t } = useI18n();
  // Excluir nov 2026 incompleto (mes en curso hasta el día 13) para no mostrar un falso desplome
  const filasCompletas = mercado.filter(
    (m) => m.anio >= 2024 && !(m.anio === 2026 && m.mes === 11)
  );

  const chartData = filasCompletas.map((m) => ({
    label: `${m.anio}-${String(m.mes).padStart(2, "0")}`,
    toneladas: Math.round(m.ingreso_t),
  }));

  return (
    <section className="muyu-card" aria-label={t("draMarketTitle")}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{t("draMarketTitle")}</h3>
        <EstadoBadge estado="observado" />
      </div>

      <p style={{ fontSize: "1rem", color: "var(--noche-suave)", marginTop: 0 }}>
        {t("draMarketNote")}
      </p>

      <div
        style={{
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
          borderLeft: "4px solid var(--est-a)",
          backgroundColor: "var(--niebla)",
          marginBottom: "14px",
          fontWeight: 600,
        }}
      >
        {t("draMarketPrueba2")}
      </div>

      <div className="muyu-chart-box" style={{ marginBottom: "8px" }} role="img" aria-label={t("draMarketTitle")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 16, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C4D1CE" />
            <XAxis dataKey="label" tick={{ fill: "#14303A", fontSize: 12 }} />
            <YAxis
              width={72}
              tick={{ fill: "#14303A", fontSize: 12 }}
              tickFormatter={formatMiles}
              label={{ value: "toneladas", angle: -90, position: "insideLeft", fill: "#14303A", fontSize: 12 }}
            />
            <Tooltip formatter={(val: number) => [`${formatMiles(val)} toneladas`, "Ingreso"]} />
            <Bar dataKey="toneladas" name="Toneladas al mes" fill="#003F6E" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <FuenteDisclosure
        fuente={fuentesMap["emmsa_siea"]?.nombre ?? "EMMSA / MIDAGRI-SIEA"}
        escala="Mercado Mayorista Lima (GMML)"
        fecha="noviembre de 2026"
        detalleTecnico={t("draMarketTech")}
      />
    </section>
  );
}
