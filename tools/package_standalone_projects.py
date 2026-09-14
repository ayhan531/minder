#!/usr/bin/env python
"""
Standalone Project Generator & Packager
Generates 3 self-contained, independent full-stack projects:
1. Zenith (Portföy & Menkul Değerler) - Port 5001
2. Paribu (Menkul Değerler) - Port 5002
3. Aura (Özel Portföy & Yatırım) - Port 5003

Each project contains:
- Independent Backend (Python, port-configured)
- Independent Frontend (customized dist/ with logo, colors, title)
- Independent SQLite DB (customized brand settings, company unvan, accounts)
- Pre-built Android APK in root
- Full Capacitor Android Project (unique applicationId, appName, strings.xml)
- 1-Click Render.yaml configuration
- Standalone .zip archive
"""

import json
import os
import re
import shutil
import sqlite3
import sys
import zipfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
DESKTOP = ROOT.parent
EXPORTS = ROOT / "exports"
EXPORTS.mkdir(exist_ok=True)

PROJECTS_DIR = ROOT / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)

BRANDS = {
    "zenith": {
        "slug": "zenith",
        "name": "ZENITH",
        "descriptor": "PORTFÖY & MENKUL DEĞERLER",
        "tagline": "Kurumsal Yatırım ve Varlık Yönetimi",
        "symbol": "Z",
        "logo_url": "/assets/zenith-logo.svg",
        "primary": "#0f52ba",
        "accent": "#059669",
        "danger": "#dc2626",
        "font": "Inter",
        "radius": "12",
        "port": 5001,
        "app_id": "com.zenith.menkuldegerler",
        "app_name": "Zenith Menkul Değerler",
        "apk_name": "Zenith-Menkul-Degerler.apk",
        "official_company_name": "Zenith Portföy ve Menkul Değerler A.Ş.",
        "official_registry_number": "892104",
        "official_mersis_number": "099808420100001",
        "official_address": "İstanbul Uluslararası Finans Merkezi, Z-Kule No:14 Ataşehir / İstanbul",
        "official_phone": "0850 440 9000",
        "official_email": "destek@zenithmenkul.com",
        "official_license_text": "Sermaye Piyasası Kurulu (SPK) Geniş Yetkili Aracı Kurum ve Portföy Yönetim Lisansı Belge No: Z-088/2026",
        "key_name": "zenith-native-store-v2",
        "render_service_name": "zenith-menkul-degerler"
    },
    "paribu": {
        "slug": "paribu",
        "name": "PARİBU",
        "descriptor": "MENKUL DEĞERLER",
        "tagline": "Yatırımın dijital hali",
        "symbol": "P",
        "logo_url": "/assets/paribu-logo.svg",
        "primary": "#0067e8",
        "accent": "#00a96b",
        "danger": "#ef3340",
        "font": "Inter",
        "radius": "18",
        "port": 5002,
        "app_id": "com.paribu.menkuldegerler",
        "app_name": "Paribu Menkul Değerler",
        "apk_name": "Paribu-Menkul-Degerler.apk",
        "official_company_name": "Paribu Menkul Değerler A.Ş.",
        "official_registry_number": "849204",
        "official_mersis_number": "072108920400001",
        "official_address": "Barbaros Mah. Mor Sümbül Sok. No:1 Ataşehir / İstanbul",
        "official_phone": "0850 303 6000",
        "official_email": "destek@paribumenkuldeger.com",
        "official_license_text": "SPK Geniş Yetkili Aracı Kurum Lisansı No: G-042/2026",
        "key_name": "paribu2-native-store-v2",
        "render_service_name": "paribu-menkul-degerler"
    },
    "aura": {
        "slug": "aura",
        "name": "AURA",
        "descriptor": "ÖZEL PORTFÖY & YATIRIM",
        "tagline": "Prestijli Varlık ve Fon Yönetimi",
        "symbol": "A",
        "logo_url": "/assets/aura-logo.svg",
        "primary": "#1e293b",
        "accent": "#d97706",
        "danger": "#b91c1c",
        "font": "Manrope",
        "radius": "10",
        "port": 5003,
        "app_id": "com.aura.varlikyonetimi",
        "app_name": "Aura Özel Yatırım",
        "apk_name": "Aura-Ozel-Yatirim.apk",
        "official_company_name": "Aura Portföy Yönetimi ve Yatırım A.Ş.",
        "official_registry_number": "994012",
        "official_mersis_number": "012099401200001",
        "official_address": "Zorlu Center, R2 Blok Kat:22 Beşiktaş / İstanbul",
        "official_phone": "0850 888 7000",
        "official_email": "destek@auravarlik.com",
        "official_license_text": "Sermaye Piyasası Kurulu (SPK) Portföy Yönetim Şirketi ve Yatırım Danışmanlığı Belge No: A-019/2026",
        "key_name": "aura-native-store-v2",
        "render_service_name": "aura-ozel-yatirim"
    }
}


