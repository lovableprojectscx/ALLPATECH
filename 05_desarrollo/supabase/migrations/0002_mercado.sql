-- Migracion 0002: Tablas de mercado de papa, ENIS y produccion regional
-- Proyecto Supabase: gpnjqgdfwraqxoxzfwvn

CREATE TABLE IF NOT EXISTS mercado_papa_mensual (
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ingreso_t NUMERIC NOT NULL,
  precio_soles_kg NUMERIC NOT NULL,
  boletin_fuente TEXT NOT NULL,
  verificacion TEXT NOT NULL,
  im_papa NUMERIC,
  promedio_base_t NUMERIC,
  anios_base INTEGER,
  etiqueta_riesgo TEXT,
  nota TEXT,
  fuente_id TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL,
  PRIMARY KEY (anio, mes)
);

CREATE TABLE IF NOT EXISTS enis (
  id TEXT PRIMARY KEY,
  ambito TEXT NOT NULL,
  campana TEXT NOT NULL,
  variable TEXT NOT NULL,
  valor TEXT NOT NULL,
  variacion TEXT,
  fuente TEXT NOT NULL,
  fuente_id TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  nota TEXT,
  dato_hasta TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS produccion_region (
  id TEXT PRIMARY KEY,
  cultivo TEXT NOT NULL,
  anio TEXT NOT NULL,
  variable TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  unidad TEXT NOT NULL,
  fuente TEXT NOT NULL,
  fuente_id TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  nota TEXT,
  dato_hasta TEXT NOT NULL
);

ALTER TABLE mercado_papa_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE enis ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_region ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_mercado_papa_mensual" ON mercado_papa_mensual FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_enis" ON enis FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_produccion_region" ON produccion_region FOR SELECT TO anon USING (true);
