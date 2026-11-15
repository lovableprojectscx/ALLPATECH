# MUYU — Paso a paso para obtener cada API

**Para:** quien vaya a programar
**Fecha:** 15 de noviembre de 2026
**Complementa a:** `GUIA_APIS_Y_ENTORNO.md` (qué datos da cada API y para qué)

Tiempo total estimado: 30–45 minutos. Hazlo en este orden.

---

## Resumen

| # | API | ¿Necesita cuenta? | Tiempo | Prioridad |
|---|---|---|---|---|
| 1 | NASA POWER | No | 2 min (solo probar) | Hoy |
| 2 | SoilGrids | No | 2 min (solo probar) | Hoy |
| 3 | NASA Earthdata Login | **Sí, gratis** | 10 min | **Hoy, primero** |
| 4 | AppEEARS (SMAP, ECOSTRESS, HLS, NASADEM) | Usa Earthdata | 10 min + espera | Hoy |
| 5 | GPM IMERG (GES DISC) | Usa Earthdata | 10 min | Hoy |
| 6 | PISCO (SENAMHI vía IRI) | No | 5 min | Mañana |
| 7 | Anthropic API (ficha en quechua) | Sí, de pago por uso | 5 min | Al final |

---

## 1. NASA POWER (sin cuenta)

Solo prueba que responde. Pega esto en el navegador:

```
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG&latitude=-12.94&longitude=-74.25&start=20261001&end=20261007&format=JSON
```

✅ Funciona si ves un JSON con `properties.parameter.T2M_MAX`.
Valores `-999` = dato faltante (normal en los últimos días).

---

## 2. SoilGrids (sin cuenta)

```
https://rest.isric.org/soilgrids/v2.0/properties/query?lon=-74.25&lat=-12.94&property=clay&depth=0-5cm&value=mean
```

✅ Funciona si devuelve JSON. Si `mean` sale `null`, es normal en zonas urbanas: usa coordenadas de chacra, no de ciudad.

---

## 3. NASA Earthdata Login (la cuenta clave)

Sirve para AppEEARS, IMERG, SMAP, ECOSTRESS, HLS y NASADEM.

1. Entra a **https://urs.earthdata.nasa.gov/users/new**
2. Llena usuario, contraseña, correo. Afiliación: *Education* / UNSCH.
3. Confirma el correo que te llega.
4. Inicia sesión y entra a tu perfil → **Applications → Authorized Apps**.
5. Autoriza estas aplicaciones (botón "Approve More Applications", buscar por nombre):
   - **NASA GESDISC DATA ARCHIVE** (para IMERG)
   - **LP DAAC Data Pool** (para HLS, ECOSTRESS, NASADEM)
   - **NSIDC ECS DATAPOOL HTTPS** (para SMAP)
   > Si al descargar te sale error **401 / Unauthorized**, casi siempre falta autorizar una de estas.
6. Guarda tus credenciales en un archivo `.netrc` en tu carpeta de usuario (Python lo usa solo):

   **Windows:** `C:\Users\<tu_usuario>\_netrc` (sin extensión)
   **Linux/Mac:** `~/.netrc` y luego `chmod 600 ~/.netrc`

   ```
   machine urs.earthdata.nasa.gov login TU_USUARIO password TU_CONTRASEÑA
   ```

7. Copia lo mismo al `.env` del proyecto:

   ```env
   EARTHDATA_USER=TU_USUARIO
   EARTHDATA_PASS=TU_CONTRASEÑA
   ```

⚠️ `.netrc` y `.env` **nunca** se suben a GitHub. Agrégalos a `.gitignore`.

---

## 4. AppEEARS (SMAP, ECOSTRESS, HLS, NASADEM por punto)

**Opción fácil (recomendada para hoy): por la web**

1. Entra a **https://appeears.earthdatacloud.nasa.gov** e inicia sesión con Earthdata.
2. **Extract → Point Sample → Start a new request**.
3. Sube un CSV con las 10 parcelas:
   ```csv
   ID,Category,Latitude,Longitude
   P01,demo,-12.94,-74.25
   P02,demo,-13.05,-74.20
   ```
