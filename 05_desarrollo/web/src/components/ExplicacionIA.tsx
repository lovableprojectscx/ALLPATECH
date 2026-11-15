import { useState } from "react";
import { Sparkles } from "lucide-react";
import { explicarChacra, type ExplicacionIAResponse } from "../data/api";
import type { Parcela, PlanRotacionContract } from "../data/schemas";
import { useI18n } from "../i18n";

interface ExplicacionIAProps {
  parcela: Parcela;
  planItem?: PlanRotacionContract["plan"][number];
}

export function ExplicacionIA({ parcela, planItem }: ExplicacionIAProps) {
  const { lang, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ExplicacionIAResponse | null>(null);
  const [idiomaActivo, setIdiomaActivo] = useState<"es" | "en" | "qu" | null>(null);

  const pedirExplicacion = async (idioma: "es" | "en" | "qu") => {
    setLoading(true);
    setIdiomaActivo(idioma);
    try {
      const res = await explicarChacra(parcela, planItem, idioma);
      setResultado(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <button
          type="button"
          className="muyu-btn-secondary"
          disabled={loading}
          onClick={() => void pedirExplicacion(lang)}
        >
          <Sparkles size={16} aria-hidden="true" />
          <span>{loading && idiomaActivo !== "qu" ? t("explainLoading") : t("explainSimpleBtn")}</span>
        </button>

        <button
          type="button"
          className="muyu-btn-secondary"
          disabled={loading}
          onClick={() => void pedirExplicacion("qu")}
          style={{ fontSize: "0.85rem", padding: "8px 12px" }}
        >
          <span>{loading && idiomaActivo === "qu" ? t("explainLoading") : t("explainQuechuaBtn")}</span>
        </button>
      </div>

      {resultado ? (
        <div
          style={{
            padding: "14px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--papel-calido)",
            border: "1px solid var(--borde)",
            display: "grid",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                borderRadius: "999px",
                backgroundColor: "var(--hielo)",
                color: "var(--noche)",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <Sparkles size={13} aria-hidden="true" />
              {t("explainBadge")}
            </span>
            {resultado.etiqueta_quechua ? (
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--est-a)" }}>
                {resultado.etiqueta_quechua}
              </span>
            ) : null}
          </div>

          <p style={{ margin: 0, lineHeight: 1.5, fontSize: "1rem" }}>{resultado.texto}</p>

          <details style={{ fontSize: "0.85rem", color: "var(--noche-suave)" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>{t("explainSeeData")}</summary>
            <pre
              style={{
                marginTop: "6px",
                padding: "8px",
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--borde)",
                overflowX: "auto",
                fontSize: "0.78rem",
              }}
            >
              {JSON.stringify(resultado.datos_usados, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
