import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Calendar, Globe, Sprout, BarChart3, FileText, WifiOff } from "lucide-react";
import { MuyuLogo } from "./components/MuyuLogo";
import { subscribeLocalFallback } from "./data/api";
import { DICTIONARY, I18nContext, type Lang } from "./i18n";

const CooperativaView = lazy(() => import("./views/CooperativaView"));
const DraView = lazy(() => import("./views/DraView"));
const FichaView = lazy(() => import("./views/FichaView"));

type Vista = "cooperativa" | "dra" | "ficha";

export default function App() {
  const [vista, setVista] = useState<Vista>("cooperativa");
  const [lang, setLang] = useState<Lang>("es");
  const [selectedParcelaId, setSelectedParcelaId] = useState("P01");
  const [offlineFallback, setOfflineFallback] = useState(false);

  useEffect(() => {
    return subscribeLocalFallback(setOfflineFallback);
  }, []);

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
    setVista("ficha");
  };

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

            <nav className="muyu-nav" aria-label={t("navLabel")}>
              <button
                type="button"
                className="muyu-nav-btn"
                aria-current={vista === "cooperativa" ? "page" : undefined}
                onClick={() => setVista("cooperativa")}
              >
                <Sprout size={18} aria-hidden="true" />
                <span>{t("viewCoop")}</span>
              </button>
              <button
                type="button"
                className="muyu-nav-btn"
                aria-current={vista === "dra" ? "page" : undefined}
                onClick={() => setVista("dra")}
              >
                <BarChart3 size={18} aria-hidden="true" />
                <span>{t("viewDra")}</span>
              </button>
              <button
                type="button"
                className="muyu-nav-btn"
                aria-current={vista === "ficha" ? "page" : undefined}
                onClick={() => setVista("ficha")}
              >
                <FileText size={18} aria-hidden="true" />
                <span>{t("viewFicha")}</span>
              </button>
            </nav>

            <div className="muyu-topbar-meta">
              <span className="muyu-chip-fecha">
                <Calendar size={15} aria-hidden="true" />
                <span>{t("dataUntil")}</span>
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
          <Suspense
            fallback={
              <div className="muyu-card" aria-busy="true">
                <div className="muyu-skeleton" style={{ height: "28px", width: "45%", marginBottom: "12px" }} />
                <div className="muyu-skeleton" style={{ height: "180px", width: "100%" }} />
              </div>
            }
          >
            {vista === "cooperativa" ? (
              <CooperativaView
                parcelaId={selectedParcelaId}
                onSelectParcela={setSelectedParcelaId}
                onOpenFicha={handleOpenFicha}
              />
            ) : null}
            {vista === "dra" ? <DraView /> : null}
            {vista === "ficha" ? (
              <FichaView parcelaId={selectedParcelaId} onSelectParcela={setSelectedParcelaId} />
            ) : null}
          </Suspense>
        </main>
      </div>
    </I18nContext.Provider>
  );
}
