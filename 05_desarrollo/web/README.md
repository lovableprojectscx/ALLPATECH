# MUYU Web (React + Vite + TypeScript)

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
