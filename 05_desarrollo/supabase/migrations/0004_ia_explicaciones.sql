-- Migración 0004: Caché y control de tasa para Edge Function explicar-chacra

CREATE TABLE IF NOT EXISTS public.ia_explicaciones (
  parcela_id text NOT NULL,
  idioma text NOT NULL CHECK (idioma IN ('es', 'en', 'qu')),
  texto text NOT NULL,
  modelo text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  data_hash text NOT NULL,
  PRIMARY KEY (parcela_id, idioma)
);

ALTER TABLE public.ia_explicaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ia_explicaciones_anon_select" ON public.ia_explicaciones;
CREATE POLICY "ia_explicaciones_anon_select"
  ON public.ia_explicaciones
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.ia_explicaciones FROM anon, authenticated;

-- Registro interno para límite global de 30 llamadas/minuto (solo service_role)
CREATE TABLE IF NOT EXISTS public.ia_llamadas (
  id bigserial PRIMARY KEY,
  creado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_llamadas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ia_llamadas FROM anon, authenticated;
