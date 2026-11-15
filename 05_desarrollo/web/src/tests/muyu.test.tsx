import fs from "node:fs";
import path from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { CalendarioChacra } from "../components/CalendarioChacra";
import { ComparadorABC } from "../components/ComparadorABC";
import { EstadoBadge } from "../components/EstadoBadge";
import { ExplicacionIA } from "../components/ExplicacionIA";
import { MercadoSection } from "../components/MercadoSection";
import { formatValor, getImergMensual, markLocalFallback } from "../data/api";
import { ParcelaSchema, Prueba1TunaSchema } from "../data/schemas";
import { DICTIONARY } from "../i18n";
import CooperativaView, { construirResumenHelada } from "../views/CooperativaView";
import DraView from "../views/DraView";
import FichaView from "../views/FichaView";
import {
  generarPlantillaFija,
  validarRespuestaIA,
} from "../../../supabase/functions/explicar-chacra/validator";

describe("Contratos, UI/UX y honestidad MUYU (Vitest)", () => {
  it("rechaza datos en esquema zod cuando falta estado", () => {
    const sinEstado = {
      id: "P01",
      distrito: "huanta",
      latitude: -12.93,
      longitude: -74.24,
      elev_dem_m: 2667,
      power_cell_id: "c-26_-119",
      clima_campana_2025_2026: {
        t2m_media_ajustada_c: 13.5,
        tmin_absoluta_ajustada_c: 1.49,
        dias_helada: 0,
        racha_seca_max_dias: 12,
      },
      suelo: {
        ph: 6.2,
        textura_clase: "Franco",
        estado: "observado",
        fuente: "SoilGrids",
      },
      dato_hasta: "2026-10-31",
    };

    const parsed = ParcelaSchema.safeParse(sinEstado);
    expect(parsed.success).toBe(false);
  });

  it("muestra 'no disponible' para valores faltantes y nunca 0", () => {
    expect(formatValor(null)).toBe("no disponible");
    expect(formatValor(undefined)).toBe("no disponible");
    expect(formatValor("no_disponible")).toBe("no disponible");
    expect(formatValor("no disponible")).toBe("no disponible");
    expect(formatValor(0)).toBe("0");
  });

  it("renderiza las 4 insignias de estado en palabras simples con ícono y texto", () => {
    const { container } = render(
      <div>
        <EstadoBadge estado="observado" />
        <EstadoBadge estado="estimado" />
        <EstadoBadge estado="ilustrativo" />
        <EstadoBadge estado="no_disponible" />
      </div>
    );
    expect(screen.getByText("Medido")).toBeInTheDocument();
    expect(screen.getByText("Calculado")).toBeInTheDocument();
    expect(screen.getByText("Ejemplo")).toBeInTheDocument();
    expect(screen.getByText("Sin dato")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-estado]")).toHaveLength(4);
    expect(container.textContent).toContain("—");
  });

  it("permite cambiar entre ES y EN, elegir perfil y muestra el banner de modo sin conexión", () => {
    window.localStorage.clear();
    markLocalFallback(true);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    );

    expect(screen.getByText(/¿Quién eres\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Trabajo en una cooperativa/i }));
    expect(screen.getByText(/Sin conexión: mostrando la última copia guardada/i)).toBeInTheDocument();
    const langBtn = screen.getByRole("button", { name: /Cambiar idioma a inglés/i });
    fireEvent.click(langBtn);
    expect(screen.getByText(/Offline: showing last saved copy/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Switch profile/i })).toBeInTheDocument();
    markLocalFallback(false);
    window.localStorage.clear();
  });

  it("ausencia de textos prohibidos en diccionarios ES y EN", () => {
    const prohibidos = [
      "predecimos el precio",
      "el satélite mide la calidad",
      "4 semanas",
      "detectamos plagas",
      "predict the price",
      "satellite measures quality",
      "4 weeks",
      "detect pests",
    ];
    const allTexts = [
      ...Object.values(DICTIONARY.es),
      ...Object.values(DICTIONARY.en),
    ]
      .join(" ")
      .toLowerCase();

    for (const frase of prohibidos) {
      expect(allTexts).not.toContain(frase);
    }
  });

  it("ausencia de términos técnicos en la vista principal de Cooperativa", async () => {
    const parcelasJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/parcelas_demo.json"), "utf-8")
    );
    const planJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/plan_rotacion_demo.json"), "utf-8")
    );
    const climaJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/clima_mensual.json"), "utf-8")
    );
    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("parcelas_demo")) return { ok: true, json: async () => parcelasJson };
        if (url.includes("plan_rotacion_demo")) return { ok: true, json: async () => planJson };
        if (url.includes("clima_mensual")) return { ok: true, json: async () => climaJson };
        if (url.includes("oportunidades")) return { ok: true, json: async () => oportunidadesJson };
        return { ok: true, json: async () => ({ parcelas: [] }) };
      })
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <CooperativaView />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText("Oportunidades de esta campaña")).toBeInTheDocument());
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).not.toContain("anomalía");
    expect(text).not.toContain("NDVI");
    expect(text).not.toContain("I_m");
    expect(text).not.toContain("GWETROOT");
    expect(text.toLowerCase()).not.toContain("celda");

    vi.unstubAllGlobals();
  });

  it("genera la ficha de P05 con 3 mensajes máximo y ningún número con decimales", async () => {
    const parcelasJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/parcelas_demo.json"), "utf-8")
    );
    const planJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/plan_rotacion_demo.json"), "utf-8")
    );
    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("parcelas_demo")) return { ok: true, json: async () => parcelasJson };
        if (String(url).includes("oportunidades")) return { ok: true, json: async () => oportunidadesJson };
        return { ok: true, json: async () => planJson };
      })
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <FichaView parcelaId="P05" />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByRole("article", { name: "Ficha del agricultor" })).toBeInTheDocument());
    const msgs = container.querySelectorAll("[data-ficha-msg]");
    expect(msgs.length).toBeLessThanOrEqual(3);
    expect(msgs.length).toBe(3);

    const fichaText = screen.getByRole("article", { name: "Ficha del agricultor" }).textContent ?? "";
    expect(fichaText).not.toMatch(/\d+\.\d+/);

    vi.unstubAllGlobals();
  });

  it("verifica tokens CSS y que Tarwi (#2F7D4F) no se use para texto pequeño", () => {
    const tokensCss = fs.readFileSync(path.resolve(__dirname, "../styles/tokens.css"), "utf-8");
    const globalCss = fs.readFileSync(path.resolve(__dirname, "../styles/global.css"), "utf-8");
    expect(tokensCss).toContain("--tarwi: #2F7D4F");
    expect(tokensCss).toContain("--tarwi-texto: #2A7046");
    expect(tokensCss).toContain("--noche: #14303A");
    expect(tokensCss).toContain("--niebla: #EEF2F1");
    expect(tokensCss).toContain("--quinua: #A3325F");
    expect(globalCss).not.toContain("color: var(--tarwi)");
  });

  it("usa el respaldo JSON local cuando Supabase falla", async () => {
    const fakeSupabaseFailing = {
      from: () => ({
        select: () => ({
          order: async () => {
            throw new Error("Supabase offline");
          },
        }),
      }),
    } as unknown as Parameters<typeof getImergMensual>[0];

    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _metadata: { nota_escala: "Promedio zona -74.4,-13.3,-74.0,-12.8" },
        meses_jul_oct: [
          {
            mes_num: 10,
            mes: "octubre",
            total_2026_mm: 38.0,
            media_2001_2025_mm: 68.3,
            mediana_2001_2025_mm: 61.5,
            anomalia_pct: -44.3,
            puesto_seco_2001_2026: 6,
            dias_ge_1mm_2026: 11,
            estado: "observado",
            dato_hasta: "2026-10-31",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fakeFetch);

    const res = await getImergMensual(fakeSupabaseFailing);
    expect(res).toHaveLength(1);
    expect(res[0].mes).toBe("octubre");
    expect(res[0].estado).toBe("observado");
    expect(fakeFetch).toHaveBeenCalledWith("/data/imerg_mensual.json");

    vi.unstubAllGlobals();
  });

  it("el comparador A/B/C no muestra puntajes numericos 0-100 en la interfaz", () => {
    const parcelaMock = {
      parcela_id: "P01",
      distrito: "huanta",
      elev_dem_m: 2667,
      escala_visible: { clima: "~50 km (NASA POWER)", terreno: "30 m (DEM/parcela)" },
      estrategias: {
        A: {
          codigo: "A" as const,
          nombre: "Continuar con papa",
          cultivo_id: "papa",
          color_hex: "#B83A00",
          forma: "▲",
          radar_bandas: {
            aptitud_termica_y_suelo: { banda: "medio" as const, estado: "estimado" as const, dato_hasta: "2026-10-31" },
            riesgo_plagas: {
              banda: "evidencia_insuficiente" as const,
              estado: "no_disponible" as const,
              dato_hasta: "2026-10-31",
            },
          },
          alertas: [],
        },
      },
    };

    const { container } = render(<ComparadorABC parcelaComp={parcelaMock} />);
    expect(screen.getByText("Medio")).toBeInTheDocument();
    expect(screen.getByText(/Plagas: en la siguiente fase/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/puntaje|_interno_0_100|\b(75|85|90|100)\b/);
  });

  it("el título del gráfico de temperatura coincide con los datos (desde junio, anomalía > 0)", () => {
    const climaJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/clima_mensual.json"), "utf-8")
    ) as {
      celdas: Record<string, { registros: Array<{ anio: number; mes: number; anomalia_t2m_c: number }> }>;
    };
    const regs = climaJson.celdas["c-26_-119"].registros.filter((r) => r.anio === 2026);
    const desdeJunio = regs.filter((r) => r.mes >= 6);
    expect(desdeJunio.length).toBeGreaterThanOrEqual(5);
    for (const r of desdeJunio) {
      expect(r.anomalia_t2m_c).toBeGreaterThan(0);
    }
    const mayo = regs.find((r) => r.mes === 5);
    expect(mayo?.anomalia_t2m_c).toBeLessThan(0);
    expect(DICTIONARY.es.draTempTitle).toBe("Desde junio, cada mes fue más caluroso que lo normal");
  });

  it("muestra riesgo en mercado, nunca 'precio va a caer', y funciona en DRA", () => {
    const mercadoMock = [
      {
        anio: 2024,
        mes: 1,
        ingreso_t: 58948,
        precio_soles_kg: 1.09,
        boletin_fuente: "boletin 07/12/14-02-2024",
        verificacion: "texto_pdf",
        im_papa: 1.053,
        etiqueta_riesgo: "riesgo de saturación",
        nota: "",
        fuente_id: "emmsa_siea",
        estado: "estimado" as const,
        dato_hasta: "2026-11-13",
      },
    ];
    const fuentesMock = {
      emmsa_siea: {
        id: "emmsa_siea",
        nombre: "EMMSA / MIDAGRI-SIEA",
        escala: "GMML Lima",
        url_o_referencia: "https://www.gob.pe/midagri",
        estado: "observado" as const,
        dato_hasta: "2026-11-13",
      },
    };

    const { container } = render(<MercadoSection mercado={mercadoMock} fuentesMap={fuentesMock} />);
    expect(container.textContent?.toLowerCase()).not.toContain("precio va a caer");
    expect(screen.getByText(/no predice el precio/i)).toBeInTheDocument();
  });

  it("muestra Kultiva y nunca MUYU en las 4 pantallas (ES y EN) y en el title de index.html", async () => {
    const indexHtml = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf-8");
    expect(indexHtml).toMatch(/<title>.*Kultiva.*<\/title>/);
    expect(indexHtml.toLowerCase()).not.toContain("muyu");

    const dictAll = [...Object.values(DICTIONARY.es), ...Object.values(DICTIONARY.en)].join(" ").toLowerCase();
    expect(dictAll).not.toContain("muyu");

    const parcelasJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/parcelas_demo.json"), "utf-8")
    );
    const planJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/plan_rotacion_demo.json"), "utf-8")
    );
    const climaJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/clima_mensual.json"), "utf-8")
    );
    const imergJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/imerg_mensual.json"), "utf-8")
    );
    const mercadoJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/mercado_resumen.json"), "utf-8")
    );
    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("parcelas_demo")) return { ok: true, json: async () => parcelasJson };
        if (String(url).includes("plan_rotacion_demo")) return { ok: true, json: async () => planJson };
        if (String(url).includes("clima_mensual")) return { ok: true, json: async () => climaJson };
        if (String(url).includes("imerg_mensual")) return { ok: true, json: async () => imergJson };
        if (String(url).includes("mercado_resumen")) return { ok: true, json: async () => mercadoJson };
        if (String(url).includes("oportunidades")) return { ok: true, json: async () => oportunidadesJson };
        return { ok: true, json: async () => ({ parcelas: [], fuentes: [] }) };
      })
    );

    window.localStorage.clear();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    );

    const checkNoMuyuVisible = () => {
      expect(container.textContent ?? "").toContain("Kultiva");
      expect((container.textContent ?? "").toLowerCase()).not.toContain("muyu");
      const ariaLabels = Array.from(container.querySelectorAll("[aria-label]"))
        .map((el) => el.getAttribute("aria-label") ?? "")
        .join(" ")
        .toLowerCase();
      expect(ariaLabels).not.toContain("muyu");
    };

    // 1. Entrada (ES)
    checkNoMuyuVisible();
    // 2. Cooperativa (ES)
    fireEvent.click(screen.getByRole("button", { name: /Trabajo en una cooperativa/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Oportunidades de esta campaña/i })).toBeInTheDocument()
    );
    checkNoMuyuVisible();
    // 3. DRA (ES)
    fireEvent.click(screen.getByRole("button", { name: /Cambiar de perfil/i }));
    fireEvent.click(screen.getByRole("button", { name: /Trabajo en la DRA/i }));
    await waitFor(() => expect(screen.getByText(/Desde junio/i)).toBeInTheDocument(), { timeout: 4000 });
    checkNoMuyuVisible();
    // 4. Ficha (ES)
    fireEvent.click(screen.getByRole("button", { name: /Cambiar de perfil/i }));
    fireEvent.click(screen.getByRole("button", { name: /Soy agricultor/i }));
    await waitFor(() => expect(screen.getByRole("article", { name: "Ficha del agricultor" })).toBeInTheDocument());
    checkNoMuyuVisible();

    // Switch to EN and verify Ficha + Entrada
    fireEvent.click(screen.getByRole("button", { name: /Cambiar idioma a inglés/i }));
    checkNoMuyuVisible();
    fireEvent.click(screen.getByRole("button", { name: /Switch profile/i }));
    checkNoMuyuVisible();

    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("muestra la tarjeta de helada solo si alguna chacra tiene heladas", async () => {
    const sinHelada = construirResumenHelada(
      [
        {
          id: "P01",
          distrito: "huanta",
          elev_dem_m: 2667,
          dato_hasta: "2026-11-12",
          clima_campana_2025_2026: { dias_helada: 0 },
        },
      ],
      "es"
    );
    expect(sinHelada).toBeNull();

    const conHelada = construirResumenHelada(
      [
        {
          id: "P05",
          distrito: "chiara_alta_2",
          elev_dem_m: 3682,
          dato_hasta: "2026-11-12",
          clima_campana_2025_2026: { dias_helada: 16 },
        },
      ],
      "es"
    );
    expect(conHelada).not.toBeNull();
    expect(conHelada?.resumenCorto).toContain("16");

    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );
    const parcelasJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/parcelas_demo.json"), "utf-8")
    );
    const planJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/plan_rotacion_demo.json"), "utf-8")
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("parcelas_demo")) return { ok: true, json: async () => parcelasJson };
        if (String(url).includes("plan_rotacion_demo")) return { ok: true, json: async () => planJson };
        if (String(url).includes("oportunidades")) return { ok: true, json: async () => oportunidadesJson };
        return { ok: true, json: async () => ({ parcelas: [], celdas: {} }) };
      })
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CooperativaView />
      </QueryClientProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByLabelText("Oportunidad de helada")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
    vi.unstubAllGlobals();
  });

  it("el botón 'Explícamelo simple' muestra insignia IA, no tiene chat y usa plantilla si falla la red", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network fail"));
    const parcelaMock = {
      id: "P05",
      distrito: "chiara_alta_2",
      latitude: -13.3,
      longitude: -74.2,
      elev_dem_m: 3682,
      power_cell_id: "c-27_-119",
      clima_campana_2025_2026: {
        t2m_media_ajustada_c: 9.2,
        tmin_absoluta_ajustada_c: -2.9,
        dias_helada: 16,
        racha_seca_max_dias: 20,
      },
      suelo: { ph: 5.8, textura_clase: "franco", estado: "observado" as const, fuente: "SoilGrids" },
      estado: "observado" as const,
      dato_hasta: "2026-11-12",
    };

    const { container } = render(
      <ExplicacionIA
        parcela={parcelaMock}
        planItem={{ estrategia_elegida: "B", cultivo_asignado: "Quinua" }}
      />
    );

    expect(container.querySelector("input[type='text'], textarea")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Explícamelo simple/i }));

    await waitFor(() => {
      expect(screen.getByText("Redactado por IA con estos datos")).toBeInTheDocument();
    });
    expect(container.textContent).toContain("Siembra Quinua en tu chacra de Chiara");
    expect(container.textContent?.toLowerCase()).not.toContain("network fail");
    fetchMock.mockRestore();
  });

  it("la validación de explicar-chacra rechaza números inventados y devuelve plantilla fija", () => {
    const datos = {
      parcela_id: "P05",
      distrito: "chiara_alta_2",
      elev_dem_m: 3682,
      estrategia_elegida: "B" as const,
      cultivo_asignado: "Quinua",
      dias_helada: 16,
      humedad_suelo_pct: 62,
      ph_suelo: 5.8,
      ndvi_ultimo: 0.34,
      enis_papa_ayacucho_pct: 19.3,
      lluvia_oct_anomalia_pct: -44.3,
    };

    const conNumeroInventado = "Siembra Quinua porque tu rendimiento subirá 85 por ciento en P05.";
    const resNum = validarRespuestaIA(conNumeroInventado, datos);
    expect(resNum.valida).toBe(false);
    expect(resNum.motivo).toContain("numero_no_presente:85");

    const conCultivoNoRec = "Mejor siembra maíz en lugar de Quinua en P05.";
    const resCult = validarRespuestaIA(conCultivoNoRec, datos);
    expect(resCult.valida).toBe(false);

    const plantilla = generarPlantillaFija(datos, "es");
    expect(plantilla).toContain("Quinua");
    expect(plantilla).toContain("Desde julio de 2025 hubo 16 noches de helada");
    expect(plantilla).toContain("la estrategia que reparte el riesgo (como la quinua)");
  });

  it("valida prueba1_tuna_huanta.json con gdd_tuna_jul1_a_dato_hasta y dato_hasta", () => {
    const raw = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/prueba1_tuna_huanta.json"), "utf-8")
    );
    const parsed = Prueba1TunaSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.gdd_tuna_jul1_a_dato_hasta.dato_hasta).toBe(parsed.data._metadata.dato_hasta);
    }
  });

  it("Cooperativa muestra máximo 3 oportunidades iniciales, 'Ver más' expande a todas y sin frases prohibidas", async () => {
    const parcelasJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/parcelas_demo.json"), "utf-8")
    );
    const planJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/plan_rotacion_demo.json"), "utf-8")
    );
    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("parcelas_demo")) return { ok: true, json: async () => parcelasJson };
        if (String(url).includes("plan_rotacion_demo")) return { ok: true, json: async () => planJson };
        if (String(url).includes("oportunidades")) return { ok: true, json: async () => oportunidadesJson };
        return { ok: true, json: async () => ({ parcelas: [], celdas: {} }) };
      })
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <CooperativaView />
      </QueryClientProvider>
    );

    const sec = await waitFor(() =>
      screen.getByRole("region", { name: /Oportunidades de esta campaña/i })
    );
    expect(sec.querySelectorAll("article.muyu-alert-card")).toHaveLength(3);

    const btnVerMas = screen.getByRole("button", { name: /Ver más/i });
    fireEvent.click(btnVerMas);
    expect(sec.querySelectorAll("article.muyu-alert-card")).toHaveLength(6);

    const fullText = (container.textContent ?? "").toLowerCase();
    for (const bad of ["pronóstico de precio", "el precio será", "rendimiento garantizado", "78/100"]) {
      expect(fullText).not.toContain(bad);
    }
    vi.unstubAllGlobals();
  });

  it("CalendarioChacra tiene SVG role='img', aria-label accesible y frase resumen", () => {
    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );
    const calP05 = oportunidadesJson.por_parcela.find((p: { parcela_id: string }) => p.parcela_id === "P05").calendario;
    const { container } = render(<CalendarioChacra calendario={calP05} modo="completa" />);

    const img = screen.getByRole("img", { name: /Calendario agrícola agosto a julio para P05/i });
    expect(img).toBeInTheDocument();
    expect(img.tagName.toLowerCase()).toBe("svg");
    const resumen = container.querySelector("[data-calendario-resumen]");
    expect(resumen?.textContent).toContain("noviembre");
  });

  it("Ficha del agricultor muestra exactamente 1 oportunidad + calendario simple y sin decimales", async () => {
    const parcelasJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/parcelas_demo.json"), "utf-8")
    );
    const planJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/plan_rotacion_demo.json"), "utf-8")
    );
    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("parcelas_demo")) return { ok: true, json: async () => parcelasJson };
        if (String(url).includes("oportunidades")) return { ok: true, json: async () => oportunidadesJson };
        return { ok: true, json: async () => planJson };
      })
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <FichaView parcelaId="P10" />
      </QueryClientProvider>
    );

    const ficha = await waitFor(() => screen.getByRole("article", { name: "Ficha del agricultor" }));
    const opsFicha = container.querySelectorAll("[data-ficha-oportunidad]");
    expect(opsFicha).toHaveLength(1);
    expect(opsFicha[0].getAttribute("data-ficha-oportunidad")).toBe("O4");
    expect(ficha.querySelector("svg[role='img']")).toBeInTheDocument();
    expect(ficha.textContent ?? "").not.toMatch(/\d+\.\d+/);
    vi.unstubAllGlobals();
  });

  it("Vista Región (DRA) muestra la línea del semáforo regional y su nota de siguiente fase", async () => {
    const climaJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/clima_mensual.json"), "utf-8")
    );
    const imergJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/imerg_mensual.json"), "utf-8")
    );
    const mercadoJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/mercado_resumen.json"), "utf-8")
    );
    const oportunidadesJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public/data/oportunidades.json"), "utf-8")
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("clima_mensual")) return { ok: true, json: async () => climaJson };
        if (String(url).includes("imerg_mensual")) return { ok: true, json: async () => imergJson };
        if (String(url).includes("mercado_resumen")) return { ok: true, json: async () => mercadoJson };
        if (String(url).includes("oportunidades")) return { ok: true, json: async () => oportunidadesJson };
        return { ok: true, json: async () => ({ fuentes: [] }) };
      })
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DraView />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(
        screen.getByText("Si estas 10 chacras siguen la recomendación: 7 tarwi o haba, 2 quinua y 1 papa.")
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Siguiente fase: con las siembras registradas por cooperativa/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("validator de explicar-chacra acepta números de oportunidades y las incluye en plantilla fija", () => {
    const datosConOps = {
      parcela_id: "P01",
      distrito: "huanta",
      elev_dem_m: 2667,
      estrategia_elegida: "C" as const,
      cultivo_asignado: "tarwi o haba",
      dias_helada: 0,
      humedad_suelo_pct: 58,
      ph_suelo: 6.2,
      ndvi_ultimo: 0.42,
      enis_papa_ayacucho_pct: 19.3,
      lluvia_oct_anomalia_pct: -44.3,
      oportunidades: [
        {
          codigo: "O3",
          titulo: "Fecha estimada de cosecha de tuna",
          accion_positiva:
            "Tu tuna estaría lista a fin de año (alrededor del 30 de diciembre), unos 10 días antes de lo normal: busca comprador desde ya.",
          por_que_corto:
            "Acumula 2047 grados-día desde el 1 de julio frente a una meta de 2,751 grados-día (normal: 9 de enero).",
          estado: "estimado",
          nota: "Supone brotamiento 1 de julio",
          valores: { adelanto_dias: 10 },
        },
      ],
    };

    const ok = validarRespuestaIA(
      "En tu chacra P01 conviene tarwi o haba y tu tuna estaría lista alrededor del 30 de diciembre (10 días antes).",
      datosConOps
    );
    expect(ok.valida).toBe(true);

    const plantilla = generarPlantillaFija(datosConOps, "es");
    expect(plantilla).toContain("30 de diciembre");
  });
});
