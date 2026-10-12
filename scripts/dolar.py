"""Actualiza dolar.json con el dólar común (billete) del BROU desde la API pública de cambio-uruguay.com."""
import json, urllib.request, datetime, sys
URL = "https://api.cambio-uruguay.com/exchange/brou/USD"
req = urllib.request.Request(URL, headers={"accept": "application/json", "user-agent": "alucast-app"})
filas = json.load(urllib.request.urlopen(req, timeout=30))
comun = next((f for f in filas if f.get("code") == "USD"
              and "EBROU" not in str(f.get("type") or "").upper()
              and "ebrou" not in str(f.get("name") or "").lower()), None)
if not comun:
    sys.exit("No se encontró el dólar común del BROU")
compra, venta = float(comun["buy"]), float(comun["sell"])
if not (20 < compra < venta < 100):
    sys.exit(f"Valores fuera de rango: {compra} / {venta}")
uy = datetime.timezone(datetime.timedelta(hours=-3))
ahora = datetime.datetime.now(uy)
try:
    viejo = json.load(open("dolar.json"))
except Exception:
    viejo = {}
nuevo = {"compra": compra, "venta": venta, "media": round((compra + venta) / 2, 2),
         "fecha": ahora.date().isoformat(), "actualizado": ahora.isoformat(timespec="minutes"),
         "fuente": "Dólar BROU billete vía cambio-uruguay.com"}
# Solo se reescribe si cambió el valor o el día (evita commits de más)
if all(viejo.get(k) == nuevo[k] for k in ("compra", "venta", "fecha")):
    print("Sin cambios"); sys.exit(0)
json.dump(nuevo, open("dolar.json", "w"), ensure_ascii=False)
print(f"Dólar común BROU {nuevo['fecha']}: compra {compra}, venta {venta}, media {nuevo['media']}")
