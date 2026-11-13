#!/usr/bin/env python3
"""
IGNIS — Ingesta y armonización de focos de incendio MODIS vs VIIRS
Space Apps 2026 · Bahia Blanca (virtual)

Sin dependencias externas: solo biblioteca estandar de Python 3.8+.
Descarga los CSV publicos de FIRMS (no requiere MAP_KEY) y arma:
  - harmonized.csv   : una fila por celda-dia-sensor, variables unificadas
  - calendar.json    : matriz dia x celda lista para la vista de calendario
  - resumen.txt      : numeros comparativos reales (para el pitch)

Uso:
  python3 ingest_firms.py                     # Sudamerica, 7 dias
  python3 ingest_firms.py --region Global
  python3 ingest_firms.py --bbox -33.5 -57.5 -29.5 -56.0   # minlat minlon maxlat maxlon
  python3 ingest_firms.py --step 0.05 --days 7

Nota sobre comparabilidad (clave del desafio):
  - MODIS  : pixel ~1 km x 1 km  -> 1.00 km2
  - VIIRS  : pixel 375 m x 375 m -> 0.1406 km2
  Por eso se compara FRP_por_km2, no FRP crudo.
  Confianza: MODIS 0-100 numerica; VIIRS low/nominal/high -> 30/60/90.
"""

import argparse
import csv
import io
import json
import math
import os
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime

BASE = "https://firms.modaps.eosdis.nasa.gov/data/active_fire"
SOURCES = {
    "MODIS": {
        "url": "{base}/modis-c6.1/csv/MODIS_C6_1_{region}_{days}d.csv",
        "lat": "latitude", "lon": "longitude",
        "date": "acq_date", "time": "acq_time",
        "frp": "frp", "conf": "confidence", "dn": "daynight",
        "bt": "brightness", "sat": "satellite",
        "pixel_km2": 1.0,          # 1 km x 1 km
        "conf_mode": "numeric",    # 0..100
    },
    "VIIRS": {
        "url": "{base}/noaa-20-viirs-c2/csv/J1_VIIRS_C2_{region}_{days}d.csv",
        "lat": "latitude", "lon": "longitude",
        "date": "acq_date", "time": "acq_time",
        "frp": "frp", "conf": "confidence", "dn": "daynight",
        "bt": "bright_ti4", "sat": "satellite",
        "pixel_km2": 0.375 * 0.375,  # 0.140625 km2
        "conf_mode": "categorical",
    },
}
VIIRS_CONF = {"l": 30.0, "low": 30.0, "n": 60.0, "nominal": 60.0, "h": 90.0, "high": 90.0}


def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (IGNIS-hackathon)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    return raw.decode("utf-8", errors="replace")


def read_rows(text, spec):
    """Devuelve lista de dicts normalizados."""
    rdr = csv.DictReader(io.StringIO(text))
    if not rdr.fieldnames:
        return []
    out = []
    for row in rdr:
        try:
            lat = float(row[spec["lat"]]); lon = float(row[spec["lon"]])
        except (TypeError, ValueError, KeyError):
            continue
        try:
            frp = float(row.get(spec["frp"]) or 0.0)
        except ValueError:
            frp = 0.0
        try:
            bt = float(row.get(spec["bt"]) or 0.0)
        except ValueError:
            bt = 0.0

        conf_raw = (row.get(spec["conf"]) or "").strip()
        if spec["conf_mode"] == "numeric":
            try:
                conf = float(conf_raw)
            except ValueError:
                conf = None
        else:
            conf = VIIRS_CONF.get(conf_raw.lower())

        out.append({
            "lat": lat, "lon": lon,
            "date": (row.get(spec["date"]) or "").strip(),
            "time": (row.get(spec["time"]) or "").strip().zfill(4),
            "frp": frp, "bt": bt, "conf": conf,
            "daynight": (row.get(spec["dn"]) or "").strip().upper(),
            "sat": (row.get(spec["sat"]) or "").strip(),
        })
    return out