4. Fechas: 01-01-2019 a hoy.
5. Busca y agrega capas:
   - `NASADEM` → elevación
   - `SPL3SMP_E` → humedad del suelo (SMAP)
   - `ECO` (ECOSTRESS) → ET / ESI
   - `HLSL30` y `HLSS30` → bandas para NDVI
   > Copia los nombres exactos que muestra la página; las versiones cambian.
6. **Submit**. Te llega un correo cuando termina (de minutos a horas).
7. **Explore → Download** → baja los CSV a `data/raw/appeears/`.

**Opción por código (para repetirlo):**

```python
import requests, os
API = "https://appeears.earthdatacloud.nasa.gov/api/"
r = requests.post(API + "login", auth=(os.environ["EARTHDATA_USER"], os.environ["EARTHDATA_PASS"]))
token = r.json()["token"]
head = {"Authorization": f"Bearer {token}"}
productos = requests.get(API + "product").json()   # ver nombres exactos
print([p["ProductAndVersion"] for p in productos if "NASADEM" in p["ProductAndVersion"]])
```

✅ Funciona si imprime algo como `NASADEM_HGT.001`.

---

## 5. GPM IMERG (lluvia)

⚠️ **Importante:** el registro **Final V07 termina en septiembre de 2025**. Para 2026 usa **Late Run** (o Early Run), que es casi en tiempo real.

**Opción fácil: Giovanni (web, sin código)**

1. Entra a **https://giovanni.gsfc.nasa.gov** con Earthdata.
2. Busca "IMERG Late daily" → elige área de Ayacucho → fechas → *Time series* → descarga CSV.

**Opción por código: librería `earthaccess`**

```bash
pip install earthaccess
```

```python
import earthaccess
earthaccess.login(strategy="netrc")          # usa tu .netrc
resultados = earthaccess.search_data(
    short_name="GPM_3IMERGDL",                 # IMERG Late, diario (confirmar en Earthdata Search)
    temporal=("2026-07-01", "2026-10-31"),
    bounding_box=(-74.6, -13.4, -73.9, -12.6), # oeste, sur, este, norte (Ayacucho aprox.)
)
print(len(resultados))
earthaccess.download(resultados, "data/raw/imerg/")
```

> Confirma el `short_name` en **https://search.earthdata.nasa.gov** buscando "IMERG Late daily". Los archivos vienen en NetCDF/HDF5: se leen con `xarray`.

---

## 6. PISCO de SENAMHI (sin cuenta)

1. Entra a **https://iridl.ldeo.columbia.edu/SOURCES/.SENAMHI/.HSR/.PISCO/**
2. Elige `Prec` (lluvia) o `Temp` (temperatura).
3. En el dataset: **Data Selection** → recorta longitud y latitud de Ayacucho → **Data Files** → descarga CSV o NetCDF.

⚠️ Fechas disponibles: temperatura diaria hasta **2016**; lluvia mensual hasta **julio 2025**. Úsalo solo para normales históricas, no para 2026.

---

## 7. Anthropic API (ficha en español y quechua)

1. Entra a **https://console.anthropic.com** y crea cuenta.
2. **Settings → Billing**: agrega saldo (unos pocos dólares alcanzan para la demo).
3. **API Keys → Create Key** → copia la clave (solo se muestra una vez).
4. Al `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Prueba:
   ```bash
   pip install anthropic
   ```
   ```python
   import anthropic
   c = anthropic.Anthropic()
   m = c.messages.create(model="claude-sonnet-5-5", max_tokens=200,
       messages=[{"role": "user", "content": "Di hola en quechua chanka"}])
   print(m.content[0].text)
   ```

⚠️ El quechua generado **debe revisarlo una persona quechuahablante** antes de mostrarlo.

---

## Checklist final

- [ ] POWER responde en el navegador
- [ ] SoilGrids responde
- [ ] Cuenta Earthdata creada y 3 aplicaciones autorizadas
- [ ] `.netrc` y `.env` creados y en `.gitignore`
- [ ] Solicitud de AppEEARS enviada (10 parcelas)
- [ ] IMERG Late descargado para jul–oct 2026
- [ ] PISCO descargado (normales históricas)
- [ ] API key de Anthropic probada
