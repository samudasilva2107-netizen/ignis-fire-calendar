#!/usr/bin/env python3
"""
IGNIS — Backfill histórico de focos MODIS + VIIRS (NASA FIRMS Area API)

Objetivo: generar 3-4 años de serie diaria para que el calendario pueda mostrar
"cuantos focos tuvo un mes a traves de distintos anios" (requisito textual de la
autora del desafio, CONAE/NASA).

Uso:
  export FIRMS_MAP_KEY=xxxxx        # o --key-file ~/.firms-key
  python3 backfill_firms.py --dry-run          # ver el plan sin gastar requests
  python3 backfill_firms.py                    # correr de verdad (~15-25 min)

  # opciones
  --start 2023-01-01  --end 2026-11-12
  --bbox -68.5 -35.0 -56.0 -22.0     # oeste,sur,este,norte  (formato API FIRMS)
  --grain 0.05
  --outdir salida_backfill
  --cache cache_firms

Salidas (mismo contrato que la demo):
  harmonized.csv   una fila por celda-dia-sensor (con por_sensor agregado)
  calendar.json    cells[] -> days{YYYY-MM-DD: {n, frp_max, sensores, por_sensor}}
  kpi.json         KPIs globales + por anio + por mes
  monthly.json     indice anio/mes -> totales (para el selector de la UI)

Decisiones tomadas (no cambiar sin motivo):
  * Procesamiento: _SP (Standard Processing) para todo el historico; _NRT solo
    para los ultimos 10 dias, donde SP todavia no esta completo.
  * Ventanas de 5 dias: es el maximo que acepta la API (DAY_RANGE 1..5).
  * Cache por (fuente, ventana): re-ejecutar no vuelve a pedir lo ya bajado.
  * Silicon nobre: Suomi-NPP excluido (ceso el 2026-11-02 13:00 UTC).
  * Reintentos con backoff y 1 request por segundo para no gatillar rate limit.
"""

import argparse
import csv
import io
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta

API = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

# fuente FIRMS -> sensor logico
PLATFORMS = {
    "MODIS": {"sp": "MODIS_SP", "nrt": "MODIS_NRT", "sensor": "MODIS", "pixel_km2": 1.0, "desde": "2000-02-24"},
    "N20": {"sp": "VIIRS_NOAA20_SP", "nrt": "VIIRS_NOAA20_NRT", "sensor": "VIIRS", "pixel_km2": 0.375 * 0.375, "desde": "2018-01-01"},
    "N21": {"sp": "VIIRS_NOAA21_SP", "nrt": "VIIRS_NOAA21_NRT", "sensor": "VIIRS", "pixel_km2": 0.375 * 0.375, "desde": "2024-01-17"},
    # Suomi-NPP: historico 2012-01-20 -> 2026-11-02 13:00 UTC (cese oficial). Solo aporta al archivo.
    "NPP": {"sp": "VIIRS_SNPP_SP", "nrt": "VIIRS_SNPP_NRT", "sensor": "VIIRS", "pixel_km2": 0.375 * 0.375, "desde": "2012-01-20", "hasta": "2026-11-02"},
}
VIIRS_CONF = {"l": 30.0, "low": 30.0, "n": 60.0, "nominal": 60.0, "h": 90.0, "high": 90.0}

WINDOW_DAYS = 5          # maximo de la API
RATE_SLEEP = 1.0         # segundos entre requests
RETRIES = 4


def d(s):
    return datetime.strptime(s, "%Y-%m-%d").date()


def windows(start, end, step=WINDOW_DAYS):
    cur = start
    while cur <= end:
        w_end = min(cur + timedelta(days=step - 1), end)
        yield cur, w_end
        cur = w_end + timedelta(days=1)


