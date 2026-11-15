import type { EstadoDato } from "../data/schemas";
import { useI18n } from "../i18n";

interface EstadoBadgeProps {
  estado: EstadoDato;
  fuente?: string;
  datoHasta?: string;
}

const ESTILO_ESTADO: Record<
  EstadoDato,
  { bg: string; fg: string; border: string }
> = {
  observado: { bg: "#007755", fg: "#FFFFFF", border: "#007755" },
  estimado: { bg: "#003F6E", fg: "#FFFFFF", border: "#003F6E" },
  ilustrativo: { bg: "#B83A00", fg: "#FFFFFF", border: "#B83A00" },
  no_disponible: { bg: "#4B5563", fg: "#FFFFFF", border: "#4B5563" },
};

function EstadoIcono({ estado }: { estado: EstadoDato }) {
  if (estado === "observado") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill="currentColor" />
      </svg>
    );
  }
  if (estado === "estimado") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 1.5 A4.5 4.5 0 0 0 6 10.5 Z" fill="currentColor" />
      </svg>
    );
  }
  if (estado === "ilustrativo") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle
          cx="6"
          cy="6"
          r="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="2.5 2"
        />
      </svg>
    );
  }
  return (
    <span aria-hidden="true" style={{ fontWeight: 700, lineHeight: 1 }}>
      —
    </span>
  );
}

export function EstadoBadge({ estado, fuente, datoHasta }: EstadoBadgeProps) {
  const { t } = useI18n();
  const st = ESTILO_ESTADO[estado];
  const labelMap: Record<EstadoDato, string> = {
    observado: t("estadoObservado"),
    estimado: t("estadoEstimado"),
    ilustrativo: t("estadoIlustrativo"),
    no_disponible: t("estadoNoDisponible"),
  };

  return (
    <span
      data-estado={estado}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.8125rem",
        padding: "3px 10px",
        borderRadius: "999px",
        backgroundColor: st.bg,
        color: st.fg,
        border: `1px solid ${st.border}`,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
      title={fuente ? `${fuente}` : undefined}
    >
      <EstadoIcono estado={estado} />
      <span>{labelMap[estado]}</span>
      {datoHasta ? <span style={{ opacity: 0.92 }}>· {datoHasta}</span> : null}
    </span>
  );
}
