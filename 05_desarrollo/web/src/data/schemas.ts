import { z } from "zod";

export const EstadoSchema = z.enum([
  "observado",
  "estimado",
  "ilustrativo",
  "no_disponible",
]);

export type EstadoDato = z.infer<typeof EstadoSchema>;

export const BandaSchema = z.enum([
  "alto",
  "medio",
  "bajo",
  "evidencia_insuficiente",
]);

export const ParcelaSchema = z.object({
  id: z.string(),
  distrito: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  elev_dem_m: z.number(),
  power_cell_id: z.string(),
  clima_campana_2025_2026: z.object({
    t2m_media_ajustada_c: z.number(),
    tmin_absoluta_ajustada_c: z.number(),
    dias_helada: z.number(),
    racha_seca_max_dias: z.number(),
  }),
  suelo: z.object({
    ph: z.number().nullable().optional(),
    textura_clase: z.string().nullable().optional(),
    estado: EstadoSchema,
    fuente: z.string(),
  }),
  estado: EstadoSchema,
  dato_hasta: z.string().min(1),
});

export const ParcelasResponseSchema = z.array(ParcelaSchema);

export const EjeBandaSchema = z.object({
  banda: BandaSchema,
  estado: EstadoSchema,
  dato_hasta: z.string().min(1),
  motivo: z.string().optional(),
});

export const EstrategiaSchema = z.object({
  codigo: z.enum(["A", "B", "C"]),
  nombre: z.string(),
  cultivo_id: z.string(),
  color_hex: z.string(),
  forma: z.string(),
  radar_bandas: z.record(z.string(), EjeBandaSchema),
  alertas: z.array(
    z.object({
      regla: z.string(),
      mensaje: z.string(),
      estado: EstadoSchema,
    })
  ),
});

export const PlanItemSchema = z.object({
  parcela_id: z.string(),
  distrito: z.string(),
  elev_dem_m: z.number(),
  cultivo_previo: z.string(),
  estrategia_elegida: z.enum(["A", "B", "C"]),
  color_hex: z.string(),
  forma: z.string(),
  cultivo_asignado: z.string(),
  rotacion_con_leguminosa: z.enum(["✓", "✗"]),
  chuno_tunta: z.object({
    elegible_altitud_y_helada: z.boolean(),
    im_papa: z.union([z.number(), z.string()]).nullable(),
    estado_regla: z.string(),
  }),
  estado: EstadoSchema,
  dato_hasta: z.string().min(1),
});

export const PlanRotacionContractSchema = z.object({
  plan: z.array(PlanItemSchema),
  comparador: z.array(
    z.object({
      parcela_id: z.string(),
      distrito: z.string(),
      elev_dem_m: z.number(),
      escala_visible: z.object({
        clima: z.string(),
        terreno: z.string(),
      }),
      estrategias: z.record(z.string(), EstrategiaSchema),
    })
  ),
});

export const ImergMesSchema = z.object({
  mes_num: z.number(),
  mes: z.string(),
  total_2026_mm: z.union([z.number(), z.string()]).nullable(),
  media_2001_2025_mm: z.union([z.number(), z.string()]).nullable(),
  mediana_2001_2025_mm: z.union([z.number(), z.string()]).nullable(),
  anomalia_pct: z.union([z.number(), z.string()]).nullable(),
  puesto_seco_2001_2026: z.union([z.number(), z.string()]).nullable(),
  dias_ge_1mm_2026: z.union([z.number(), z.string()]).nullable(),
  nota_escala: z.string(),
  estado: EstadoSchema,
  dato_hasta: z.string().min(1),
});

export const ImergResponseSchema = z.array(ImergMesSchema);

export const ClimaMensualRegistroSchema = z.object({
  cell_key: z.string(),
  anio: z.number(),
  mes: z.number(),
  t2m_media_c: z.union([z.number(), z.string()]).nullable(),
  anomalia_t2m_c: z.union([z.number(), z.string()]).nullable(),
  puesto_calor: z.union([z.number(), z.string()]).nullable(),
  humedad_suelo_raiz: z.union([z.number(), z.string()]).nullable().optional(),
  estado: EstadoSchema,
  dato_hasta: z.string().min(1),
});

export const ClimaMensualResponseSchema = z.array(ClimaMensualRegistroSchema);

export const MercadoMesSchema = z.object({
  anio: z.number(),
  mes: z.number(),
  ingreso_t: z.number(),
  precio_soles_kg: z.number(),
  boletin_fuente: z.string(),
  verificacion: z.string(),
  im_papa: z.union([z.number(), z.string()]).nullable(),
  etiqueta_riesgo: z.string().nullable(),
  nota: z.string().nullable().optional(),
  fuente_id: z.string(),
  estado: EstadoSchema,
  dato_hasta: z.string().min(1),
});

export const MercadoResponseSchema = z.array(MercadoMesSchema);

export const FuenteSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  escala: z.string(),
  url_o_referencia: z.string(),
  aporta: z.string().nullable().optional(),
  estado: EstadoSchema,
  dato_hasta: z.string().min(1),
});

export const FuentesResponseSchema = z.array(FuenteSchema);

export const NdviRegistroSchema = z.object({
  calendar_date: z.string(),
  ndvi: z.union([z.number(), z.string()]).nullable(),
  estado: EstadoSchema,
});

export const NdviParcelaSchema = z.object({
  parcela_id: z.string(),
  dato_hasta: z.string(),
  registros: z.array(NdviRegistroSchema),
});

export const NdviResponseSchema = z.array(NdviParcelaSchema);