def build_standalone_project(brand_key: str):
    info = BRANDS[brand_key]
    slug = info["slug"]
    print(f"\n=======================================================")
    print(f"[*] BUILDING STANDALONE PROJECT: {info['name']} (Port {info['port']})")
    print(f"=======================================================")

    # Target directory in workspace and desktop
    target_dir = PROJECTS_DIR / slug
    if target_dir.exists():
        shutil.rmtree(target_dir, ignore_errors=True)
    target_dir.mkdir(parents=True, exist_ok=True)

    # 1. Copy dist
    shutil.copytree(ROOT / "dist", target_dir / "dist", dirs_exist_ok=True)

    # Customize dist/index.html
    index_html = target_dir / "dist" / "index.html"
    if index_html.is_file():
        text = index_html.read_text(encoding="utf-8")
        text = re.sub(r"<title>[^<]+</title>", f"<title>{info['name']} {info['descriptor']}</title>", text)
        text = re.sub(r'<meta name="theme-color" content="[^"]+"', f'<meta name="theme-color" content="{info["primary"]}"', text)
        index_html.write_text(text, encoding="utf-8")

    # Customize dist/native-api.js
    native_js = target_dir / "dist" / "native-api.js"
    if native_js.is_file():
        text = native_js.read_text(encoding="utf-8")
        text = re.sub(r'const KEY = "[^"]+";', f'const KEY = "{info["key_name"]}";', text)
        brand_sub = f'''      branding: {{
        name: "{info["name"]}",
        descriptor: "{info["descriptor"]}",
        symbol: "{info["symbol"]}",
        logo_url: "{info["logo_url"]}",
        tagline: "{info["tagline"]}",
        primary: "{info["primary"]}",
        accent: "{info["accent"]}",
        danger: "{info["danger"]}",
        font: "{info["font"]}",
        radius: "{info["radius"]}",
        support_email: "{info["official_email"]}",
        support_phone: "{info["official_phone"]}",
      }},'''
        text = re.sub(r'branding:\s*\{[^}]+\},', brand_sub, text, flags=re.DOTALL)
        native_js.write_text(text, encoding="utf-8")

    # 2. Copy tools (backend_server.py and test tools)
    (target_dir / "tools").mkdir(exist_ok=True)
    for tool_file in (ROOT / "tools").glob("*.py"):
        shutil.copy2(tool_file, target_dir / "tools" / tool_file.name)
    for tool_file in (ROOT / "tools").glob("*.js"):
        shutil.copy2(tool_file, target_dir / "tools" / tool_file.name)

    # Customize default PORT and brand in backend_server.py
    backend_py = target_dir / "tools" / "backend_server.py"
    if backend_py.is_file():
        code = backend_py.read_text(encoding="utf-8")
        code = re.sub(r'PORT = int\(os\.environ\.get\("PORT", "4173"\)\)', f'PORT = int(os.environ.get("PORT", "{info["port"]}"))', code)
        backend_py.write_text(code, encoding="utf-8")

    # 3. Copy data & pre-seed SQLite database
    (target_dir / "data").mkdir(exist_ok=True)
    if (ROOT / "data" / "uploads").exists():
        shutil.copytree(ROOT / "data" / "uploads", target_dir / "data" / "uploads", dirs_exist_ok=True)
    if (ROOT / "data" / "company-logos").exists():
        shutil.copytree(ROOT / "data" / "company-logos", target_dir / "data" / "company-logos", dirs_exist_ok=True)
    
    # Copy fresh db
    db_source = ROOT / "data" / "guney.db"
    db_target = target_dir / "data" / "guney.db"
    shutil.copy2(db_source, db_target)

    # Seed DB with brand details
    conn = sqlite3.connect(db_target)
    settings_updates = [
        ("brand_name", info["name"]),
        ("brand_descriptor", info["descriptor"]),
        ("brand_symbol", info["symbol"]),
        ("brand_logo_url", info["logo_url"]),
        ("brand_tagline", info["tagline"]),
        ("ui_primary_color", info["primary"]),
        ("ui_accent_color", info["accent"]),
        ("ui_danger_color", info["danger"]),
        ("ui_font_family", info["font"]),
        ("ui_radius", str(info["radius"])),
        ("official_company_name", info["official_company_name"]),
        ("official_registry_number", info["official_registry_number"]),
        ("official_mersis_number", info["official_mersis_number"]),
        ("official_address", info["official_address"]),
        ("official_phone", info["official_phone"]),
        ("official_email", info["official_email"]),
        ("official_license_text", info["official_license_text"]),
        ("content_support_email", info["official_email"]),
        ("content_support_phone", info["official_phone"]),
    ]
    import time
    for k, v in settings_updates:
        conn.execute("INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)", (k, str(v), int(time.time())))
    
    # Update system bank account holder name
    conn.execute("UPDATE system_bank_accounts SET account_holder=?", (info["official_company_name"],))
    conn.commit()
    conn.close()

    # Bootstrap admin credentials
    (target_dir / "data" / "bootstrap_admin.txt").write_text("TC=10000000000\nPASSWORD=AdminPass!2026\n", encoding="utf-8")

    # 4. Copy and configure Android / Capacitor
    shutil.copy2(ROOT / "package.json", target_dir / "package.json")
    
    # Capacitor config
    cap_conf = {
        "appId": info["app_id"],
        "appName": info["app_name"],
        "webDir": "dist",
        "server": {
            "androidScheme": "https",
            "cleartext": True
        },
        "android": {
            "allowMixedContent": True,
            "backgroundColor": "#0b192c" if brand_key != "paribu" else "#061942"
        }
    }
    (target_dir / "capacitor.config.json").write_text(json.dumps(cap_conf, indent=2, ensure_ascii=False), encoding="utf-8")

    # Copy Android source directory (excluding build caches)
    def ignore_android_build(path, names):
        return {"build", ".gradle"}
    
    shutil.copytree(ROOT / "android", target_dir / "android", ignore=ignore_android_build, dirs_exist_ok=True)

    # Update android/app/build.gradle
    gradle_file = target_dir / "android" / "app" / "build.gradle"
    if gradle_file.is_file():
        txt = gradle_file.read_text(encoding="utf-8")
        txt = re.sub(r'namespace\s*=\s*["\'][^"\']+["\']', f'namespace = "{info["app_id"]}"', txt)
        txt = re.sub(r'applicationId\s+["\'][^"\']+["\']', f'applicationId "{info["app_id"]}"', txt)
        gradle_file.write_text(txt, encoding="utf-8")

    # Update strings.xml
    strings_file = target_dir / "android" / "app" / "src" / "main" / "res" / "values" / "strings.xml"
    if strings_file.is_file():
        s_txt = f"""<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">{info['app_name']}</string>
    <string name="title_activity_main">{info['app_name']}</string>
    <string name="package_name">{info['app_id']}</string>
    <string name="custom_url_scheme">{info['app_id']}</string>
</resources>
"""
        strings_file.write_text(s_txt, encoding="utf-8")

    # Update Java package and MainActivity.java in standalone android project
    java_root = target_dir / "android" / "app" / "src" / "main" / "java"
    com_dir = java_root / "com"
    if com_dir.exists():
        shutil.rmtree(com_dir, ignore_errors=True)
    parts = info["app_id"].split(".")
    app_java_dir = java_root
    for p in parts:
        app_java_dir = app_java_dir / p
    app_java_dir.mkdir(parents=True, exist_ok=True)
    (app_java_dir / "MainActivity.java").write_text(f"""package {info["app_id"]};

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {{}}
""", encoding="utf-8")

    # 5. Copy pre-built APK into project root
    apk_source = ROOT / info["apk_name"]
    if apk_source.is_file():
        shutil.copy2(apk_source, target_dir / info["apk_name"])
        shutil.copy2(apk_source, target_dir / "app-release.apk")
        # Also mirror to desktop directly
        shutil.copy2(apk_source, DESKTOP / info["apk_name"])

    # 6. Render.yaml
    render_content = f"""services:
  - type: web
    runtime: python
    name: {info['render_service_name']}
    buildCommand: python --version && python -m py_compile tools/backend_server.py
    startCommand: python tools/backend_server.py
    healthCheckPath: /healthz
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.15
      - key: DATA_DIR
        value: /var/data
      - key: PORT
        value: "{info['port']}"
      - key: PUBLIC_BASE_URL
        sync: false
      - key: ADMIN_TC
        sync: false
      - key: ADMIN_PASSWORD
        sync: false
      - key: REQUIRE_LIVE_MARKET_FOR_TRADING
        value: "1"
      - key: ALLOW_PRICE_SIMULATION
        value: "0"
      - key: OFFICIAL_COMPANY_NAME
        value: "{info['official_company_name']}"
      - key: OFFICIAL_EMAIL
        value: "{info['official_email']}"
      - key: OFFICIAL_PHONE
        value: "{info['official_phone']}"
    disk:
      name: {info['render_service_name']}-data
      mountPath: /var/data
      sizeGB: 1
"""
    (target_dir / "render.yaml").write_text(render_content, encoding="utf-8")

    # 7. README.md & RENDER-DEPLOY.md
    readme_content = f"""# {info['name']} - {info['descriptor']}

Tam Bağımsız Yatırım, Borsa ve Portföy Yönetim Platformu.

## Hızlı Başlangıç (Lokal)
1. Python 3.10+ kurulu olmalıdır.
2. Sunucuyu başlatın:
   ```bash
   python tools/backend_server.py
   ```
3. Tarayıcınızda açın:
   `http://localhost:{info['port']}/esube`

### Varsayılan Giriş Bilgileri:
- **Yönetici:** T.C. `10000000000` / Şifre: `AdminPass!2026`
- **Müşteri:** T.C. `20000000000` / Şifre: `TestPass!2026`

## Android APK
Hazır derlenmiş Android uygulaması kök dizindedir:
`{info['apk_name']}` (Paket Adı: `{info['app_id']}`)

## Render 1-Click Dağıtım
Proje kök dizininde hazır `render.yaml` bulunmaktadır.
1. Depoyu GitHub'a aktarın.
2. Render.com > Blueprint seçin ve repoyu bağlayın.
3. Otomatik olarak canlıya alınır.
"""
    (target_dir / "README.md").write_text(readme_content, encoding="utf-8")

    # Startup batch script
    (target_dir / "run_local.bat").write_text(f"@echo off\necho {info['name']} Sunucusu Baslatiliyor...\nset PORT={info['port']}\npython tools\\backend_server.py\npause\n", encoding="utf-8")

    # 8. Mirror full project to Desktop folder
    desktop_project_dir = DESKTOP / slug
    if desktop_project_dir.exists():
        shutil.rmtree(desktop_project_dir, ignore_errors=True)
    shutil.copytree(target_dir, desktop_project_dir, dirs_exist_ok=True)
    print(f"[+] Mirrored project to: {desktop_project_dir}")

    # 9. Create Standalone .zip Archive
    zip_export_path = EXPORTS / f"{slug}.zip"
    desktop_zip_path = DESKTOP / f"{slug}.zip"

    with zipfile.ZipFile(zip_export_path, "w", compression=zipfile.ZIP_DEFLATED) as arc:
        for f in target_dir.rglob("*"):
            if f.is_file():
                rel = f.relative_to(target_dir)
                arc.write(f, Path(slug) / rel)

    shutil.copy2(zip_export_path, desktop_zip_path)
    zip_size_mb = desktop_zip_path.stat().st_size / (1024 * 1024)
    print(f"[✔] SUCCESS: Created {slug}.zip ({zip_size_mb:.2f} MB)")
    print(f"    - Workspace: {target_dir}")
    print(f"    - Desktop:   {desktop_project_dir}")
    print(f"    - Zip:       {desktop_zip_path}")
    print(f"    - APK:       {target_dir / info['apk_name']}")
    return target_dir, desktop_zip_path, target_dir / info['apk_name']


def main():
    print("[*] Starting batch standalone project packaging...")
    results = {}
    for key in ["zenith", "paribu", "aura"]:
        pdir, zpath, apath = build_standalone_project(key)
        results[key] = {"dir": pdir, "zip": zpath, "apk": apath}

    print("\n=======================================================")
    print("[🎉] ALL 3 STANDALONE PROJECTS PACKAGED SUCCESSFULLY!")
    print("=======================================================")
    for k, v in results.items():
        print(f"[{k.upper()}]")
        print(f"  - Klasör:  {v['dir']}")
        print(f"  - Zip:     {v['zip']}")
        print(f"  - APK:     {v['apk']}")
    print("=======================================================")


if __name__ == "__main__":
    main()
