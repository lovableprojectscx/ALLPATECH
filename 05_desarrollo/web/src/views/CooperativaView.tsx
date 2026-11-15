import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { ChevronDown, ChevronUp, FileText, Map as MapIcon } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { ComparadorABC } from "../components/ComparadorABC";
import { EstadoBadge } from "../components/EstadoBadge";
import { FuenteDisclosure } from "../components/FuenteDisclosure";
import {
  formatValor,
  getClimaMensual,
  getNdviParcelas,
  getParcelas,
  getPlanRotacion,
} from "../data/api";
import { useI18n } from "../i18n";

interface CooperativaViewProps {
  parcelaId?: string;
  onSelectParcela?: (id: string) => void;
  onOpenFicha?: (id: string) => void;
}

function crearIconoEstrategia(colorHex: string, forma: string, selected: boolean): L.DivIcon {
  const size = selected ? 34 : 28;
  return L.divIcon({
    className: "muyu-map-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      background:${colorHex};
      color:#FFFFFF;
      border:${selected ? "3px solid #14303A" : "2px solid #FFFFFF"};
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:${selected ? "16px" : "13px"};
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    ">${forma}</div>`,
  });
}

export default function CooperativaView({
  parcelaId: controlledId,
  onSelectParcela,
  onOpenFicha,
}: CooperativaViewProps) {
  const { t } = useI18n();
  const [internalId, setInternalId] = useState("P01");
  const parcelaId = controlledId ?? internalId;
  const setParcelaId = (id: string) => {
    setInternalId(id);
    onSelectParcela?.(id);
  };

  const [showMapMobile, setShowMapMobile] = useState(false);
  const [showAllTable, setShowAllTable] = useState(false);

  const parcelasQ = useQuery({ queryKey: ["parcelas"], queryFn: () => getParcelas() });
  const planQ = useQuery({ queryKey: ["plan-rotacion"], queryFn: () => getPlanRotacion() });
  const climaQ = useQuery({ queryKey: ["clima-mensual"], queryFn: () => getClimaMensual() });
  const ndviQ = useQuery({ queryKey: ["ndvi-parcelas"], queryFn: () => getNdviParcelas() });

  const parcelas = parcelasQ.data ?? [];
  const plan = planQ.data?.plan ?? [];
  const comparador = planQ.data?.comparador ?? [];

  const parcelaActiva = useMemo(
    () => parcelas.find((p) => p.id === parcelaId) ?? parcelas[0],
    [parcelas, parcelaId]
  );
  const planActivo = useMemo(
    () => plan.find((pl) => pl.parcela_id === parcelaId) ?? plan[0],
    [plan, parcelaId]
  );
  const parcelaComp = useMemo(
    () => comparador.find((c) => c.parcela_id === parcelaId) ?? comparador[0],
    [comparador, parcelaId]
  );

  if (parcelasQ.isLoading || planQ.isLoading) {
    return (
      <div style={{ display: "grid", gap: "16px" }} aria-busy="true">
        <div className="muyu-alerts-grid">
          <div className="muyu-skeleton" style={{ height: "130px" }} />
          <div className="muyu-skeleton" style={{ height: "130px" }} />
          <div className="muyu-skeleton" style={{ height: "130px" }} />
        </div>
        <div className="muyu-skeleton" style={{ height: "320px" }} />
      </div>
    );
  }

  if (parcelasQ.error || planQ.error || !parcelas.length || !plan.length) {
    return (
      <div className="muyu-card" role="alert">
        <p style={{ margin: 0, fontWeight: 700 }}>{t("errorLoad")}</p>
      </div>
    );
  }

  const climaCelda = (climaQ.data ?? []).filter((c) => c.cell_key === parcelaActiva?.power_cell_id);
  const ultimoClima = climaCelda[climaCelda.length - 1];
  const ndviParcela = (ndviQ.data ?? []).find((n) => n.parcela_id === parcelaActiva?.id);
  const ndviValidos = (ndviParcela?.registros ?? []).filter((r) => typeof r.ndvi === "number");
  const ultimoNdvi = ndviValidos[ndviValidos.length - 1];

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* 1. Esta campaña (3 tarjetas cortas con Qué hacer) */}
      <section aria-label={t("campaignHeading")}>
        <h2 style={{ marginBottom: "12px", fontSize: "1.4rem" }}>{t("campaignHeading")}</h2>
        <div className="muyu-alerts-grid">
          <article className="muyu-alert-card" style={{ borderColor: "var(--est-a)" }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--est-a)" }}>{t("whatToDoLabel")}</span>
                <EstadoBadge estado="observado" />
              </div>
              <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{t("alert1Action")}</p>
              <p style={{ margin: 0, color: "var(--noche-suave)" }}>{t("alert1Title")}</p>
            </div>
            <FuenteDisclosure
              fuente="NASA POWER MERRA-2"
              escala="~50 km"
              fecha="octubre de 2026"
              detalleTecnico={t("alert1Tech")}
            />
          </article>

          <article className="muyu-alert-card" style={{ borderColor: "var(--est-b)" }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--est-b)" }}>{t("whatToDoLabel")}</span>
                <EstadoBadge estado="observado" />
              </div>
              <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{t("alert2Action")}</p>
              <p style={{ margin: 0, color: "var(--noche-suave)" }}>{t("alert2Title")}</p>
            </div>
            <FuenteDisclosure
              fuente="NASA GPM IMERG Late V07"
              escala="0.1° (~10 km)"
              fecha="octubre de 2026"
              detalleTecnico={t("alert2Tech")}
            />
          </article>

          <article className="muyu-alert-card" style={{ borderColor: "var(--quinua)" }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--quinua)" }}>{t("whatToDoLabel")}</span>
                <EstadoBadge estado="observado" />
              </div>
              <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{t("alert3Action")}</p>
              <p style={{ margin: 0, color: "var(--noche-suave)" }}>{t("alert3Title")}</p>
            </div>
            <FuenteDisclosure
              fuente="ENIS MIDAGRI / EMMSA"
              escala="Ayacucho / Mercado Lima"
              fecha="noviembre de 2026"
              detalleTecnico={t("alert3Tech")}
            />
          </article>
        </div>
      </section>

      {/* 2. Tus chacras (lista + mapa con botón) */}
      <section aria-label={t("plotsHeading")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>{t("plotsHeading")}</h2>
          <button
            type="button"
            className="muyu-btn-secondary"
            onClick={() => setShowMapMobile((v) => !v)}
          >
            <MapIcon size={18} aria-hidden="true" />
            <span>{showMapMobile ? t("hideMapBtn") : t("showMapBtn")}</span>
          </button>
        </div>

        <div className={showMapMobile ? "muyu-coop-split" : undefined} style={{ display: "grid", gap: "16px" }}>
          {showMapMobile ? (
            <div className="muyu-card">
              <div
                role="region"
                aria-label={t("mapAria")}
                style={{ height: "340px", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--borde)" }}
              >
                <MapContainer center={[-13.15, -74.22]} zoom={9} style={{ height: "100%", width: "100%" }}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {parcelas.map((p) => {
                    const asignacion = plan.find((pl) => pl.parcela_id === p.id);
                    const color = asignacion?.color_hex ?? "#003F6E";
                    const forma = asignacion?.forma ?? "■";
                    return (
                      <Marker
                        key={p.id}
                        position={[p.latitude, p.longitude]}
                        icon={crearIconoEstrategia(color, forma, p.id === parcelaId)}
                        eventHandlers={{ click: () => setParcelaId(p.id) }}
                      >
                        <Popup>
                          <strong>
                            {p.id} ({p.distrito})
                          </strong>
                          <br />
                          {t("heightLabel")}: {p.elev_dem_m} m
                          <br />
                          {t("recommendPrefix")}: {forma} {asignacion?.cultivo_asignado}
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </div>
          ) : null}

          <div className="muyu-plots-grid">
            {parcelas.map((p) => {
              const asignacion = plan.find((pl) => pl.parcela_id === p.id);
              const color = asignacion?.color_hex ?? "#003F6E";
              const forma = asignacion?.forma ?? "■";
              const selected = p.id === parcelaId;
              return (
                <button
                  key={p.id}
                  type="button"
                  className="muyu-plot-card"
                  aria-pressed={selected}
                  onClick={() => setParcelaId(p.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "1.1rem" }}>
                      {p.id} · {p.distrito}
                    </strong>
                    <span style={{ color: "var(--noche-suave)", fontSize: "0.95rem" }}>{p.elev_dem_m} m</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "3px 10px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: color,
                        color: "#FFFFFF",
                        fontWeight: 700,
                      }}
                    >
                      {forma} {asignacion?.estrategia_elegida}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700 }}>
                      {t("recommendPrefix")} {asignacion?.cultivo_asignado}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "var(--noche-suave)" }}>
                    {p.clima_campana_2025_2026.dias_helada > 0
                      ? `${p.clima_campana_2025_2026.dias_helada} ${t("whyFrost").toLowerCase()}`
                      : `${t("whySoil")}: pH ${p.suelo.ph?.toFixed(1) ?? "sin dato"}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Detalle de la chacra */}
      {parcelaActiva && planActivo ? (
        <section className="muyu-card" aria-label={t("detailHeading")} style={{ border: "2px solid var(--noche)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
            <div>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--quinua)", textTransform: "uppercase" }}>
                {t("recommendationHeading")}
              </span>
              <h2 style={{ margin: "2px 0 0", fontSize: "1.6rem" }}>
                {parcelaActiva.id} ({parcelaActiva.distrito}) →{" "}
                <span style={{ color: planActivo.color_hex }}>
                  {planActivo.forma} {t("recommendPrefix")} {planActivo.cultivo_asignado}
                </span>
              </h2>
            </div>

            {onOpenFicha ? (
              <button
                type="button"
                className="muyu-btn-primary"
                onClick={() => onOpenFicha(parcelaActiva.id)}
              >
                <FileText size={18} aria-hidden="true" />
                <span>{t("createSheetBtn")}</span>
              </button>
            ) : null}
          </div>

          <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>{t("whyHeading")}</h3>
          <ul style={{ margin: "0 0 16px", paddingLeft: "22px", display: "grid", gap: "8px" }}>
            <li>
              <strong>{t("whyFrost")}:</strong> {parcelaActiva.clima_campana_2025_2026.dias_helada} noches ≤ 0 °C ·{" "}
              {t("heightLabel")}: {parcelaActiva.elev_dem_m} m{" "}
              <EstadoBadge estado={parcelaActiva.estado} />
            </li>
            <li>
              <strong>{t("whyRain")}:</strong> humedad del suelo{" "}
              {typeof ultimoClima?.humedad_suelo_raiz === "number"
                ? `${Math.round(ultimoClima.humedad_suelo_raiz * 100)} %`
                : t("estadoNoDisponible")}{" "}
              <EstadoBadge estado={ultimoClima?.estado ?? "observado"} />
            </li>
            <li>
              <strong>{t("whySoil")}:</strong> pH{" "}
              {parcelaActiva.suelo.ph !== null && parcelaActiva.suelo.ph !== undefined
                ? parcelaActiva.suelo.ph.toFixed(1)
                : t("estadoNoDisponible")}{" "}
              ({formatValor(parcelaActiva.suelo.textura_clase)}) ·{" "}
              {planActivo.chuno_tunta.elegible_altitud_y_helada ? t("chunoEligible") : t("chunoNotEligible")}{" "}
              <EstadoBadge estado={parcelaActiva.suelo.estado} />
            </li>
          </ul>

          <FuenteDisclosure
            fuente="NASADEM / Copernicus DEM + NASA POWER + SoilGrids"
            escala="Chacra 30–90 m y clima ~50 km"
            fecha="octubre de 2026"
            detalleTecnico={`Celda ${parcelaActiva.power_cell_id} (MERRA-2 GWETROOT=${formatValor(ultimoClima?.humedad_suelo_raiz)}). Verdor MODIS NDVI: ${
              ultimoNdvi ? `${ultimoNdvi.ndvi} (${ultimoNdvi.calendar_date})` : t("ndviNoData")
            }.`}
          />

          {parcelaComp ? (
            <div style={{ marginTop: "20px" }}>
              <ComparadorABC parcelaComp={parcelaComp} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Ver más: tabla completa de las 10 chacras */}
      <div>
        <button
          type="button"
          className="muyu-btn-secondary"
          onClick={() => setShowAllTable((v) => !v)}
          aria-expanded={showAllTable}
        >
          {showAllTable ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          <span>{showAllTable ? t("seeLess") : `${t("seeMore")}: ${t("planHeading")}`}</span>
        </button>

        {showAllTable ? (
          <section className="muyu-card" style={{ marginTop: "12px" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--noche)", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>{t("colParcel")}</th>
                    <th style={{ padding: "10px 8px" }}>{t("colPrevCrop")}</th>
                    <th style={{ padding: "10px 8px" }}>{t("colStrategy")}</th>
                    <th style={{ padding: "10px 8px" }}>{t("colAssignedCrop")}</th>
                    <th style={{ padding: "10px 8px" }}>{t("colLegume")}</th>
                    <th style={{ padding: "10px 8px" }}>{t("colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((item) => (
                    <tr
                      key={item.parcela_id}
                      onClick={() => setParcelaId(item.parcela_id)}
                      style={{
                        borderBottom: "1px solid var(--borde)",
                        backgroundColor: item.parcela_id === parcelaId ? "var(--niebla)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ padding: "10px 8px" }}>
                        <strong>{item.parcela_id}</strong> ({item.distrito}, {item.elev_dem_m} m)
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {item.cultivo_previo} <EstadoBadge estado="ilustrativo" />
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{ color: item.color_hex, fontWeight: 700 }}>
                          {item.forma} {item.estrategia_elegida}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>{item.cultivo_asignado}</td>
                      <td style={{ padding: "10px 8px", fontWeight: 700, color: item.rotacion_con_leguminosa === "✓" ? "var(--tarwi-texto)" : "var(--est-a)" }}>
                        {item.rotacion_con_leguminosa}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <EstadoBadge estado={item.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
