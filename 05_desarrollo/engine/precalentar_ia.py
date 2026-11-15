#!/usr/bin/env python3
"""
Precalienta la caché de `ia_explicaciones` llamando a la Edge Function
`explicar-chacra` para las 10 chacras (P01..P10) en es, en y qu,
con una pausa de 3 segundos entre llamadas.
"""

import http.client
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent
PARCELAS = [f"P{i:02d}" for i in range(1, 11)]
IDIOMAS = ["es", "en", "qu"]
PAUSA_SEG = 3.0


def load_env(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s and not s.startswith("#") and "=" in s:
            k, v = s.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def llamar_explicar_chacra(url: str, anon_key: str, parcela_id: str, idioma: str) -> Dict:
    req = urllib.request.Request(
        f"{url}/functions/v1/explicar-chacra",
        method="POST",
        data=json.dumps({"parcela_id": parcela_id, "idioma": idioma}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    env_web = load_env(BASE_DIR / "web" / ".env")
    env_root = load_env(BASE_DIR.parent / ".env")
    supabase_url = env_web.get("VITE_SUPABASE_URL") or env_root.get("SUPABASE_URL")
    anon_key = env_web.get("VITE_SUPABASE_ANON_KEY") or env_root.get("SUPABASE_ANON_KEY")

    if not supabase_url or not anon_key:
        raise SystemExit("[ERROR] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env")

    resultados: Dict[str, Dict[str, str]] = {p: {} for p in PARCELAS}
    total = len(PARCELAS) * len(IDIOMAS)
    ia_ok = 0
    idx = 0

    for p in PARCELAS:
        for idi in IDIOMAS:
            idx += 1
            try:
                data = llamar_explicar_chacra(supabase_url, anon_key, p, idi)
                es_plantilla = bool(data.get("es_plantilla", True))
                modelo = str(data.get("modelo") or "desconocido")
                motivo = data.get("motivo_plantilla")
                usado_cache = bool(data.get("usado_cache", False))

                if not es_plantilla:
                    ia_ok += 1
                    suf = " (caché)" if usado_cache else ""
                    celda = f"{modelo}{suf}"
                else:
                    celda = f"plantilla ({motivo or 'desconocido'})"
            except (urllib.error.URLError, http.client.HTTPException, TimeoutError, json.JSONDecodeError) as exc:
                celda = f"error ({type(exc).__name__})"

            resultados[p][idi] = celda
            print(f"[{idx}/{total}] {p} {idi} -> {celda}", flush=True)

            if idx < total:
                time.sleep(PAUSA_SEG)

    print("\n### Tabla de precalentamiento (chacra x idioma)\n")
    print("| Chacra | " + " | ".join(IDIOMAS) + " |")
    print("| :--- | " + " | ".join([":---"] * len(IDIOMAS)) + " |")
    for p in PARCELAS:
        row = [resultados[p].get(idi, "-") for idi in IDIOMAS]
        print(f"| {p} | " + " | ".join(row) + " |")

    print(f"\nTotal con es_plantilla=false: {ia_ok}/{total}")
    if ia_ok == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
