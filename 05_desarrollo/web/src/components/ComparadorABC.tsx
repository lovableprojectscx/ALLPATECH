import { getParcelaNombre } from "../data/nombres";
import type { PlanRotacionContract } from "../data/schemas";
import { useI18n } from "../i18n";
import { EstadoBadge } from "./EstadoBadge";

interface ComparadorABCProps {
  parcelaComp: PlanRotacionContract["comparador"][number];
}

export function ComparadorABC({ parcelaComp }: ComparadorABCProps) {
  const { t } = useI18n();
  const estrategias = ["A", "B", "C"].map((k) => parcelaComp.estrategias[k]).filter(Boolean);

  const axisLabels: Record<string, string> = {
    aptitud_termica_y_suelo: t("axisThermal"),
    resiliencia_climatica: t("axisClimate"),
    salud_suelo_y_rotacion: t("axisSoil"),
    mercado_y_sobreoferta: t("axisMarket"),
  };

  const bandLabels: Record<string, string> = {
    alto: t("bandAlto"),
    medio: t("bandMedio"),
    bajo: t("bandBajo"),
    evidencia_insuficiente: t("bandInsuf"),
  };

  const nombreParcela = getParcelaNombre(parcelaComp.parcela_id, parcelaComp.distrito);

  return (
    <section aria-label={t("comparatorHeading")}>
      <div style={{ marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
          {t("comparatorHeading")} — {nombreParcela}{" "}
          <span style={{ color: "var(--noche-suave)", fontSize: "0.9rem", fontWeight: 400 }}>
            ({parcelaComp.parcela_id})
          </span>
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
        {estrategias.map((est) => {
          const ejesVisibles = Object.entries(est.radar_bandas).filter(([eje]) => eje !== "riesgo_plagas");
          return (
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
                {ejesVisibles.map(([eje, info]) => (
                  <li
                    key={eje}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      borderBottom: "1px solid var(--borde)",
                      paddingBottom: "8px",
                    }}
                  >
                    <span>{axisLabels[eje] ?? eje}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong>{bandLabels[info.banda] ?? info.banda}</strong>
                      <EstadoBadge estado={info.estado} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <p style={{ margin: "10px 0 0", fontSize: "0.9rem", color: "var(--noche-suave)" }}>
        {t("pestsNextPhase")}
      </p>
    </section>
  );
}
