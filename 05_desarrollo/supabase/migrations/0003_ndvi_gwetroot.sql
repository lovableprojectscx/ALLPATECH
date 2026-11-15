-- Migracion 0003: GWETROOT en clima_mensual, campo aporta en fuentes, y ndvi_parcelas (MODIS MOD13Q1)
-- Proyecto Supabase: gpnjqgdfwraqxoxzfwvn

ALTER TABLE clima_mensual
  ADD COLUMN IF NOT EXISTS humedad_suelo_raiz NUMERIC,
  ADD COLUMN IF NOT EXISTS nota_humedad TEXT;

ALTER TABLE fuentes
  ADD COLUMN IF NOT EXISTS aporta TEXT;

CREATE TABLE IF NOT EXISTS ndvi_parcelas (
  parcela_id TEXT NOT NULL REFERENCES parcelas(id),
  modis_date TEXT NOT NULL,
  calendar_date TEXT NOT NULL,
  ndvi NUMERIC,
  pixel_reliability INTEGER,
  fuente_id TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL,
  PRIMARY KEY (parcela_id, modis_date)
);

ALTER TABLE ndvi_parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_ndvi_parcelas" ON ndvi_parcelas FOR SELECT TO anon USING (true);
