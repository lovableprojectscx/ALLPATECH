import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CloudRain,
  FileText,
  Map as MapIcon,
  Snowflake,
  Sprout,
  Sun,
  TrendingUp,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { CalendarioChacra } from "../components/CalendarioChacra";
import { ComparadorABC } from "../components/ComparadorABC";
import { EstadoBadge } from "../components/EstadoBadge";
import { ExplicacionIA } from "../components/ExplicacionIA";
import { FuenteDisclosure } from "../components/FuenteDisclosure";
import {
  formatValor,
  getClimaMensual,
  getNdviParcelas,
  getOportunidades,
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

export function construirResumenHelada(
  parcelas: Array<{
    id: string;
    distrito: string;
    elev_dem_m: number;
    dato_hasta: string;
    clima_campana_2025_2026: { dias_helada: number };
  }>,
  lang: "es" | "en"
) {
  const conHelada = parcelas.filter((p) => p.clima_campana_2025_2026.dias_helada > 0);
  if (conHelada.length === 0) return null;
  const altas = conHelada.filter((p) => p.elev_dem_m > 3500);
  const foco = altas.length > 0 ? altas : conHelada;
  const noches = foco.map((p) => p.clima_campana_2025_2026.dias_helada);
  const minN = Math.min(...noches);
  const maxN = Math.max(...noches);
  const nombres = foco.map((p) => getParcelaNombre(p.id, p.distrito)).join(", ");
  const resumenCorto =
    lang === "en"
      ? `${foco.length} high-altitude plots (${nombres}) had between ${minN} and ${maxN} frost nights this season.`
      : `${foco.length} chacras altas (${nombres}) tuvieron entre ${minN} y ${maxN} noches de helada esta campaña.`;
  const detalle = `Criterio SENAMHI (Tmin ajustada ≤ 0 °C). Ajuste por altura desde NASA POWER (~50 km) + DEM 30 m. Chacras con heladas: ${conHelada
    .map((p) => `${getParcelaNombre(p.id, p.distrito)}: ${p.clima_campana_2025_2026.dias_helada}`)
    .join("; ")}.`;
  return {
    resumenCorto,
    detalle,
    fecha: foco[0]?.dato_hasta ?? "2026-11-12",
  };
}

export default function CooperativaView({ onOpenFicha }: CooperativaViewProps) {
  const { lang, t } = useI18n();
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showAllPlots, setShowAllPlots] = useState(false);
  const [showAllOps, setShowAllOps] = useState(false);
  const [showComparator, setShowComparator] = useState(false);

  const parcelasQ = useQuery({ queryKey: ["parcelas"], queryFn: () => getParcelas() });
  const planQ = useQuery({ queryKey: ["plan-rotacion"], queryFn: () => getPlanRotacion() });
  const climaQ = useQuery({ queryKey: ["clima-mensual"], queryFn: () => getClimaMensual() });
  const ndviQ = useQuery({ queryKey: ["ndvi-parcelas"], queryFn: () => getNdviParcelas() });
  const oportunidadesQ = useQuery({ queryKey: ["oportunidades"], queryFn: () => getOportunidades() });

  const parcelas = parcelasQ.data ?? [];
  const plan = planQ.data?.plan ?? [];
  const comparador = planQ.data?.comparador ?? [];
  const opsCoop = oportunidadesQ.data?.oportunidades_cooperativa ?? [];
  const opsPorParcela = oportunidadesQ.data?.por_parcela ?? [];

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
    const parcelaOps = opsPorParcela.find((o) => o.parcela_id === parcelaActiva.id);

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
            fecha={parcelaActiva.dato_hasta}
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

          <ExplicacionIA
            parcela={parcelaActiva}
            planItem={planActivo}
            oportunidades={parcelaOps?.oportunidades ?? []}
          />

          {parcelaOps?.calendario ? (
            <div style={{ marginTop: "18px" }}>
              <CalendarioChacra calendario={parcelaOps.calendario} modo="completa" />
            </div>
          ) : null}

          {parcelaOps && parcelaOps.oportunidades.length > 0 ? (
            <section
              aria-label={t("plotOpportunitiesHeading")}
              style={{ marginTop: "18px", display: "grid", gap: "10px" }}
            >
              <h3 style={{ margin: 0, fontSize: "1.12rem" }}>{t("plotOpportunitiesHeading")}</h3>
              <div style={{ display: "grid", gap: "10px" }}>
                {parcelaOps.oportunidades.map((op) => {
                  const esHelada = op.codigo === "O2";
                  return (
                    <article
                      key={op.codigo}
                      className="muyu-alert-card"
                      style={{
                        borderColor: esHelada ? "var(--noche)" : "var(--est-c)",
                        backgroundColor: esHelada ? "var(--hielo)" : "var(--blanco)",
                      }}
                    >
                      <div style={{ display: "grid", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, color: "var(--noche)" }}>{op.titulo}</span>
                          <EstadoBadge estado={op.estado} />
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, color: "var(--noche)" }}>
                          {op.accion_positiva}
                        </p>
                        <p style={{ margin: 0, color: "var(--noche-suave)", fontSize: "0.93rem" }}>
                          {op.por_que_corto}
                        </p>
                      </div>
                      <FuenteDisclosure
                        fuente={op.fuente}
                        escala={op.escala}
                        fecha={op.dato_hasta}
                        detalleTecnico={op.nota}
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

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
  const opsVisibles = showAllOps ? opsCoop : opsCoop.slice(0, 3);

  const iconoPorCodigo = (codigo: string) => {
    switch (codigo) {
      case "O1":
        return <CloudRain size={16} aria-hidden="true" color="#003F6E" />;
      case "O2":
        return <Snowflake size={16} aria-hidden="true" color="#14303A" />;
      case "O3":
        return <Sun size={16} aria-hidden="true" color="#B83A00" />;
      case "O4":
        return <TrendingUp size={16} aria-hidden="true" color="#A3325F" />;
      default:
        return <Sprout size={16} aria-hidden="true" color="#007755" />;
    }
  };

  const bordePorCodigo = (codigo: string) => {
    if (codigo === "O2") return "var(--noche)";
    if (codigo === "O3" || codigo === "O5") return "var(--est-a)";
    if (codigo === "O4") return "var(--quinua)";
    if (codigo === "O1") return "var(--est-b)";
    return "var(--est-c)";
  };

  return (
    <div style={{ display: "grid", gap: "28px" }}>
      {/* Bloque 1: Oportunidades de esta campaña (máx 3 visibles + Ver más) */}
      <section aria-label={t("opportunitiesHeading")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>{t("opportunitiesHeading")}</h2>
          {opsCoop.length > 3 ? (
            <button
              type="button"
              className="muyu-btn-secondary"
              aria-expanded={showAllOps}
              onClick={() => setShowAllOps((v) => !v)}
            >
              {showAllOps ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              <span>{showAllOps ? t("showLessOps") : t("showMoreOps")}</span>
            </button>
          ) : null}
        </div>
        <div className="muyu-alerts-grid">
          {opsVisibles.map((op) => {
            const esO2 = op.codigo === "O2";
            return (
              <article
                key={op.codigo}
                className="muyu-alert-card"
                aria-label={esO2 ? "Oportunidad de helada" : op.titulo}
                style={{
                  borderColor: bordePorCodigo(op.codigo),
                  backgroundColor: esO2 ? "var(--hielo)" : undefined,
                }}
              >
                <div style={{ display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--noche)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {iconoPorCodigo(op.codigo)}
                      <span>{op.titulo}</span>
                    </span>
                    <EstadoBadge estado={op.estado} />
                  </div>
                  <p style={{ margin: 0, fontSize: "1.06rem", fontWeight: 700, color: "var(--noche)" }}>
                    {op.accion_positiva}
                  </p>
                  <p style={{ margin: 0, color: "var(--noche-suave)", fontSize: "0.94rem" }}>
                    {op.por_que_corto}
                  </p>
                </div>
                <FuenteDisclosure
                  fuente={op.fuente}
                  escala={op.escala}
                  fecha={op.dato_hasta}
                  detalleTecnico={op.nota}
                />
              </article>
            );
          })}
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