def fetch(url, cache_path):
    """Descarga con cache en disco y reintentos."""
    if os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            return f.read()
    last = None
    for attempt in range(RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "IGNIS-backfill/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                txt = r.read().decode("utf-8", errors="replace")
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            with open(cache_path, "w", encoding="utf-8") as f:
                f.write(txt)
            time.sleep(RATE_SLEEP)
            return txt
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(2 ** (attempt + 1) * 3)
                continue
            raise
        except Exception as e:
            last = e
            time.sleep(2 ** (attempt + 1))
    raise RuntimeError(f"fallo tras {RETRIES} intentos: {last}")


def parse_csv(txt, sensor, platform):
    rdr = csv.DictReader(io.StringIO(txt))
    out = []
    if not rdr.fieldnames:
        return out
    for row in rdr:
        try:
            lat = float(row["latitude"]); lon = float(row["longitude"])
        except (KeyError, TypeError, ValueError):
            continue
        try:
            frp = float(row.get("frp") or 0.0)
        except ValueError:
            frp = 0.0
        conf_raw = (row.get("confidence") or "").strip()
        try:
            conf = float(conf_raw) if conf_raw and conf_raw[0].isdigit() else VIIRS_CONF.get(conf_raw.lower())
        except ValueError:
            conf = None
        out.append({
            "lat": lat, "lon": lon,
            "date": (row.get("acq_date") or "").strip(),
            "frp": frp, "conf": conf,
            "dn": (row.get("daynight") or "").strip().upper(),
            "sensor": sensor, "platform": platform,
        })
    return out


def cell_of(lat, lon, grain):
    clat = math.floor(lat / grain) * grain + grain / 2
    clon = math.floor(lon / grain) * grain + grain / 2
    return round(clat, 4), round(clon, 4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2000-11-01")
    ap.add_argument("--end", default=date.today().isoformat())
    ap.add_argument("--bbox", nargs=4, type=float, default=[-68.5, -35.0, -56.0, -22.0],
                    metavar=("W", "S", "E", "N"))
    ap.add_argument("--grain", type=float, default=0.05)
    ap.add_argument("--outdir", default="salida_backfill")
    ap.add_argument("--cache", default="cache_firms")
    ap.add_argument("--key-file", default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--split-year", action="store_true",
                    help="emite calendar-YYYY.json por año (GitHub rechaza archivos >100 MB)")
    ap.add_argument("--nrt-tail", type=int, default=10, help="dias finales que se piden en NRT")
    args = ap.parse_args()

    key = os.environ.get("FIRMS_MAP_KEY", "").strip()
    if not key and args.key_file:
        with open(os.path.expanduser(args.key_file)) as f:
            key = f.read().strip()
    if not key and not args.dry_run:
        print("ERROR: falta FIRMS_MAP_KEY (variable de entorno o --key-file).", file=sys.stderr)
        return 2

    start, end = d(args.start), d(args.end)
    w, s, e, n = args.bbox
    area = f"{w},{s},{e},{n}"
    # NRT solo sirve para los ultimos dias reales (no es un producto historico)
    nrt_from = date.today() - timedelta(days=args.nrt_tail)

    plan = []
    for plat, cfg in PLATFORMS.items():
        p_start = max(start, d(cfg["desde"]))
        p_end = min(end, d(cfg["hasta"])) if cfg.get("hasta") else end
        if p_start > p_end:
            continue
        for a, b in windows(p_start, p_end):
            src = cfg["nrt"] if a >= nrt_from else cfg["sp"]
            plan.append((plat, a, b, src))

    print(f"AOI (W,S,E,N): {area}")
    print(f"Rango: {start} -> {end} ({(end-start).days+1} dias)")
    print(f"Ventanas de {WINDOW_DAYS} dias x {len(PLATFORMS)} plataformas = {len(plan)} requests")
    print(f"Tiempo estimado: ~{len(plan)*RATE_SLEEP/60:.0f} min (sin contar reintentos)\n")
    if args.dry_run:
        for plat, a, b, src in plan[:6]:
            print(f"  {plat:5} {a} .. {b}  {src}")
        print("  ...")
        for plat, a, b, src in plan[-3:]:
            print(f"  {plat:5} {a} .. {b}  {src}")
        print("\nDRY-RUN: no se hizo ninguna request.")
        return 0

    agg = defaultdict(lambda: {"n": 0, "frp_max": 0.0, "frp_sum": 0.0,
                               "conf_sum": 0.0, "conf_n": 0, "d": 0, "nt": 0})
    done = skipped = 0
    for i, (plat, a, b, src) in enumerate(plan, 1):
        cfg = PLATFORMS[plat]
        url = f"{API}/{key}/{src}/{area}/{WINDOW_DAYS}/{a}"
        cache_path = os.path.join(args.cache, f"{src}_{a}_{b}.csv")
        try:
            txt = fetch(url, cache_path)
        except Exception as ex:
            print(f"[{i}/{len(plan)}] ERROR {plat} {a}: {ex}", file=sys.stderr)
            continue
        rows = parse_csv(txt, cfg["sensor"], plat)
        if not rows:
            skipped += 1
        for r in rows:
            if not r["date"]:
                continue
            cell = cell_of(r["lat"], r["lon"], args.grain)
            k = (cell[0], cell[1], r["date"], r["sensor"])
            x = agg[k]
            x["n"] += 1
            x["frp_max"] = max(x["frp_max"], r["frp"])
            x["frp_sum"] += r["frp"]
            if r["conf"] is not None:
                x["conf_sum"] += r["conf"]; x["conf_n"] += 1
            if r["dn"] == "D":
                x["d"] += 1
            else:
                x["nt"] += 1
        done += 1
        if i % 25 == 0 or i == len(plan):
            print(f"[{i}/{len(plan)}] {plat} {a}..{b} | celdas-dia acumuladas: {len(agg)} | vacias: {skipped}")

    if not agg:
        print("Sin datos: revisar MAP_KEY, bbox o rango de fechas.", file=sys.stderr)
        return 1

    os.makedirs(args.outdir, exist_ok=True)

    # ---- harmonized.csv
    hpath = os.path.join(args.outdir, "harmonized.csv")
    with open(hpath, "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["date", "cell_lat", "cell_lon", "sensor", "n_focos",
                     "frp_max_MW", "frp_sum_MW", "conf_mean", "n_day", "n_night"])
        for (clat, clon, dt, sensor), x in sorted(agg.items()):
            area_km2 = (1.0 if sensor == "MODIS" else 0.375 * 0.375) * max(x["n"], 1)
            wr.writerow([dt, clat, clon, sensor, x["n"], round(x["frp_max"], 3),
                         round(x["frp_sum"], 3),
                         round(x["conf_sum"] / x["conf_n"], 1) if x["conf_n"] else "",
                         x["d"], x["nt"]])

    # ---- calendar.json (con por_sensor: lo que pide la UI)
    cells = defaultdict(lambda: {"days": defaultdict(lambda: {"n": 0, "frp_max": 0.0, "sensores": [], "por_sensor": {}})})
    for (clat, clon, dt, sensor), x in agg.items():
        c = cells[(clat, clon)]["days"][dt]
        c["n"] += x["n"]
        c["frp_max"] = round(max(c["frp_max"], x["frp_max"]), 2)
        if sensor not in c["sensores"]:
            c["sensores"].append(sensor)
        c["por_sensor"][sensor] = {"n": x["n"], "frp_sum": round(x["frp_sum"], 2),
                                   "frp_max": round(x["frp_max"], 2)}
    alldays = sorted({k[2] for k in agg})
    cal = {"step_deg": args.grain, "days": alldays,
           "cells": [{"lat": la, "lon": lo,
                      "days": {dt: {k: v for k, v in val.items() if k != "por_sensor"} |
                               {"por_sensor": val["por_sensor"]}
                               for dt, val in sorted(c["days"].items())}}
                     for (la, lo), c in cells.items()]}
    if args.split_year:
        by_year = defaultdict(list)
        for c in cal["cells"]:
            for y in sorted({dt[:4] for dt in c["days"]}):
                by_year[y].append({"lat": c["lat"], "lon": c["lon"],
                                   "days": {dt: v for dt, v in c["days"].items() if dt.startswith(y)}})
        for y, cells_y in sorted(by_year.items()):
            py = os.path.join(args.outdir, f"calendar-{y}.json")
            with open(py, "w", encoding="utf-8") as f:
                json.dump({"step_deg": args.grain,
                           "days": [dt for dt in alldays if dt.startswith(y)],
                           "cells": cells_y}, f, ensure_ascii=False, separators=(",", ":"))
            print(f"-> {py}  ({len(cells_y)} celdas, {os.path.getsize(py)/1024/1024:.1f} MB)")

    cpath = os.path.join(args.outdir, "calendar.json")
    with open(cpath, "w", encoding="utf-8") as f:
        json.dump(cal, f, ensure_ascii=False)

    # ---- KPI global + por anio + por mes
    def totals(items):
        n_m = sum(x["n"] for (_, _, _, s), x in items if s == "MODIS")
        n_v = sum(x["n"] for (_, _, _, s), x in items if s == "VIIRS")
        f_m = sum(x["frp_sum"] for (_, _, _, s), x in items if s == "MODIS")
        f_v = sum(x["frp_sum"] for (_, _, _, s), x in items if s == "VIIRS")
        return {"modis": n_m, "viirs": n_v, "total": n_m + n_v,
                "ratio": round(n_v / n_m, 2) if n_m else None,
                "frp_modis_mw": round(f_m, 1), "frp_viirs_mw": round(f_v, 1),
                "frp_total_mw": round(f_m + f_v, 1),
                "frp_medio_modis": round(f_m / n_m, 2) if n_m else None,
                "frp_medio_viirs": round(f_v / n_v, 2) if n_v else None}

    cell_days = defaultdict(set)
    for (clat, clon, dt, sensor) in agg:
        cell_days[(clat, clon, dt)].add(sensor)
    ambos = sum(1 for v in cell_days.values() if len(v) > 1)
    tot_cd = len(cell_days)
    kpi = {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "aoi": {"bbox_W_S_E_N": args.bbox, "grain_deg": args.grain,
                "desde": alldays[0], "hasta": alldays[-1], "n_dias": len(alldays)},
        "global": totals(list(agg.items())),
        "coincidencia_celda_dia": {
            "ambos": ambos,
            "ambos_pct": round(100 * ambos / tot_cd, 1) if tot_cd else None,
            "total_celdas_dia": tot_cd,
            "nota": "Dependiente del AOI y de la ventana. No es un valor universal."},
        "por_anio": {y: totals([(k, agg[k]) for k in agg if k[2].startswith(y)])
                     for y in sorted({dt[:4] for dt in alldays})},
        "por_mes": {},
    }
    months = sorted({dt[:7] for dt in alldays})
    monthly = {}
    for m in months:
        t = totals([(k, agg[k]) for k in agg if k[2].startswith(m)])
        monthly[m] = t
        kpi["por_mes"][m] = t
    with open(os.path.join(args.outdir, "kpi.json"), "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    with open(os.path.join(args.outdir, "monthly.json"), "w", encoding="utf-8") as f:
        json.dump({"months": months, "totales": monthly}, f, ensure_ascii=False, indent=2)

    # ---- daily.json: agregado diario (lo que la UI debe consumir)
    daily = []
    for dt in alldays:
        nm = sum(x["n"] for (_, _, d2, s2), x in agg.items() if d2 == dt and s2 == "MODIS")
        nv = sum(x["n"] for (_, _, d2, s2), x in agg.items() if d2 == dt and s2 == "VIIRS")
        fm = sum(x["frp_sum"] for (_, _, d2, s2), x in agg.items() if d2 == dt and s2 == "MODIS")
        fv = sum(x["frp_sum"] for (_, _, d2, s2), x in agg.items() if d2 == dt and s2 == "VIIRS")
        daily.append({"d": dt, "n": nm + nv, "m": nm, "v": nv,
                      "fm": round(fm, 1), "fv": round(fv, 1)})
    dpath = os.path.join(args.outdir, "daily.json")
    with open(dpath, "w", encoding="utf-8") as f:
        json.dump(daily, f, ensure_ascii=False, separators=(",", ":"))
    print(f"-> {dpath}  ({len(daily)} dias, {os.path.getsize(dpath)/1024:.0f} KB)")

    g = kpi["global"]
    print(f"\nOK. {g['total']} detecciones en {len(alldays)} dias "
          f"({alldays[0]} -> {alldays[-1]})")
    print(f"  MODIS {g['modis']} | VIIRS {g['viirs']} | ratio {g['ratio']}x")
    print(f"  FRP total {g['frp_total_mw']} MW | medio M {g['frp_medio_modis']} / V {g['frp_medio_viirs']} MW")
    print(f"  Coincidencia celda-dia: {kpi['coincidencia_celda_dia']['ambos_pct']}%")
    print(f"  Anios: {', '.join(kpi['por_anio'].keys())}")
    print(f"  Salidas en {args.outdir}/  (harmonized.csv, calendar.json, kpi.json, monthly.json)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
