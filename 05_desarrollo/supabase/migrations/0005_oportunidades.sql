-- Migracion 0005: Oportunidades por chacra (O1-O6) y calendario agricola
-- RLS activado; rol anon solo tiene SELECT.

CREATE TABLE IF NOT EXISTS public.oportunidades (
  parcela_id TEXT NOT NULL REFERENCES public.parcelas(id),
  codigo TEXT NOT NULL CHECK (codigo IN ('O1', 'O2', 'O3', 'O4', 'O5', 'O6')),
  titulo TEXT NOT NULL,
  accion_positiva TEXT NOT NULL,
  por_que_corto TEXT NOT NULL,
  prioridad INTEGER NOT NULL,
  valores_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  fuente TEXT NOT NULL,
  escala TEXT NOT NULL,
  nota TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL CHECK (estado IN ('observado', 'estimado', 'ilustrativo', 'no_disponible')),
  dato_hasta TEXT NOT NULL,
  PRIMARY KEY (parcela_id, codigo)
);

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_oportunidades" ON public.oportunidades;
CREATE POLICY "anon_select_oportunidades"
  ON public.oportunidades
  FOR SELECT
  TO anon
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.oportunidades FROM anon, authenticated;
