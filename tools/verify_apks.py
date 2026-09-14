import zipfile
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

for name in ["Paribu-Menkul-Degerler.apk", "Zenith-Menkul-Degerler.apk"]:
    apk = ROOT / name
    if not apk.is_file():
        print(f"[-] {name} NOT FOUND")
        continue
    size_mb = apk.stat().st_size / (1024 * 1024)
    with zipfile.ZipFile(apk, "r") as z:
        js = z.read("assets/public/native-api.js").decode("utf-8")
        key = re.findall(r'KEY = "([^"]+)"', js)
        brand = re.findall(r'name:\s*"([^"]+)"', js)
        primary = re.findall(r'primary:\s*"([^"]+)"', js)
        manifest_files = [f for f in z.namelist() if "AndroidManifest.xml" in f]
        print(f"[+] {name}: {size_mb:.2f} MB")
        print(f"    - Key: {key}")
        print(f"    - Brand Name: {brand}")
        print(f"    - Primary: {primary}")
        print(f"    - Manifest: {manifest_files}")
