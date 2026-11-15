import type { PlanRotacionContract } from "../data/schemas";
import { useI18n } from "../i18n";
import { EstadoBadge } from "./EstadoBadge";

interface ComparadorABCProps {
  parcelaComp: PlanRotacionContract["comparador"][number];
}

function simplificarMotivo(motivo: string): string {
  return motivo
    .replace(/Indice de sobreoferta I_m/gi, "Dato de mercado")
    .replace(/\bI_m\b/g, "riesgo de mercado");
}

export function ComparadorABC({ parcelaComp }: ComparadorABCProps) {
  const { t } = useI18n();
  const estrategias = ["A", "B", "C"].map((k) => parcelaComp.estrategias[k]).filter(Boolean);

  const axisLabels: Record<string, string> = {
    aptitud_termica_y_suelo: t("axisThermal"),
    resiliencia_climatica: t("axisClimate"),
    salud_suelo_y_rotacion: t("axisSoil"),
    mercado_y_sobreoferta: t("axisMarket"),
    riesgo_plagas: t("axisPests"),
  };

  const bandLabels: Record<string, string> = {
    alto: t("bandAlto"),
    medio: t("bandMedio"),
    bajo: t("bandBajo"),
    evidencia_insuficiente: t("bandInsuf"),
  };

  return (
    <section aria-label={t("comparatorHeading")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
          {t("comparatorHeading")} — {parcelaComp.parcela_id} ({parcelaComp.distrito})
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
        {estrategias.map((est) => (
          <article
            key={est.codigo}
            style={{
              border: `2px solid ${est.color_hex}`,
              borderRadius: "var(--radius-md)",
              padding: "14px",
              backgroundColor: "var(--blanco)",
            }}
          >
            <header style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 10px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: est.color_hex,
                  color: "#FFFFFF",
                  fontWeight: 700,
                }}
              >
                {est.forma} {est.codigo}
              </span>
              <strong style={{ fontSize: "1.05rem" }}>{est.nombre}</strong>
            </header>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
              {Object.entries(est.radar_bandas).map(([eje, info]) => (
                <li
                  key={eje}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    borderBottom: "1px solid var(--borde)",
                    paddingBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span>{axisLabels[eje] ?? eje}</span>
                    <strong>{bandLabels[info.banda] ?? info.banda}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <EstadoBadge estado={info.estado} datoHasta={info.dato_hasta} />
                    {info.motivo ? <small style={{ color: "var(--noche-suave)" }}>{simplificarMotivo(info.motivo)}</small> : null}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
