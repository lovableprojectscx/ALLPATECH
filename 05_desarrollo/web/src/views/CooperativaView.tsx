import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { ArrowLeft, ChevronDown, ChevronUp, FileText, Map as MapIcon } from "lucide-react";
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
import { getParcelaNombre } from "../data/nombres";
import { useI18n } from "../i18n";

interface CooperativaViewProps {
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

export default function CooperativaView({ onOpenFicha }: CooperativaViewProps) {
  const { t } = useI18n();
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showAllPlots, setShowAllPlots] = useState(false);
  const [showComparator, setShowComparator] = useState(false);

  const parcelasQ = useQuery({ queryKey: ["parcelas"], queryFn: () => getParcelas() });
  const planQ = useQuery({ queryKey: ["plan-rotacion"], queryFn: () => getPlanRotacion() });
  const climaQ = useQuery({ queryKey: ["clima-mensual"], queryFn: () => getClimaMensual() });
  const ndviQ = useQuery({ queryKey: ["ndvi-parcelas"], queryFn: () => getNdviParcelas() });

  const parcelas = parcelasQ.data ?? [];
  const plan = planQ.data?.plan ?? [];
  const comparador = planQ.data?.comparador ?? [];

  const parcelaActiva = useMemo(
    () => (detalleId ? parcelas.find((p) => p.id === detalleId) ?? null : null),
    [parcelas, detalleId]
  );
  const planActivo = useMemo(
    () => (detalleId ? plan.find((pl) => pl.parcela_id === detalleId) ?? null : null),
    [plan, detalleId]
  );
  const parcelaComp = useMemo(
    () => (detalleId ? comparador.find((c) => c.parcela_id === detalleId) ?? null : null),
    [comparador, detalleId]
  );

