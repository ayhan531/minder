import urllib.request
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

servers = [
    ("Zenith", "http://localhost:5001"),
    ("Paribu", "http://localhost:5002"),
    ("Aura",   "http://localhost:5003")
]

print("=== 3 PROJE LOKAL CANLI SUNUCU KONTROLÜ ===")
for name, base in servers:
    try:
        with urllib.request.urlopen(f"{base}/healthz", timeout=6) as r:
            hz = r.status
        with urllib.request.urlopen(f"{base}/api/public/config", timeout=6) as r:
            cfg = json.loads(r.read().decode("utf-8"))
        brand = cfg.get("branding", {})
        print(f"[OK] {name} ({base}):")
        print(f"     - Healthz:  {hz} OK")
        print(f"     - Marka:    {brand.get('name')} {brand.get('descriptor')}")
        print(f"     - Renk:     {brand.get('primary')} / {brand.get('accent')}")
        print(f"     - Logo:     {brand.get('logo_url')}")
        print(f"     - Slogan:   {brand.get('tagline')}")
    except Exception as e:
        print(f"[ERROR] {name} ({base}): {e}")

print("===========================================")
