import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useI18n } from "../i18n";

interface FuenteDisclosureProps {
  fuente: string;
  escala: string;
  fecha: string;
  detalleTecnico: string;
}

export function FuenteDisclosure({ fuente, escala, fecha, detalleTecnico }: FuenteDisclosureProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: "8px" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          minHeight: "48px",
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          color: "var(--quinua)",
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          textDecoration: "underline",
        }}
      >
        <Info size={16} aria-hidden="true" />
        <span>{t("seeDataSource")}</span>
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>

      {open ? (
        <div
          style={{
            marginTop: "6px",
            padding: "12px 14px",
            backgroundColor: "var(--niebla)",
            border: "1px solid var(--borde)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.92rem",
            color: "var(--noche)",
            lineHeight: 1.5,
          }}
        >
          <div>
            <strong>{t("sourceLabel")}:</strong> {fuente} · <strong>{t("scaleLabel")}:</strong> {escala} ·{" "}
            <strong>{t("dateLabel")}:</strong> {fecha}
          </div>
          <div style={{ marginTop: "4px", color: "var(--noche-suave)" }}>{detalleTecnico}</div>
        </div>
      ) : null}
    </div>
  );
}
