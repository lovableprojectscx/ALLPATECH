import { createContext, useContext } from "react";

export type Lang = "es" | "en";

export const DICTIONARY = {
  es: {
    brandName: "Kultiva",
    brandTagline: "Sabe lo que viene. Siembra lo que conviene.",
    navLabel: "Vistas principales",
    viewCoop: "Cooperativa",
    viewDra: "DRA Ayacucho",
    viewFicha: "Agricultor",
    dataUntil: "Datos actualizados a: octubre 2026",
    offlineBanner: "Sin conexión: mostrando la última copia guardada",
    langToggleAria: "Cambiar idioma a inglés",

    // Pantalla de entrada (B0)
    whoAreYou: "¿Quién eres?",
    whoSubtitle: "Elige tu perfil para ver solo lo que necesitas.",
    roleCoop: "Trabajo en una cooperativa",
    roleCoopDesc: "Recomendaciones por chacra y fichas para socios.",
    roleDra: "Trabajo en la DRA o la municipalidad",
    roleDraDesc: "Resumen regional de clima y mercado para informes.",
    roleFarmer: "Soy agricultor",
    roleFarmerDesc: "Elige tu chacra y mira tu ficha en 3 pasos simples.",
    changeProfile: "Cambiar de perfil",
    chooseYourPlot: "Elige tu chacra",
    moreProfilesSoon: "Próximamente: más perfiles",

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
    seeAllPlots: "Ver todas las chacras",
    showLessPlots: "Ver menos",
    backToPlots: "Volver a tus chacras",
    compareOptionsBtn: "Comparar opciones",

    // Cooperativa — Oportunidades de esta campaña
    campaignHeading: "Oportunidades de esta campaña",
    opportunitiesHeading: "Oportunidades de esta campaña",
    showMoreOps: "Ver más",
    showLessOps: "Ver menos",
    plotOpportunitiesHeading: "Oportunidades de esta chacra",
    calendarHeading: "Calendario de mi chacra",
    calendarLegendRain: "Inicio normal de lluvias",
    calendarLegendSafe: "Ventana segura (siembra y desarrollo)",
    calendarLegendFrost: "Meses con riesgo de helada",
    calendarLegendTuna: "Cosecha estimada de tuna",
    calendarLegendPriceLow: "Precio de referencia papa bajo (EMMSA)",
    calendarLegendPriceHigh: "Precio de referencia papa alto (EMMSA)",
    whatToDoLabel: "Qué hacer",
    alert1Action: "Tu tuna lleva unos 10 días de adelanto. Vigila el agua.",
    alert1Short: "Más calor de lo normal desde junio.",
    alert1Tech: "Tesis UNSCH (Marcaquispe Capiso 2021, T_base = 0 °C) + NASA POWER (~50 km): 1,865 GD vs 1,714 GD normal (+151 GD, puesto 2/46). Supone que el brotamiento empezó el 1 de julio; la fecha real de 2026 no se conoce.",
    alert2Action: "Prefiere cultivos que aguanten la falta de agua (opción B).",
    alert2Short: "En octubre llovió casi la mitad de lo normal.",
    alert2Tech: "Lluvia de octubre 2026 medida por NASA GPM IMERG Late V07 (0.1°): 44 % por debajo de la serie 2001–2025.",
    alert3Action: "Riesgo de que sobre papa al cosechar. Considera rotar con tarwi o haba.",
    alert3Short: "En Ayacucho sembrarán +19 % más papa.",
    alert3Tech: "Encuesta ENIS MIDAGRI (+19.3 % intención de siembra en Ayacucho) cruzada con índice de sobreoferta I_m en Mercado Mayorista de Lima (EMMSA).",
    alert4Action: "Protege la semilla y el almácigo en las chacras altas.",
    explainSimpleBtn: "Explícamelo simple",
    explainLoading: "Preparando explicación simple...",
    explainBadge: "Redactado por IA con estos datos",
    explainSeeData: "Ver los datos usados",
    explainQuechuaBtn: "Quechua (borrador)",

    // Tus chacras & Mapa
    plotsHeading: "Tus chacras",
    showMapBtn: "Ver mapa",
    hideMapBtn: "Ocultar mapa",
    mapAria: "Mapa de las 10 chacras piloto en Ayacucho con su estrategia recomendada",
    heightLabel: "Altura de la chacra",
    recommendPrefix: "Siembra",
    createSheetBtn: "Crear ficha para el socio",
    p10WhyNote: "Altura y suelo aptos para papa; vende escalonado para evitar sobreoferta.",

    // Detalle de la chacra
    detailHeading: "Detalle de la chacra",
    recommendationHeading: "Recomendación",
    whyHeading: "Por qué",
    whyFrost: "Noches de helada",
    whyRain: "Humedad del suelo",
    whySoil: "Suelo de la chacra",
    whyNdvi: "Verdor de la chacra",
    chunoEligible: "Apta para chuño o tunta si sobra papa",
    chunoNotEligible: "No recomendada para chuño por altura o heladas",

    // Comparador
    comparatorHeading: "Comparar opciones A/B/C",
    axisThermal: "Clima y suelo",
    axisClimate: "Resistencia a helada y sequía",
    axisSoil: "Cuidado de la tierra",
    axisMarket: "Riesgo de que sobre en el mercado",
    bandAlto: "Alto",
    bandMedio: "Medio",
    bandBajo: "Bajo",
    bandInsuf: "Sin dato suficiente",
    pestsNextPhase: "Plagas: en la siguiente fase.",

    // DRA
    draHeadline: "2026 viene más caluroso y con lluvias tardías; la siembra de papa crece 19 %.",
    draPrintBtn: "Imprimir / Descargar resumen",
    draTempTitle: "Desde junio, cada mes fue más caluroso que lo normal",
    draTempTech: "Anomalía térmica mensual de 2026 frente a la normal climatológica 1991–2020. Fuente: NASA POWER MERRA-2 (~50 km, celda Huanta c-26_-119).",
    draRainTitle: "En octubre llovió casi la mitad",
    draRainTech: "Precipitación mensual jul–oct 2026 vs mediana 2001–2025. Fuente: NASA GPM IMERG Late V07 (0.1°).",
    draMarketTitle: "Papa que llega a Lima cada mes",
    draMarketNote: "Cuando llega demasiada papa hay riesgo de que sobre en el mercado (no predice el precio).",
    draMarketPrueba2: "En enero de 2024 llegó más papa de lo normal y el precio bajó casi a la mitad (1.1 soles por kilo).",
    draMarketTech: "Ingresos mensuales en toneladas al GMML (EMMSA / MIDAGRI-SIEA). Noviembre 2026 es mes en curso (datos hasta el día 13). Enero 2024: I_m = 1.053 (+5.3 % ingreso, −48 % precio).",
    draSemaforoTitle: "Semáforo regional de esta campaña",

    // Ficha del agricultor
    fichaCampaign: "Campaña 2026–2027",
    fichaOpportunityTitle: "Oportunidad de esta campaña",
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
    brandName: "Kultiva",
    brandTagline: "Know what is coming. Plant what fits best.",
    navLabel: "Main views",
    viewCoop: "Cooperative",
    viewDra: "DRA Ayacucho",
    viewFicha: "Farmer",
    dataUntil: "Data updated to: October 2026",
    offlineBanner: "Offline: showing last saved copy",
    langToggleAria: "Switch language to Spanish",

    // Entry screen (B0)
    whoAreYou: "Who are you?",
    whoSubtitle: "Choose your profile to see only what you need.",
    roleCoop: "I work at a cooperative",
    roleCoopDesc: "Plot recommendations and printable sheets for farmers.",
    roleDra: "I work at DRA or municipality",
    roleDraDesc: "Regional climate and market summary for reports.",
    roleFarmer: "I am a farmer",
    roleFarmerDesc: "Pick your plot and see your 3-step field sheet.",
    changeProfile: "Switch profile",
    chooseYourPlot: "Choose your plot",
    moreProfilesSoon: "Coming soon: more profiles",

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
    seeAllPlots: "See all plots",
    showLessPlots: "Show less",
    backToPlots: "Back to your plots",
    compareOptionsBtn: "Compare options",

    // Cooperative — This season's opportunities
    campaignHeading: "This season's opportunities",
    opportunitiesHeading: "This season's opportunities",
    showMoreOps: "Show more",
    showLessOps: "Show less",
    plotOpportunitiesHeading: "Opportunities for this plot",
    calendarHeading: "My plot's calendar",
    calendarLegendRain: "Normal start of rains",
    calendarLegendSafe: "Safe window (planting & growth)",
    calendarLegendFrost: "Months with frost risk",
    calendarLegendTuna: "Estimated prickly pear harvest",
    calendarLegendPriceLow: "Lower reference potato price (EMMSA)",
    calendarLegendPriceHigh: "Higher reference potato price (EMMSA)",
    whatToDoLabel: "What to do",
    alert1Action: "Your prickly pear is about 10 days ahead. Watch water.",
    alert1Short: "Warmer than normal since June.",
    alert1Tech: "UNSCH thesis (Marcaquispe Capiso 2021, T_base = 0 °C) + NASA POWER (~50 km): 1,865 GD vs 1,714 GD normal (+151 GD, rank 2/46). Assumes budbreak started July 1; actual 2026 date is unknown.",
    alert2Action: "Favor crops that handle low water (option B).",
    alert2Short: "October had nearly half the usual rain.",
    alert2Tech: "October 2026 rainfall measured by NASA GPM IMERG Late V07 (0.1°): 44 % below 2001–2025 series.",
    alert3Action: "Risk of potato oversupply at harvest. Consider rotating with tarwi or fava bean.",
    alert3Short: "Potato planting in Ayacucho grows +19 %.",
    alert3Tech: "ENIS MIDAGRI survey (+19.3 % potato planting intention in Ayacucho) crossed with oversupply index I_m at Lima Wholesale Market (EMMSA).",
    alert4Action: "Protect seed and seedlings in high-altitude plots.",
    explainSimpleBtn: "Explain it simply",
    explainLoading: "Preparing simple explanation...",
    explainBadge: "Written by AI using this data",
    explainSeeData: "See data used",
    explainQuechuaBtn: "Quechua (draft)",

    // Your plots & Map
    plotsHeading: "Your plots",
    showMapBtn: "Show map",
    hideMapBtn: "Hide map",
    mapAria: "Map of the 10 pilot plots in Ayacucho showing recommended strategy",
    heightLabel: "Plot elevation",
    recommendPrefix: "Plant",
    createSheetBtn: "Create sheet for farmer",
    p10WhyNote: "Elevation and soil fit potato; sell in stages to avoid oversupply.",

    // Plot detail
    detailHeading: "Plot details",
    recommendationHeading: "Recommendation",
    whyHeading: "Why",
    whyFrost: "Frost nights",
    whyRain: "Soil moisture",
    whySoil: "Plot soil",
    whyNdvi: "Plot greenness",
    chunoEligible: "Suitable for chuño or tunta if potato oversupply occurs",
    chunoNotEligible: "Not suitable for chuño due to elevation or frost",

    // Comparator
    comparatorHeading: "Compare options A/B/C",
    axisThermal: "Climate & soil",
    axisClimate: "Frost & drought resilience",
    axisSoil: "Soil health",
    axisMarket: "Market oversupply risk",
    bandAlto: "High",
    bandMedio: "Medium",
    bandBajo: "Low",
    bandInsuf: "Not enough data",
    pestsNextPhase: "Pests: in the next phase.",

    // DRA
    draHeadline: "2026 is warmer with late rains; potato planting grows 19 %.",
    draPrintBtn: "Print / Download summary",
    draTempTitle: "Since June, every month was warmer than normal",
    draTempTech: "2026 monthly temperature anomaly vs 1991–2020 normal. Source: NASA POWER MERRA-2 (~50 km, Huanta cell c-26_-119).",
    draRainTitle: "October had nearly half the usual rain",
    draRainTech: "Jul–Oct 2026 monthly rainfall vs 2001–2025 median. Source: NASA GPM IMERG Late V07 (0.1°).",
    draMarketTitle: "Potatoes arriving in Lima each month",
    draMarketNote: "When too many potatoes arrive, there is a risk of oversupply (does not forecast prices).",
    draMarketPrueba2: "In January 2024 more potatoes arrived than usual and prices dropped by nearly half (1.1 soles per kilo).",
    draMarketTech: "Monthly inflows in metric tons at GMML (EMMSA / MIDAGRI-SIEA). Nov 2026 is an in-progress month (through Nov 13). Jan 2024: I_m = 1.053 (+5.3 % inflow, −48 % price).",
    draSemaforoTitle: "Regional traffic light this season",

    // Farmer Sheet
    fichaCampaign: "Season 2026–2027",
    fichaOpportunityTitle: "This season's opportunity",
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
