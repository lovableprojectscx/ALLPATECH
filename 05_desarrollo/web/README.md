# Kultiva Web (React + Vite + TypeScript)

## Configuración en Vercel
En el panel de Vercel (**Project Settings**):
- **Root Directory:** `05_desarrollo/web`
- **Framework Preset:** `Vite`

## Variables de entorno en Vercel
En **Project Settings → Environment Variables**, configura:

- `VITE_SUPABASE_URL`: URL del proyecto Supabase (ej. `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: clave pública `anon` (solo lectura con RLS)

> **Importante:** Nunca agregues `SUPABASE_SERVICE_ROLE_KEY` en Vercel ni en el código del frontend.

Si `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` no están configuradas (o Supabase no responde), la aplicación conmuta automáticamente al respaldo local en `public/data/*.json` (modo demo sin conexión).

## Comandos locales
```bash
npm install
npm run dev
npm test
npm run build
```

## Secreto para "Explícamelo simple" (Edge Function `explicar-chacra`)
La Edge Function `explicar-chacra` usa Gemini (`gemini-3.8-flash`) solo para redactar en lenguaje simple con los datos ya calculados en Supabase. Para activarla:

1. Entra al panel de **Supabase** (proyecto `gpnjqgdfwraqxoxzfwvn`).
2. Ve a **Edge Functions → Secrets** (o **Project Settings → Edge Functions**).
3. Agrega el secreto:
   - Nombre: `GEMINI_API_KEY`
   - Valor: tu clave de Google AI Studio (`https://aistudio.google.com/apikey`).
4. Guarda los cambios (no hace falta redesplegar la función; si el secreto no existe, la función devuelve automáticamente la plantilla fija).
