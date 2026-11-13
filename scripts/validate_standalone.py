#!/usr/bin/env python3
"""
validate_standalone.py — valida un ignis-demo.html generado antes de mostrarlo.

Corre DESPUES de build_standalone_html.py y ANTES de decir "listo".
Detecta la clase de error que un build verde no ve: el HTML se genera sin los datos
y la pagina queda en blanco, sin que npm run build ni un 200 OK lo detecten.

Uso:
  python3 validate_standalone.py ignis-demo.html
  python3 validate_standalone.py ignis-demo.html --quiet     # solo fallas
Salida: exit 0 si pasa, exit 1 si hay algo FATAL.
"""

import argparse
import json
import os
import re
import sys

FATAL, WARN = [], []


def check(cond, level, msg):
    if not cond:
        (FATAL if level == "F" else WARN).append(msg)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    p = a.path
    check(os.path.exists(p), "F", f"no existe el archivo: {p}")
    if FATAL:
        print("\n".join("FATAL  " + m for m in FATAL))
        return 1

    src = open(p, encoding="utf-8", errors="replace").read()
    size = len(src.encode("utf-8"))
    print(f"archivo: {p}  ({size/1024:.0f} KB)")

    # ---- 1. Los datos tienen que estar embebidos y ANTES de usarse
    tiene_decl = re.search(r"(const|var|let)\s+CALENDAR\s*=", src)
    check(bool(tiene_decl), "F", "NO está definido CALENDAR: la página va a explotar con ReferenceError")
    if tiene_decl:
        uso = src.find("CALENDAR.days")
        check(uso > tiene_decl.start(), "F", "CALENDAR se usa ANTES de declararse")
        m = re.search(r"CALENDAR\s*=\s*(\{.*?\})\s*;\s*\n", src, re.S)
        if m:
            try:
                data = json.loads(m.group(1))
                days = data.get("days", [])
                cells = data.get("cells", [])
                print(f"datos: {len(days)} días ({days[0] if days else '-'} → {days[-1] if days else '-'}) · {len(cells)} celdas")
                check(len(days) > 0, "F", "CALENDAR.days está vacío")
                check(len(cells) > 0, "F", "CALENDAR.cells está vacío")
                with_ps = sum(1 for c in cells if any("por_sensor" in d for d in c.get("days", {}).values()))
                check(with_ps > 0, "W", "ninguna celda tiene por_sensor: los KPI por sensor van a dar 0")
            except json.JSONDecodeError as e:
                FATAL.append(f"CALENDAR no es JSON válido al parsear: {e}")
    check(size > 200_000, "F", f"el archivo pesa {size/1024:.0f} KB: parece generado SIN los datos (esperado > 200 KB)")

    # ---- 2. Secretos y claves en el cliente
    claves = re.findall(r"(?:key|token|api[_-]?key)\s*[=:]\s*[\"']([A-Za-z0-9_\-\.]{12,})[\"']", src, re.I)
    # CARTO exige clave en basemaps.cartocdn.com (verificado: sin key la tesela trae
    # la marca "API KEY REQUIRED"). Es una clave PUBLICA de cliente por diseno:
    # no es fatal, pero debe venir de una env var y estar restringida por dominio.
    carto = [k for k in claves if k.startswith("cb1_") or k.startswith("carto_")]
    otras = [k for k in claves if k not in carto]
    check(not otras, "F", f"credencial NO publica embebida en el HTML: {otras[:2]}")
    check(not carto, "W", "clave de CARTO como literal: usala desde env (NEXT_PUBLIC_CARTO_KEY) y restringila por dominio en el panel de CARTO")
    check("basemaps.cartocdn.com" not in src or "?key=" in src,
          "F", "tiles de CARTO SIN ?key=: la tesela sale con la marca de agua 'API KEY REQUIRED'")

    # ---- 3. Marcas de 'generado por IA' que el usuario ya rechazó
    emojis = re.findall(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", src)
    check(not emojis, "W", f"emojis en la interfaz: {sorted(set(emojis))[:8]}")
    for pat, msg in [
        (r"bg-gradient|(?<!repeating-)linear-gradient\(\s*(?!45deg)", "gradiente decorativo"),
        (r"backdrop-blur", "glassmorphism (backdrop-blur)"),
        (r"text-pink-|text-rose-|bg-emerald-|#A855F7|#06B6D4", "colores fuera de la paleta autoritativa"),
        (r"\balert\(", "alert() como UX"),
        (r"cdn\.tailwindcss\.com", "Tailwind Play CDN en producción"),
    ]:
        check(not re.search(pat, src, re.I), "W", msg)

    # ---- 4. Accesibilidad / legal
    check("attributionControl: false" not in src, "W",
          "attributionControl:false: CARTO y Esri exigen atribución visible")
    check(not re.search(r"style=\"[^\"]*@media", src), "W",
          "@media dentro de un atributo style: es CSS inválido, ese bloque queda invisible")

    # ---- 5. Cinco números que no deben aparecer
    for bad in ["4.281.940", "85.000 focos", "42.3%", "42,3%"]:
        check(bad not in src, "W", f"número prohibido en el copy: {bad}")

    if not a.quiet:
        print(f"\nFATALES: {len(FATAL)} | ADVERTENCIAS: {len(WARN)}")
    for m in FATAL:
        print("FATAL  " + m)
    for m in WARN:
        print("WARN   " + m)
    if FATAL:
        print("\nRESULTADO: NO MOSTRAR. Corregir lo FATAL primero.")
        return 1
    print("\nRESULTADO: OK para mostrar." + (" (con advertencias)" if WARN else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
