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

export type Parcela = z.infer<typeof ParcelaSchema>;
export type PlanRotacionContract = z.infer<typeof PlanRotacionContractSchema>;
export type ImergMes = z.infer<typeof ImergMesSchema>;
export type ClimaMensualRegistro = z.infer<typeof ClimaMensualRegistroSchema>;
export type MercadoMes = z.infer<typeof MercadoMesSchema>;
export type Fuente = z.infer<typeof FuenteSchema>;
export type NdviParcela = z.infer<typeof NdviParcelaSchema>;
