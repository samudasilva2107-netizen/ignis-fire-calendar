import csv
import json
import os
from collections import defaultdict

def generate_daily(csv_path, out_path):
    print("Leyendo harmonized.csv...")
    day_m = defaultdict(int)
    day_v = defaultdict(int)
    day_fm = defaultdict(float)
    day_fv = defaultdict(float)
    cell_day_sensors = defaultdict(set)

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            dt = row["date"]
            clat = row["cell_lat"]
            clon = row["cell_lon"]
            sensor = row["sensor"]
            n = int(row["n_focos"])
            frp_sum = float(row["frp_sum_MW"])

            if sensor == "MODIS":
                day_m[dt] += n
                day_fm[dt] += frp_sum
            elif sensor == "VIIRS":
                day_v[dt] += n
                day_fv[dt] += frp_sum

            cell_day_sensors[(clat, clon, dt)].add(sensor)

    print("Agregando métricas de coincidencia por celda-día...")
    am_por_dia = defaultdict(int)
    sm_por_dia = defaultdict(int)
    sv_por_dia = defaultdict(int)
    cd_por_dia = defaultdict(int)

    for (clat, clon, dt), sens in cell_day_sensors.items():
        cd_por_dia[dt] += 1
        if len(sens) > 1:
            am_por_dia[dt] += 1
        elif sens == {"MODIS"}:
            sm_por_dia[dt] += 1
        elif sens == {"VIIRS"}:
            sv_por_dia[dt] += 1

    alldays = sorted(set(day_m.keys()) | set(day_v.keys()))
    print(f"Total días en la serie: {len(alldays)} ({alldays[0]} -> {alldays[-1]})")

    daily = []
    for dt in alldays:
        nm = day_m.get(dt, 0)
        nv = day_v.get(dt, 0)
        fm = day_fm.get(dt, 0.0)
        fv = day_fv.get(dt, 0.0)
        daily.append({
            "d": dt,
            "n": nm + nv,
            "m": nm,
            "v": nv,
            "fm": round(fm, 1),
            "fv": round(fv, 1),
            "am": am_por_dia.get(dt, 0),
            "sm": sm_por_dia.get(dt, 0),
            "sv": sv_por_dia.get(dt, 0),
            "cd": cd_por_dia.get(dt, 0),
        })

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(daily, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(out_path) / 1024
    print(f"Generado exitosamente {out_path}: {len(daily)} días, {size_kb:.1f} KB")

if __name__ == "__main__":
    generate_daily("salida_backfill/harmonized.csv", "salida_backfill/daily.json")