  if (parcelasQ.isLoading || planQ.isLoading) {
    return (
      <div style={{ display: "grid", gap: "24px" }} aria-busy="true">
        <div className="muyu-alerts-grid">
          <div className="muyu-skeleton" style={{ height: "120px" }} />
          <div className="muyu-skeleton" style={{ height: "120px" }} />
          <div className="muyu-skeleton" style={{ height: "120px" }} />
        </div>
        <div className="muyu-skeleton" style={{ height: "260px" }} />
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

  // Vista de detalle de chacra (se abre al tocar una chacra, no debajo de la lista)
  if (parcelaActiva && planActivo) {
    const nombreChacra = getParcelaNombre(parcelaActiva.id, parcelaActiva.distrito);
    const climaCelda = (climaQ.data ?? []).filter((c) => c.cell_key === parcelaActiva.power_cell_id);
    const ultimoClima = climaCelda[climaCelda.length - 1];
    const ndviParcela = (ndviQ.data ?? []).find((n) => n.parcela_id === parcelaActiva.id);
    const ndviValidos = (ndviParcela?.registros ?? []).filter((r) => typeof r.ndvi === "number");
    const ultimoNdvi = ndviValidos[ndviValidos.length - 1];

    return (
      <div style={{ display: "grid", gap: "24px" }}>
        <div>
          <button
            type="button"
            className="muyu-btn-secondary"
            onClick={() => {
              setDetalleId(null);
              setShowComparator(false);
            }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{t("backToPlots")}</span>
          </button>
        </div>

        <section className="muyu-card" aria-label={t("detailHeading")} style={{ border: "2px solid var(--noche)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--quinua)", textTransform: "uppercase" }}>
                {t("recommendationHeading")}
              </span>
              <h2 style={{ margin: "2px 0 0", fontSize: "1.6rem" }}>
                {nombreChacra}{" "}
                <span style={{ color: "var(--noche-suave)", fontSize: "1rem", fontWeight: 400 }}>
                  ({parcelaActiva.id})
                </span>{" "}
                →{" "}
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

          <h3 style={{ margin: "0 0 10px", fontSize: "1.15rem" }}>{t("whyHeading")}</h3>
          <ul style={{ margin: "0 0 16px", paddingLeft: "22px", display: "grid", gap: "10px" }}>
            <li>
              <strong>{t("whyFrost")}:</strong> {parcelaActiva.clima_campana_2025_2026.dias_helada} noches ≤ 0 °C ·{" "}
              {t("heightLabel")}: {Math.round(parcelaActiva.elev_dem_m)} m
            </li>
            <li>
              <strong>{t("whyRain")}:</strong>{" "}
              {typeof ultimoClima?.humedad_suelo_raiz === "number"
                ? `${Math.round(ultimoClima.humedad_suelo_raiz * 100)} %`
                : t("estadoNoDisponible")}{" "}
              <EstadoBadge estado="estimado" />
            </li>
            <li>
              <strong>{t("whySoil")}:</strong> pH{" "}
              {parcelaActiva.suelo.ph !== null && parcelaActiva.suelo.ph !== undefined
                ? parcelaActiva.suelo.ph.toFixed(1)
                : t("estadoNoDisponible")}{" "}
              ({formatValor(parcelaActiva.suelo.textura_clase).replace(/_/g, " ")})
              {parcelaActiva.id === "P10" ? ` · ${t("p10WhyNote")}` : ""}
            </li>
            {ndviValidos.length > 0 && ultimoNdvi ? (
              <li>
                <strong>{t("whyNdvi")}:</strong> {Number(ultimoNdvi.ndvi).toFixed(2)}{" "}
                <EstadoBadge estado="observado" />
              </li>
            ) : null}
          </ul>

          <FuenteDisclosure
            fuente="NASADEM / Copernicus DEM + NASA POWER + SoilGrids"
            escala="Chacra 30–90 m y clima ~50 km"
            fecha="octubre de 2026"
            detalleTecnico={
              ndviValidos.length > 0
                ? `Celda ${parcelaActiva.power_cell_id} (MERRA-2 GWETROOT=${formatValor(
                    ultimoClima?.humedad_suelo_raiz
                  )}). MODIS 250 m: el píxel incluye cercos y árboles alrededor de la chacra (último dato ${
                    ultimoNdvi?.calendar_date ?? ""
                  }).`
                : `Celda ${parcelaActiva.power_cell_id} (MERRA-2 GWETROOT=${formatValor(
                    ultimoClima?.humedad_suelo_raiz
                  )}). Verdor satelital: sin dato.`
            }
          />

          {parcelaComp ? (
            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="muyu-btn-secondary"
                aria-expanded={showComparator}
                onClick={() => setShowComparator((v) => !v)}
              >
                {showComparator ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                <span>{t("compareOptionsBtn")}</span>
              </button>

              {showComparator ? (
                <div style={{ marginTop: "14px" }}>
                  <ComparadorABC parcelaComp={parcelaComp} />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  const visibles = showAllPlots ? parcelas : parcelas.slice(0, 6);

  return (
    <div style={{ display: "grid", gap: "28px" }}>
      {/* Bloque 1: Esta campaña */}
      <section aria-label={t("campaignHeading")}>
        <h2 style={{ marginBottom: "14px", fontSize: "1.4rem" }}>{t("campaignHeading")}</h2>
        <div className="muyu-alerts-grid">
          <article className="muyu-alert-card" style={{ borderColor: "var(--est-a)" }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "var(--est-a)" }}>{t("whatToDoLabel")}</span>
                <EstadoBadge estado="estimado" />
              </div>
              <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{t("alert1Action")}</p>
              <p style={{ margin: 0, color: "var(--noche-suave)", fontSize: "0.95rem" }}>{t("alert1Short")}</p>
            </div>
            <FuenteDisclosure
              fuente="Tesis UNSCH + NASA POWER"
              escala="~50 km (Huanta)"
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
              <p style={{ margin: 0, color: "var(--noche-suave)", fontSize: "0.95rem" }}>{t("alert2Short")}</p>
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
              <p style={{ margin: 0, color: "var(--noche-suave)", fontSize: "0.95rem" }}>{t("alert3Short")}</p>
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

      {/* Bloque 2: Tus chacras (de 6 en 6 + Ver mapa) */}
      <section aria-label={t("plotsHeading")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>{t("plotsHeading")}</h2>
          <button
            type="button"
            className="muyu-btn-secondary"
            onClick={() => setShowMap((v) => !v)}
          >
            <MapIcon size={18} aria-hidden="true" />
            <span>{showMap ? t("hideMapBtn") : t("showMapBtn")}</span>
          </button>
        </div>

        <div style={{ display: "grid", gap: "18px" }}>
          {showMap ? (
            <div className="muyu-card">
              <div
                role="region"
                aria-label={t("mapAria")}
                style={{ height: "320px", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--borde)" }}
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
                        icon={crearIconoEstrategia(color, forma, p.id === detalleId)}
                        eventHandlers={{ click: () => setDetalleId(p.id) }}
                      >
                        <Popup>
                          <strong>{getParcelaNombre(p.id, p.distrito)}</strong> ({p.id})
                          <br />
                          {t("heightLabel")}: {Math.round(p.elev_dem_m)} m
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
            {visibles.map((p) => {
              const asignacion = plan.find((pl) => pl.parcela_id === p.id);
              const color = asignacion?.color_hex ?? "#003F6E";
              const forma = asignacion?.forma ?? "■";
              const nombre = getParcelaNombre(p.id, p.distrito);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="muyu-plot-card"
                  onClick={() => setDetalleId(p.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <strong style={{ fontSize: "1.08rem" }}>
                      {nombre}{" "}
                      <span style={{ color: "var(--noche-suave)", fontSize: "0.85rem", fontWeight: 400 }}>{p.id}</span>
                    </strong>
                    <span style={{ color: "var(--noche-suave)", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {Math.round(p.elev_dem_m)} m
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
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
                      {forma}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
                      {t("recommendPrefix")} {asignacion?.cultivo_asignado}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {parcelas.length > 6 ? (
            <div>
              <button
                type="button"
                className="muyu-btn-secondary"
                onClick={() => setShowAllPlots((v) => !v)}
              >
                {showAllPlots ? t("showLessPlots") : `${t("seeAllPlots")} (${parcelas.length})`}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
