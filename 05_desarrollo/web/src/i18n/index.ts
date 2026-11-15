import { createContext, useContext } from "react";

export type Lang = "es" | "en";

export const DICTIONARY = {
  es: {
    brandName: "MUYU",
    brandTagline: "Sabe lo que viene. Siembra lo que conviene.",
    navLabel: "Vistas principales",
    viewCoop: "Cooperativa",
    viewDra: "DRA Ayacucho",
    viewFicha: "Ficha",
    dataUntil: "Datos actualizados a: octubre 2026",
    offlineBanner: "Sin conexión: mostrando la última copia guardada",
    langToggleAria: "Cambiar idioma a inglés",

    // Estados en palabras simples
    estadoObservado: "Medido",
    estadoEstimado: "Calculado",
    estadoIlustrativo: "Ejemplo",
    estadoNoDisponible: "Sin dato",

    // Divulgación progresiva
    seeDataSource: "Ver de dónde sale este dato",
    sourceLabel: "Fuente",
    scaleLabel: "Escala",
    dateLabel: "Fecha",
    seeMore: "Ver más",
    seeLess: "Ver menos",

    // Cooperativa — Esta campaña
    campaignHeading: "Esta campaña",
    whatToDoLabel: "Qué hacer",
    alert1Title: "☀️ Más calor de lo normal: septiembre 2026 fue el más caluroso en 46 años.",
    alert1Action: "Revisa tu tuna más seguido: el calor puede adelantar la maduración. Vigila el agua.",
    alert1Tech: "Temperatura media de septiembre 2026 (+1.6 °C sobre la normal climatológica 1991–2020) en celda NASA POWER MERRA-2 (~50 km).",
    alert2Title: "🌧️ Las lluvias se están retrasando: en octubre llovió casi la mitad de lo normal.",
    alert2Action: "Prefiere cultivos que aguanten la falta de agua (opción B).",
    alert2Tech: "Lluvia de octubre 2026 medida por NASA GPM IMERG Late V07 (0.1°): 44 % por debajo de la serie 2001–2025.",
    alert3Title: "🥔 Mucha gente sembrará papa: en Ayacucho, +19 % más que antes.",
    alert3Action: "Riesgo de que sobre papa al cosechar. Considera rotar con tarwi o haba.",
    alert3Tech: "Encuesta ENIS MIDAGRI (+19.3 % intención de siembra en Ayacucho) cruzada con índice de sobreoferta I_m en Mercado Mayorista de Lima (EMMSA).",

    // Tus chacras & Mapa
    plotsHeading: "Tus chacras",
    showMapBtn: "Ver mapa",
    hideMapBtn: "Ocultar mapa",
    mapAria: "Mapa de las 10 chacras piloto en Ayacucho con su estrategia recomendada",
    heightLabel: "Altura de la chacra",
    recommendPrefix: "Siembra",
    createSheetBtn: "Crear ficha para el socio",

    // Detalle de la chacra
    detailHeading: "Detalle de la chacra",
    recommendationHeading: "Recomendación",
    whyHeading: "Por qué",
    whyFrost: "Noches de helada",
    whyRain: "Humedad del suelo y lluvia",
    whySoil: "Suelo de la chacra",
    whyNdvi: "Verdor de la chacra",
    ndviNoData: "Sin dato reciente de verdor satelital",
    chunoEligible: "Apta para chuño o tunta si sobra papa",
    chunoNotEligible: "No recomendada para chuño por altura o heladas",

    // Comparador
    comparatorHeading: "Comparar opciones A/B/C",
    axisThermal: "Clima y suelo",
    axisClimate: "Resistencia a helada y sequía",
    axisSoil: "Cuidado de la tierra",
    axisMarket: "Riesgo de que sobre en el mercado",
    axisPests: "Plagas y enfermedades",
    bandAlto: "Alto",
    bandMedio: "Medio",
    bandBajo: "Bajo",
    bandInsuf: "Sin dato suficiente",

    // Tabla rotación
    planHeading: "Resumen de las 10 chacras",
    colParcel: "Chacra",
    colPrevCrop: "Cultivo anterior",
    colStrategy: "Opción",
    colAssignedCrop: "Qué sembrar",
    colLegume: "Leguminosa",
    colStatus: "Origen",

    // DRA
    draHeadline: "2026 viene más caluroso y con lluvias tardías; la siembra de papa crece 19 %.",
    draPrintBtn: "Imprimir / Descargar resumen",
    draTempTitle: "Cada mes de 2026 fue más caluroso que lo normal",
    draTempTech: "Anomalía térmica mensual de 2026 frente a la normal climatológica 1991–2020. Fuente: NASA POWER MERRA-2 (~50 km, celda Huanta c-26_-119).",
    draRainTitle: "En octubre llovió casi la mitad",
    draRainTech: "Precipitación mensual jul–oct 2026 vs mediana 2001–2025. Fuente: NASA GPM IMERG Late V07 (0.1°).",
    draMarketTitle: "Papa que llega a Lima cada mes",
    draMarketNote: "Cuando llega demasiada papa hay riesgo de que sobre en el mercado (no predice el precio).",
    draMarketPrueba2: "En enero de 2024 llegó más papa de lo normal y el precio bajó casi a la mitad (1.1 soles por kilo).",
    draMarketTech: "Índice de saturación I_m calculado con ingresos mensuales al GMML (EMMSA / MIDAGRI-SIEA). Enero 2024: I_m = 1.053 (+5.3 % ingreso, −48 % precio).",

    // Ficha del agricultor
    fichaCampaign: "Campaña 2026–2027",
    fichaWhatToPlant: "Qué sembrar",
    fichaWhen: "Cuándo",
    fichaWhatToWatch: "Qué cuidar",
    fichaWhenText: "Prepara la tierra antes de las lluvias de noviembre",
    fichaWatchFrost: "Noches de helada en julio: protege la semilla",
    fichaWatchDry: "Poca lluvia al inicio: cuida la humedad del suelo",
    fichaPrint: "Imprimir",
    fichaCopyWa: "Copiar para WhatsApp",
    fichaCopied: "Copiado para WhatsApp",
    fichaQuechuaPending: "Traducción al quechua pendiente de revisión por hablante",
    fichaClosing: "El satélite avisa, la chacra decide.",

    // Estados UI
    loading: "Cargando información...",
    errorLoad: "No pudimos cargar el clima. Mostrando la copia del 31 de octubre.",
    emptyData: "Sin registros disponibles.",
  },
  en: {
    brandName: "MUYU",
    brandTagline: "Know what is coming. Plant what fits best.",
    navLabel: "Main views",
    viewCoop: "Cooperative",
    viewDra: "DRA Ayacucho",
    viewFicha: "Farmer Sheet",
    dataUntil: "Data updated to: October 2026",
    offlineBanner: "Offline: showing last saved copy",
    langToggleAria: "Switch language to Spanish",

    // Simple status badges
    estadoObservado: "Measured",
    estadoEstimado: "Calculated",
    estadoIlustrativo: "Example",
    estadoNoDisponible: "No data",

    // Progressive disclosure
    seeDataSource: "See where this data comes from",
    sourceLabel: "Source",
    scaleLabel: "Scale",
    dateLabel: "Date",
    seeMore: "See more",
    seeLess: "See less",

    // Cooperative — This season
    campaignHeading: "This season",
    whatToDoLabel: "What to do",
    alert1Title: "☀️ Warmer than usual: September 2026 was the hottest in 46 years.",
    alert1Action: "Check your prickly pear more often: heat may speed up ripening. Watch water.",
    alert1Tech: "September 2026 mean temperature (+1.6 °C above 1991–2020 climatological normal) in NASA POWER MERRA-2 cell (~50 km).",
    alert2Title: "🌧️ Rains are arriving late: October had nearly half the usual rain.",
    alert2Action: "Favor crops that handle low water (option B).",
    alert2Tech: "October 2026 rainfall measured by NASA GPM IMERG Late V07 (0.1°): 44 % below 2001–2025 series.",
    alert3Title: "🥔 Many farmers will plant potato: +19 % more in Ayacucho.",
    alert3Action: "Risk of potato oversupply at harvest. Consider rotating with tarwi or fava bean.",
    alert3Tech: "ENIS MIDAGRI survey (+19.3 % potato planting intention in Ayacucho) crossed with oversupply index I_m at Lima Wholesale Market (EMMSA).",

    // Your plots & Map
    plotsHeading: "Your plots",
    showMapBtn: "Show map",
    hideMapBtn: "Hide map",
    mapAria: "Map of the 10 pilot plots in Ayacucho showing recommended strategy",
    heightLabel: "Plot elevation",
    recommendPrefix: "Plant",
    createSheetBtn: "Create sheet for farmer",

    // Plot detail
    detailHeading: "Plot details",
    recommendationHeading: "Recommendation",
    whyHeading: "Why",
    whyFrost: "Frost nights",
    whyRain: "Soil moisture and rain",
    whySoil: "Plot soil",
    whyNdvi: "Plot greenness",
    ndviNoData: "No recent satellite greenness data",
    chunoEligible: "Suitable for chuño or tunta if potato oversupply occurs",
    chunoNotEligible: "Not suitable for chuño due to elevation or frost",

    // Comparator
    comparatorHeading: "Compare options A/B/C",
    axisThermal: "Climate & soil",
    axisClimate: "Frost & drought resilience",
    axisSoil: "Soil health",
    axisMarket: "Market oversupply risk",
    axisPests: "Pests & diseases",
    bandAlto: "High",
    bandMedio: "Medium",
    bandBajo: "Low",
    bandInsuf: "Not enough data",

    // Rotation table
    planHeading: "Summary of all 10 plots",
    colParcel: "Plot",
    colPrevCrop: "Previous crop",
    colStrategy: "Option",
    colAssignedCrop: "What to plant",
    colLegume: "Legume",
    colStatus: "Source",

    // DRA
    draHeadline: "2026 is warmer with late rains; potato planting grows 19 %.",
    draPrintBtn: "Print / Download summary",
    draTempTitle: "Every month of 2026 was warmer than normal",
    draTempTech: "2026 monthly temperature anomaly vs 1991–2020 normal. Source: NASA POWER MERRA-2 (~50 km, Huanta cell c-26_-119).",
    draRainTitle: "October had nearly half the usual rain",
    draRainTech: "Jul–Oct 2026 monthly rainfall vs 2001–2025 median. Source: NASA GPM IMERG Late V07 (0.1°).",
    draMarketTitle: "Potatoes arriving in Lima each month",
    draMarketNote: "When too many potatoes arrive, there is a risk of oversupply (does not forecast prices).",
    draMarketPrueba2: "In January 2024 more potatoes arrived than usual and prices dropped by nearly half (1.1 soles per kilo).",
    draMarketTech: "Saturation index I_m calculated from monthly GMML inflows (EMMSA / MIDAGRI-SIEA). Jan 2024: I_m = 1.053 (+5.3 % inflow, −48 % price).",

    // Farmer Sheet
    fichaCampaign: "Season 2026–2027",
    fichaWhatToPlant: "What to plant",
    fichaWhen: "When",
    fichaWhatToWatch: "What to watch",
    fichaWhenText: "Prepare the land before November rains",
    fichaWatchFrost: "Frost nights in July: protect the seed",
    fichaWatchDry: "Low early rain: keep soil moisture",
    fichaPrint: "Print",
    fichaCopyWa: "Copy for WhatsApp",
    fichaCopied: "Copied for WhatsApp",
    fichaQuechuaPending: "Quechua translation pending review by native speaker",
    fichaClosing: "The satellite warns, the farm decides.",

    // UI States
    loading: "Loading information...",
    errorLoad: "Could not load weather data. Showing saved copy from October 31.",
    emptyData: "No records available.",
  },
} as const;

export type DictKey = keyof typeof DICTIONARY.es;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  lang: "es",
  setLang: () => {},
  t: (key) => DICTIONARY.es[key],
});

export function useI18n() {
  return useContext(I18nContext);
}