def cell_of(lat, lon, step):
    """Redondeo a rejilla comun. Devuelve (clave, lat_centro, lon_centro)."""
    clat = math.floor(lat / step) * step + step / 2.0
    clon = math.floor(lon / step) * step + step / 2.0
    return (round(clat, 4), round(clon, 4))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", default="South_America")
    ap.add_argument("--days", type=int, default=7, choices=[1, 7])
    ap.add_argument("--step", type=float, default=0.05, help="tamano de celda en grados")
    ap.add_argument("--bbox", nargs=4, type=float, metavar=("MINLAT", "MINLON", "MAXLAT", "MAXLON"))
    ap.add_argument("--outdir", default="salida")
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    step = args.step

    print(f"Rejilla: {step} deg (~{step*111.32:.1f} km N-S)")
    print(f"Region: {args.region} | dias: {args.days}\n")

    # ---- 1. Descarga
    data = {}
    for name, spec in SOURCES.items():
        url = spec["url"].format(base=BASE, region=args.region, days=args.days)
        try:
            txt = fetch(url)
            rows = read_rows(txt, spec)
            data[name] = rows
            print(f"[OK]  {name:<6} {len(rows):>7} focos  <- {url.rsplit('/',1)[-1]}")
        except Exception as e:
            data[name] = []
            print(f"[ERR] {name:<6} {type(e).__name__}: {e}")

    if args.bbox:
        mnlat, mnlon, mxlat, mxlon = args.bbox
        for name in data:
            before = len(data[name])
            data[name] = [r for r in data[name]
                          if mnlat <= r["lat"] <= mxlat and mnlon <= r["lon"] <= mxlon]
            print(f"      {name}: bbox deja {len(data[name])} de {before}")

    # ---- 2. Agregacion por celda-dia-sensor
    agg = defaultdict(lambda: {"n": 0, "frp_max": 0.0, "frp_sum": 0.0,
                               "conf_sum": 0.0, "conf_n": 0, "d": 0, "n_night": 0})
    cells_seen = defaultdict(set)   # (cell, date) -> {sensores}
    dates = set()

    for name, rows in data.items():
        spec = SOURCES[name]
        for r in rows:
            if not r["date"]:
                continue
            dates.add(r["date"])
            cell = cell_of(r["lat"], r["lon"], step)
            key = (cell[0], cell[1], r["date"], name)
            a = agg[key]
            a["n"] += 1
            a["frp_max"] = max(a["frp_max"], r["frp"])
            a["frp_sum"] += r["frp"]
            if r["conf"] is not None:
                a["conf_sum"] += r["conf"]; a["conf_n"] += 1
            if r["daynight"] == "D":
                a["d"] += 1
            else:
                a["n_night"] += 1
            cells_seen[(cell[0], cell[1], r["date"])].add(name)

    # ---- 3. harmonized.csv
    hpath = os.path.join(args.outdir, "harmonized.csv")
    with open(hpath, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["date", "cell_lat", "cell_lon", "sensor", "n_focos",
                    "frp_max_MW", "frp_sum_MW", "frp_density_MW_km2",
                    "conf_mean", "n_day", "n_night", "both_sensors"])
        for (clat, clon, date, sensor), a in sorted(agg.items(), key=lambda kv: (kv[0][2], kv[0][0], kv[0][1], kv[0][3])):
            area = SOURCES[sensor]["pixel_km2"] * max(a["n"], 1)
            w.writerow([
                date, clat, clon, sensor, a["n"],
                round(a["frp_max"], 3), round(a["frp_sum"], 3),
                round(a["frp_sum"] / area, 3),
                round(a["conf_sum"] / a["conf_n"], 1) if a["conf_n"] else "",
                a["d"], a["n_night"],
                1 if len(cells_seen[(clat, clon, date)]) > 1 else 0,
            ])
    print(f"\n-> {hpath}  ({len(agg)} filas celda-dia-sensor)")

    # ---- 4. calendar.json  (dia x celda)
    days = sorted(dates)
    cell_map = defaultdict(lambda: {"lat": None, "lon": None, "days": {}})
    for (clat, clon, date, sensor), a in agg.items():
        c = cell_map[(clat, clon)]
        c["lat"], c["lon"] = clat, clon
        d = c["days"].setdefault(date, {"n": 0, "frp_max": 0.0, "sensores": []})
        d["n"] += a["n"]
        d["frp_max"] = round(max(d["frp_max"], a["frp_max"]), 2)
        if sensor not in d["sensores"]:
            d["sensores"].append(sensor)
    cpath = os.path.join(args.outdir, "calendar.json")
    with open(cpath, "w", encoding="utf-8") as f:
        json.dump({"step_deg": step, "days": days, "cells": [
            {"lat": c["lat"], "lon": c["lon"], "days": c["days"]}
            for c in cell_map.values()
        ]}, f, ensure_ascii=False)
    print(f"-> {cpath}  ({len(cell_map)} celdas, {len(days)} dias)")

    # ---- 5. resumen.txt  (numeros para el pitch)
    def total(name):
        return sum(a["n"] for (cl, cn, dt, s), a in agg.items() if s == name)

    def cells_of(name):
        return len({(cl, cn) for (cl, cn, dt, s) in agg if s == name})

    n_mod, n_vi = total("MODIS"), total("VIIRS")
    both = sum(1 for v in cells_seen.values() if len(v) > 1)
    only_mod = sum(1 for v in cells_seen.values() if v == {"MODIS"})
    only_vi = sum(1 for v in cells_seen.values() if v == {"VIIRS"})
    tot = max(both + only_mod + only_vi, 1)

    lines = [
        "IGNIS - resumen de armonizacion",
        f"Generado: {datetime.now().isoformat(timespec='seconds')}",
        f"Region: {args.region} | dias: {args.days} | rejilla: {step} deg",
        "",
        f"Focos MODIS : {n_mod}",
        f"Focos VIIRS : {n_vi}",
        f"Ratio VIIRS/MODIS: {n_vi/max(n_mod,1):.2f}x",
        "",
        f"Celdas con datos MODIS: {cells_of('MODIS')}",
        f"Celdas con datos VIIRS: {cells_of('VIIRS')}",
        f"Celdas-dia detectadas por AMBOS sensores: {both} ({100*both/tot:.1f}%)",
        f"Celdas-dia solo MODIS: {only_mod} ({100*only_mod/tot:.1f}%)",
        f"Celdas-dia solo VIIRS: {only_vi} ({100*only_vi/tot:.1f}%)",
        "",
        "Lectura: la discrepancia entre 'solo MODIS' y 'solo VIIRS' es exactamente",
        "el problema que el desafio pide resolver. No es ruido: es resolucion espacial,",
        "hora de sobrevuelo y escala de confianza distintas.",
    ]
    rpath = os.path.join(args.outdir, "resumen.txt")
    with open(rpath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"-> {rpath}\n")
    print("\n".join(lines))


if __name__ == "__main__":
    sys.exit(main())
