import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, Globe, Sprout, User, WifiOff } from "lucide-react";
import { MuyuLogo } from "./components/MuyuLogo";
import { getFechasResumen, markLocalFallback, subscribeLocalFallback } from "./data/api";
import { DICTIONARY, I18nContext, type Lang } from "./i18n";

const CooperativaView = lazy(() => import("./views/CooperativaView"));
const DraView = lazy(() => import("./views/DraView"));
const FichaView = lazy(() => import("./views/FichaView"));

type Perfil = "cooperativa" | "dra" | "agricultor";

const STORAGE_KEY = "muyu_perfil_v1";

function leerPerfilGuardado(): Perfil | null {
  try {
    const pathMatch = window.location.pathname.match(/\/ficha\/(P\d+)/i);
    if (pathMatch) return "agricultor";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "cooperativa" || saved === "dra" || saved === "agricultor") {
      return saved;
    }
  } catch {
    // localStorage no disponible
  }
  return null;
}

function leerParcelaDeUrl(): string {
  try {
    const pathMatch = window.location.pathname.match(/\/ficha\/(P\d+)/i);
    if (pathMatch) return pathMatch[1].toUpperCase();
  } catch {
    // ignore
  }
  return "P01";
}

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(() => leerPerfilGuardado());
  const [lang, setLang] = useState<Lang>("es");
  const [selectedParcelaId, setSelectedParcelaId] = useState<string>(() => leerParcelaDeUrl());
  const [offlineFallback, setOfflineFallback] = useState(false);
  const { data: fechasResumen } = useQuery({
    queryKey: ["fechasResumen"],
    queryFn: () => getFechasResumen(),
  });

  const fechaBarra = useMemo(() => {
    const fmt = (iso: string | undefined) => {
      if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
      const [anio, mesStr, diaStr] = iso.split("-");
      const mesIdx = Number(mesStr) - 1;
      const dia = Number(diaStr);
      const mesesEs = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      const mesesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return lang === "es"
        ? `${dia} ${mesesEs[mesIdx] ?? mesStr} ${anio}`
        : `${mesesEn[mesIdx] ?? mesStr} ${dia}, ${anio}`;
    };
    const fClima = fmt(fechasResumen?.clima);
    const fMercado = fmt(fechasResumen?.mercado);
    if (!fClima || !fMercado) {
      return lang === "es" ? DICTIONARY.es.dataUntil : DICTIONARY.en.dataUntil;
    }
    return lang === "es"
      ? `Clima al ${fClima} · Precio al ${fMercado}`
      : `Climate through ${fClima} · Prices through ${fMercado}`;
  }, [fechasResumen, lang]);

  useEffect(() => {
    const unsub = subscribeLocalFallback(setOfflineFallback);
    const onOffline = () => markLocalFallback(true);
    window.addEventListener("offline", onOffline);
    return () => {
      unsub();
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const elegirPerfil = (nuevo: Perfil | null) => {
    setPerfil(nuevo);
    try {
      if (nuevo) {
        window.localStorage.setItem(STORAGE_KEY, nuevo);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const i18nValue = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: keyof typeof DICTIONARY.es) => DICTIONARY[lang][key],
    }),
    [lang]
  );

  const t = i18nValue.t;

  const handleOpenFicha = (parcelaId: string) => {
    setSelectedParcelaId(parcelaId);
    elegirPerfil("agricultor");
  };

  const perfilLabel =
    perfil === "cooperativa"
      ? t("viewCoop")
      : perfil === "dra"
      ? t("viewDra")
      : perfil === "agricultor"
      ? t("viewFicha")
      : null;

  return (
    <I18nContext.Provider value={i18nValue}>
      <div className="muyu-app">
        <header className="muyu-topbar">
          <div className="muyu-topbar-inner">
            <div className="muyu-brand">
              <MuyuLogo size={38} dotColor="#9CC3D5" />
              <div>
                <span className="muyu-brand-name">{t("brandName")}</span>
                <div style={{ fontSize: "0.85rem", color: "#9CC3D5", lineHeight: 1.2 }}>
                  {t("brandTagline")}
                </div>
              </div>
            </div>

            <div className="muyu-topbar-meta">
              {perfilLabel ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--quinua)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                    }}
                  >
                    {perfilLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => elegirPerfil(null)}
                    style={{
                      minHeight: "48px",
                      padding: "6px 12px",
                      background: "transparent",
                      border: "1px solid var(--hielo)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--hielo)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t("changeProfile")}
                  </button>
                </div>
              ) : null}

              <span className="muyu-chip-fecha">
                <Calendar size={15} aria-hidden="true" />
                <span>{fechaBarra}</span>
              </span>
              <button
                type="button"
                className="muyu-lang-btn"
                aria-label={t("langToggleAria")}
                onClick={() => setLang(lang === "es" ? "en" : "es")}
              >
                <Globe size={15} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "middle" }} />
                {lang === "es" ? "EN" : "ES"}
              </button>
            </div>
          </div>
        </header>

        {offlineFallback ? (
          <div className="muyu-offline-banner" role="status" aria-live="polite">
            <WifiOff size={16} aria-hidden="true" style={{ verticalAlign: "text-bottom", marginRight: "6px" }} />
            {t("offlineBanner")}
          </div>
        ) : null}

        <main className="muyu-main">
          {perfil === null ? (
            <section aria-label={t("whoAreYou")} style={{ maxWidth: "760px", margin: "12px auto", display: "grid", gap: "20px" }}>
              <div>
                <h1 style={{ margin: "0 0 6px", fontSize: "2rem" }}>{t("whoAreYou")}</h1>
                <p style={{ margin: 0, color: "var(--noche-suave)", fontSize: "1.1rem" }}>{t("whoSubtitle")}</p>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <button
                  type="button"
                  onClick={() => elegirPerfil("cooperativa")}
                  style={{
                    minHeight: "72px",
                    padding: "18px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--quinua)",
                    backgroundColor: "var(--quinua)",
                    color: "#FFFFFF",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <Sprout size={32} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700 }}>
                      {t("roleCoop")}
                    </div>
                    <div style={{ fontSize: "0.95rem", opacity: 0.92 }}>{t("roleCoopDesc")}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => elegirPerfil("dra")}
                  style={{
                    minHeight: "72px",
                    padding: "18px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--noche)",
                    backgroundColor: "var(--blanco)",
                    color: "var(--noche)",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <BarChart3 size={32} color="#003F6E" aria-hidden="true" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700 }}>
                      {t("roleDra")}
                    </div>
                    <div style={{ fontSize: "0.95rem", color: "var(--noche-suave)" }}>{t("roleDraDesc")}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => elegirPerfil("agricultor")}
                  style={{
                    minHeight: "72px",
                    padding: "18px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--noche)",
                    backgroundColor: "var(--blanco)",
                    color: "var(--noche)",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <User size={32} color="#007755" aria-hidden="true" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700 }}>
                      {t("roleFarmer")}
                    </div>
                    <div style={{ fontSize: "0.95rem", color: "var(--noche-suave)" }}>{t("roleFarmerDesc")}</div>
                  </div>
                </button>
              </div>

              <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "var(--noche-suave)" }}>
                {t("moreProfilesSoon")}
              </p>
            </section>
          ) : (
            <Suspense
              fallback={
                <div className="muyu-card" aria-busy="true">
                  <div className="muyu-skeleton" style={{ height: "28px", width: "45%", marginBottom: "12px" }} />
                  <div className="muyu-skeleton" style={{ height: "180px", width: "100%" }} />
                </div>
              }
            >
              {perfil === "cooperativa" ? <CooperativaView onOpenFicha={handleOpenFicha} /> : null}
              {perfil === "dra" ? <DraView /> : null}
              {perfil === "agricultor" ? (
                <FichaView
                  parcelaId={selectedParcelaId}
                  onSelectParcela={setSelectedParcelaId}
                  soloAgricultor
                />
              ) : null}
            </Suspense>
          )}
        </main>
      </div>
    </I18nContext.Provider>
  );
}