export const OportunidadItemSchema = z.object({
  codigo: z.string(),
  titulo: z.string(),
  accion_positiva: z.string(),
  por_que_corto: z.string(),
  accion_ficha: z.string(),
  valores_json: z.record(z.unknown()).optional(),
  fuente: z.string(),
  escala: z.string(),
  estado: EstadoSchema,
  nota: z.string(),
  dato_hasta: z.string(),
  prioridad: z.number().optional(),
});

export const OportunidadCooperativaSchema = z.object({
  codigo: z.string(),
  titulo: z.string(),
  accion_positiva: z.string(),
  por_que_corto: z.string(),
  parcelas_aplican: z.array(z.string()),
  parcela_referencia: z.string().optional(),
  fuente: z.string(),
  escala: z.string(),
  estado: EstadoSchema,
  nota: z.string(),
  dato_hasta: z.string(),
});

export const CalendarioMesSchema = z.object({
  mes_num: z.number(),
  mes_corto: z.string(),
  mes_largo: z.string(),
  riesgo_helada: z.boolean(),
  inicio_normal_lluvias: z.boolean(),
  lluvias_2026_pendientes: z.boolean(),
  ventana_segura: z.boolean(),
  cosecha_tuna: z.boolean(),
  precio_papa_bajo: z.boolean(),
  precio_papa_alto: z.boolean(),
});

export const CalendarioChacraSchema = z.object({
  parcela_id: z.string(),
  cultivo_asignado: z.string(),
  tiene_helada: z.boolean(),
  tiene_tuna: z.boolean(),
  tiene_papa_en_plan: z.boolean(),
  frase_resumen: z.string(),
  aria_label: z.string(),
  meses: z.array(CalendarioMesSchema),
});

export const OportunidadesParcelaSchema = z.object({
  parcela_id: z.string(),
  distrito: z.string(),
  elev_dem_m: z.number(),
  cultivo_asignado: z.string(),
  oportunidades_aplicables: z.array(z.string()),
  oportunidad_ficha: OportunidadItemSchema,
  oportunidades: z.array(OportunidadItemSchema),
  calendario: CalendarioChacraSchema,
});

export const SemaforoRegionalSchema = z.object({
  total_chacras: z.number(),
  conteo: z.object({
    tarwi_o_haba: z.number(),
    quinua: z.number(),
    papa: z.number(),
  }),
  linea: z.string(),
  nota_siguiente_fase: z.string(),
  estado: EstadoSchema,
  dato_hasta: z.string(),
});

export const VigilanciaRanchaSchema = z.object({
  cultivos_aplica: z.array(z.string()),
  ventana_inicio: z.string(),
  ventana_fin: z.string(),
  dato_hasta: z.string(),
  umbral_mm_dia: z.number(),
  dias_lluvia_7d: z.number(),
  normal_mediana_7d: z.number(),
  n_anios_referencia: z.number(),
  nivel: z.enum(["pocos", "varios", "frecuentes"]),
  titulo: z.string(),
  mensaje: z.string(),
  etiqueta_fuente: z.string(),
  estado: EstadoSchema,
  fuente: z.string(),
  enlace_senamhi: z.string(),
  enlace_senamhi_texto: z.string(),
});

export const OportunidadesContractSchema = z.object({
  global_o1_lluvias: z.record(z.unknown()).optional(),
  global_o4_precios_papa: z.object({
    advertencia: z.string(),
    meses: z.array(
      z.object({
        mes: z.number(),
        mes_nombre: z.string(),
        mediana_soles_kg: z.number(),
        min_soles_kg: z.number().optional(),
        max_soles_kg: z.number().optional(),
        n_anios: z.number().optional(),
      })
    ),
    fuente: z.string().optional(),
    estado: EstadoSchema.optional(),
    dato_hasta: z.string().optional(),
  }),
  global_o6_enis: z.record(z.unknown()).optional(),
  semaforo_regional: SemaforoRegionalSchema,
  oportunidades_cooperativa: z.array(OportunidadCooperativaSchema),
  por_parcela: z.array(OportunidadesParcelaSchema),
});

export const Prueba1TunaSchema = z.object({
  _metadata: z.object({
    dato_hasta: z.string().min(1),
    t_base_c: z.number(),
  }),
  gdd_tuna_jul1_a_dato_hasta: z.object({
    dato_hasta: z.string().min(1),
    t_base_c: z.number(),
    gdd_2026: z.number(),
    gdd_normal_1991_2020: z.number(),
    diferencia_gd: z.number(),
    puesto_1981_2026: z.number(),
    total_anios_serie: z.number(),
    adelanto_dias: z.number(),
    estado: EstadoSchema,
    nota: z.string().min(1),
  }),
});

export type Parcela = z.infer<typeof ParcelaSchema>;
export type PlanRotacionContract = z.infer<typeof PlanRotacionContractSchema>;
export type ImergMes = z.infer<typeof ImergMesSchema>;
export type ClimaMensualRegistro = z.infer<typeof ClimaMensualRegistroSchema>;
export type MercadoMes = z.infer<typeof MercadoMesSchema>;
export type Fuente = z.infer<typeof FuenteSchema>;
export type NdviParcela = z.infer<typeof NdviParcelaSchema>;
export type OportunidadItem = z.infer<typeof OportunidadItemSchema>;
export type OportunidadCooperativa = z.infer<typeof OportunidadCooperativaSchema>;
export type CalendarioMes = z.infer<typeof CalendarioMesSchema>;
export type CalendarioChacra = z.infer<typeof CalendarioChacraSchema>;
export type OportunidadesParcela = z.infer<typeof OportunidadesParcelaSchema>;
export type SemaforoRegional = z.infer<typeof SemaforoRegionalSchema>;
export type OportunidadesContract = z.infer<typeof OportunidadesContractSchema>;
export type VigilanciaRancha = z.infer<typeof VigilanciaRanchaSchema>;
