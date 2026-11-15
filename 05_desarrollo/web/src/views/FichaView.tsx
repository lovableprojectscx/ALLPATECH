import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Calendar, Check, Copy, Printer, Sparkles, Sprout } from "lucide-react";
import { CalendarioChacra } from "../components/CalendarioChacra";
import { ExplicacionIA } from "../components/ExplicacionIA";
import { MuyuLogo } from "../components/MuyuLogo";
import { getOportunidades, getParcelas, getPlanRotacion } from "../data/api";
import { getParcelaNombre } from "../data/nombres";
import { useI18n } from "../i18n";

interface FichaViewProps {
  parcelaId?: string;
  onSelectParcela?: (id: string) => void;
  soloAgricultor?: boolean;
}

export default function FichaView({
  parcelaId: controlledId,
  onSelectParcela,
  soloAgricultor = false,
}: FichaViewProps) {
  const { t } = useI18n();
  const [internalId, setInternalId] = useState("P01");
  const parcelaId = controlledId ?? internalId;
  const setParcelaId = (id: string) => {
    setInternalId(id);
    onSelectParcela?.(id);
  };

  const [copied, setCopied] = useState(false);

  const parcelasQ = useQuery({ queryKey: ["parcelas"], queryFn: () => getParcelas() });
  const planQ = useQuery({ queryKey: ["plan-rotacion"], queryFn: () => getPlanRotacion() });
  const oportunidadesQ = useQuery({ queryKey: ["oportunidades"], queryFn: () => getOportunidades() });

  if (parcelasQ.isLoading || planQ.isLoading) {
    return (
      <div className="muyu-card" aria-busy="true">
        <div className="muyu-skeleton" style={{ height: "260px" }} />
      </div>
    );
  }

  if (parcelasQ.error || planQ.error || !parcelasQ.data || !planQ.data) {
    return (
      <div className="muyu-card" role="alert">
        <p style={{ margin: 0, fontWeight: 700 }}>{t("errorLoad")}</p>
      </div>
    );
  }

  const parcela = parcelasQ.data.find((p) => p.id === parcelaId) ?? parcelasQ.data[0];
  const planItem = planQ.data.plan.find((p) => p.parcela_id === parcela.id) ?? planQ.data.plan[0];
  const parcelaOps = oportunidadesQ.data?.por_parcela.find((o) => o.parcela_id === parcela.id);
  const oportunidadFicha = parcelaOps?.oportunidad_ficha;
  const nombreChacra = getParcelaNombre(parcela.id, parcela.distrito);

  const msgWhatToPlant = `${planItem.forma} ${t("recommendPrefix")} ${planItem.cultivo_asignado}`;
  const msgWhen = t("fichaWhenText");
  const msgWhatToWatch =
    parcela.clima_campana_2025_2026.dias_helada > 0 ? t("fichaWatchFrost") : t("fichaWatchDry");

  const whatsappText = [
    `🌱 Kultiva · ${nombreChacra}`,
    `📅 ${t("fichaCampaign")}`,
    `1) ${t("fichaWhatToPlant")}: ${msgWhatToPlant}`,
    `2) ${t("fichaWhen")}: ${msgWhen}`,
    `3) ${t("fichaWhatToWatch")}: ${msgWhatToWatch}`,
    oportunidadFicha ? `★ ${t("fichaOpportunityTitle")}: ${oportunidadFicha.accion_ficha}` : "",
    `${t("fichaQuechuaPending")}.`,
    `"${t("fichaClosing")}"`,
  ]
    .filter(Boolean)
    .join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div className="no-print" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="ficha-parcela" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
          {t("chooseYourPlot")}:
        </label>
        <select
          id="ficha-parcela"
          value={parcelaId}
          onChange={(e) => setParcelaId(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: "1.05rem",
            minHeight: "48px",
            borderRadius: "var(--radius-sm)",
            border: "2px solid var(--noche)",
            backgroundColor: "var(--blanco)",
            color: "var(--noche)",
            fontWeight: 600,
          }}
        >
          {parcelasQ.data.map((p) => (
            <option key={p.id} value={p.id}>
              {getParcelaNombre(p.id, p.distrito)}
            </option>
          ))}
        </select>

        {!soloAgricultor ? (
          <button type="button" className="muyu-btn-primary" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            <span>{t("fichaPrint")}</span>
          </button>
        ) : null}

        <button
          type="button"
          className={soloAgricultor ? "muyu-btn-primary" : "muyu-btn-secondary"}
          onClick={handleCopy}
        >
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          <span>{copied ? t("fichaCopied") : t("fichaCopyWa")}</span>
        </button>

        {soloAgricultor ? (
          <button type="button" className="muyu-btn-secondary" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            <span>{t("fichaPrint")}</span>
          </button>
        ) : null}
      </div>

      <article className="muyu-ficha-card" aria-label="Ficha del agricultor">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "2px solid var(--noche)",
            paddingBottom: "14px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <MuyuLogo size={48} dotColor="#14303A" />
            <div>
              <h2 style={{ margin: 0, fontSize: "1.55rem" }}>{nombreChacra}</h2>
              <div style={{ color: "var(--noche-suave)", fontSize: "1.1rem", fontWeight: 600 }}>
                {t("fichaCampaign")}
              </div>
            </div>
          </div>
        </header>

        {/* Máximo 3 mensajes cortos, letra >= 20px, sin decimales */}
        <div style={{ display: "grid", gap: "20px" }}>
          <div data-ficha-msg="1" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Sprout size={34} color="#007755" aria-hidden="true" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--noche-suave)", fontSize: "1rem" }}>
                {t("fichaWhatToPlant")}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.4rem", color: planItem.color_hex }}>
                {msgWhatToPlant}
              </div>
            </div>
          </div>

          <div data-ficha-msg="2" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Calendar size={34} color="#003F6E" aria-hidden="true" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--noche-suave)", fontSize: "1rem" }}>
                {t("fichaWhen")}
              </div>
              <div style={{ fontWeight: 600, fontSize: "1.25rem" }}>{msgWhen}</div>
            </div>
          </div>

          <div data-ficha-msg="3" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <AlertTriangle size={34} color="#B83A00" aria-hidden="true" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--noche-suave)", fontSize: "1rem" }}>
                {t("fichaWhatToWatch")}
              </div>
              <div style={{ fontWeight: 600, fontSize: "1.25rem" }}>{msgWhatToWatch}</div>
            </div>
          </div>
        </div>

        {oportunidadFicha ? (
          <div
            data-ficha-oportunidad={oportunidadFicha.codigo}
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "2px solid var(--est-c)",
              backgroundColor: "#EEF7F2",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <Sparkles size={26} color="#007755" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, color: "#005A40", fontSize: "0.95rem" }}>
                {t("fichaOpportunityTitle")}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.12rem", color: "var(--noche)" }}>
                {oportunidadFicha.accion_ficha}
              </div>
            </div>
          </div>
        ) : null}

        {parcelaOps?.calendario ? (
          <CalendarioChacra calendario={parcelaOps.calendario} modo="simple" />
        ) : null}

        <footer style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid var(--borde)", display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "1.05rem", color: "var(--noche-suave)" }}>
            {t("fichaQuechuaPending")}.
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.25rem" }}>
            “{t("fichaClosing")}”
          </div>
        </footer>
      </article>

      <ExplicacionIA
        parcela={parcela}
        planItem={planItem}
        oportunidades={parcelaOps?.oportunidades ?? []}
      />
    </div>
  );
}
