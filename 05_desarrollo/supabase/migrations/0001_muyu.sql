-- Migracion inicial MUYU (Supabase / Postgres)
-- Reglas: cada tabla de datos incluye `estado` (CHECK 4 valores) y `dato_hasta`.
-- RLS activado en todas las tablas; rol `anon` solo tiene permiso SELECT.

CREATE TABLE IF NOT EXISTS celdas_power (
  cell_key TEXT PRIMARY KEY,
  elev_celda_m NUMERIC NOT NULL,
  normal_1991_2020_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcelas (
  id TEXT PRIMARY KEY,
  distrito TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  elev_dem_m NUMERIC NOT NULL,
  fuente_coord TEXT NOT NULL,
  es_aproximada BOOLEAN NOT NULL DEFAULT FALSE,
  power_cell_id TEXT NOT NULL REFERENCES celdas_power(cell_key),
  gradiente_c_km NUMERIC NOT NULL,
  ajuste_termico_c NUMERIC NOT NULL,
  clima_campana_json JSONB NOT NULL,
  suelo_json JSONB NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clima_mensual (
  cell_key TEXT NOT NULL REFERENCES celdas_power(cell_key),
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  t2m_media_c NUMERIC,
  tmin_media_c NUMERIC,
  tmin_absoluta_c NUMERIC,
  lluvia_mm NUMERIC,
  normal_1991_2020_t2m_c NUMERIC,
  anomalia_t2m_c NUMERIC,
  puesto_calor INTEGER,
  total_anios_mes INTEGER,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL,
  PRIMARY KEY (cell_key, anio, mes)
);

CREATE TABLE IF NOT EXISTS lluvia_imerg_mensual (
  mes_num INTEGER PRIMARY KEY CHECK (mes_num BETWEEN 1 AND 12),
  mes TEXT NOT NULL,
  total_2026_mm NUMERIC,
  media_2001_2025_mm NUMERIC,
  mediana_2001_2025_mm NUMERIC,
  anomalia_pct NUMERIC,
  puesto_seco_2001_2026 INTEGER,
  total_anios_serie INTEGER,
  dias_ge_1mm_2026 INTEGER,
  dias_ge_1mm_media_2001_2025 NUMERIC,
  nota_escala TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estrategias_bandas (
  parcela_id TEXT NOT NULL REFERENCES parcelas(id),
  estrategia TEXT NOT NULL CHECK (estrategia IN ('A', 'B', 'C')),
  nombre TEXT NOT NULL,
  cultivo_id TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  forma TEXT NOT NULL,
  radar_bandas_json JSONB NOT NULL,
  alertas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL,
  PRIMARY KEY (parcela_id, estrategia)
);

CREATE TABLE IF NOT EXISTS plan_rotacion (
  parcela_id TEXT PRIMARY KEY REFERENCES parcelas(id),
  distrito TEXT NOT NULL,
  elev_dem_m NUMERIC NOT NULL,
  cultivo_previo TEXT NOT NULL,
  estrategia_elegida TEXT NOT NULL CHECK (estrategia_elegida IN ('A', 'B', 'C')),
  cultivo_asignado TEXT NOT NULL,
  rotacion_con_leguminosa TEXT NOT NULL CHECK (rotacion_con_leguminosa IN ('✓', '✗')),
  chuno_tunta_json JSONB NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fuentes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  escala TEXT NOT NULL,
  url_o_referencia TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL
);

-- Activar RLS en todas las tablas
ALTER TABLE celdas_power ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clima_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE lluvia_imerg_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE estrategias_bandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_rotacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuentes ENABLE ROW LEVEL SECURITY;

-- Politicas SELECT solo para rol anon
CREATE POLICY "anon_select_celdas_power" ON celdas_power FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_parcelas" ON parcelas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_clima_mensual" ON clima_mensual FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_lluvia_imerg_mensual" ON lluvia_imerg_mensual FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_estrategias_bandas" ON estrategias_bandas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_plan_rotacion" ON plan_rotacion FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_fuentes" ON fuentes FOR SELECT TO anon USING (true);
