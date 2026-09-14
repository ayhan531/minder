#!/usr/bin/env python
"""
Build Dual APKs:
1. Paribu Menkul Değerler (com.paribu.menkuldegerler) -> Paribu-Menkul-Degerler.apk
2. Zenith Portföy & Menkul Değerler (com.zenith.menkuldegerler) -> Zenith-Menkul-Degerler.apk
"""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANDROID = ROOT / "android"
DIST = ROOT / "dist"
JAVA_HOME = Path(r"C:\Program Files\Android\openjdk\jdk-21.0.8")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

if not JAVA_HOME.is_dir():
    # Fallback to Android Studio jbr if openjdk path differs
    as_jbr = Path(r"C:\Program Files\Android\Android Studio\jbr")
    if as_jbr.is_dir():
        JAVA_HOME = as_jbr

print(f"[*] Using JAVA_HOME: {JAVA_HOME}")
os.environ["JAVA_HOME"] = str(JAVA_HOME)
os.environ["PATH"] = f"{JAVA_HOME / 'bin'};{os.environ.get('PATH', '')}"


def set_capacitor_config(app_id: str, app_name: str, bg_color: str):
    config_path = ROOT / "capacitor.config.json"
    config = {
        "appId": app_id,
        "appName": app_name,
        "webDir": "dist",
        "server": {
            "androidScheme": "https",
            "cleartext": True
        },
        "android": {
            "allowMixedContent": True,
            "backgroundColor": bg_color
        }
    }
    config_path.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[*] capacitor.config.json set to: {app_id} - {app_name}")


def update_android_app_gradle(app_id: str):
    gradle_file = ANDROID / "app" / "build.gradle"
    content = gradle_file.read_text(encoding="utf-8")
    content = re.sub(r'namespace\s*=\s*["\'][^"\']+["\']', f'namespace = "{app_id}"', content)
    content = re.sub(r'applicationId\s+["\'][^"\']+["\']', f'applicationId "{app_id}"', content)
    gradle_file.write_text(content, encoding="utf-8")
    print(f"[*] android/app/build.gradle updated with applicationId {app_id}")


def update_strings_xml(app_id: str, app_name: str):
    strings_file = ANDROID / "app" / "src" / "main" / "res" / "values" / "strings.xml"
    content = f"""<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">{app_name}</string>
    <string name="title_activity_main">{app_name}</string>
    <string name="package_name">{app_id}</string>
    <string name="custom_url_scheme">{app_id}</string>
</resources>
"""
    strings_file.write_text(content, encoding="utf-8")
    print(f"[*] strings.xml updated for {app_name}")


def update_native_api_brand(brand_key: str):
    api_file = DIST / "native-api.js"
    content = api_file.read_text(encoding="utf-8")
    
    if brand_key == "zenith":
        name = "ZENITH"
        descriptor = "PORTFÖY & MENKUL DEĞERLER"
        symbol = "Z"
        logo_url = "/assets/zenith-logo.svg"
        tagline = "Kurumsal Yatırım ve Varlık Yönetimi"
        primary = "#0f52ba"
        accent = "#059669"
        danger = "#dc2626"
        font = "Inter"
        radius = "12"
        company_name = "Zenith Portföy ve Menkul Değerler A.Ş."
        email = "destek@zenithmenkul.com"
        phone = "0850 440 9000"
        license_text = "SPK Geniş Yetkili Aracı Kurum ve Portföy Yönetim Lisansı No: Z-088/2026"
        key_name = "zenith-native-store-v2"
    else:
        name = "PARİBU"
        descriptor = "MENKUL DEĞERLER"
        symbol = "P"
        logo_url = "/assets/paribu-logo.svg"
        tagline = "Yatırımın dijital hali"
        primary = "#0067e8"
        accent = "#00a96b"
        danger = "#ef3340"
        font = "Inter"
        radius = "18"
        company_name = "Paribu Menkul Değerler A.Ş."
        email = "destek@paribu.local"
        phone = "0850 303 6000"
        license_text = "SPK Geniş Yetkili Aracı Kurum Lisansı No: G-042/2026"
        key_name = "paribu2-native-store-v2"

    # Replace KEY
    content = re.sub(r'const KEY = "[^"]+";', f'const KEY = "{key_name}";', content)
    
    # Replace branding in seed
    brand_sub = f'''      branding: {{
        name: "{name}",
        descriptor: "{descriptor}",
        symbol: "{symbol}",
        logo_url: "{logo_url}",
        tagline: "{tagline}",
        primary: "{primary}",
        accent: "{accent}",
        danger: "{danger}",
        font: "{font}",
        radius: "{radius}",
        support_email: "{email}",
        support_phone: "{phone}",
      }},'''
    content = re.sub(r'branding:\s*\{[^}]+\},', brand_sub, content, flags=re.DOTALL)
    
    api_file.write_text(content, encoding="utf-8")
    print(f"[*] native-api.js branding defaulted to {name}")


def run_cmd(cmd, cwd=ROOT):
    print(f"[>] Running: {cmd} in {cwd}")
    subprocess.run(cmd, shell=True, check=True, cwd=cwd)


def build_apk(brand: str, app_id: str, app_name: str, bg_color: str, target_apk_name: str):
    print(f"\n=======================================================")
    print(f"[*] STARTING BUILD FOR: {app_name} ({app_id})")
    print(f"=======================================================")
    
    update_native_api_brand(brand)
    set_capacitor_config(app_id, app_name, bg_color)
    update_android_app_gradle(app_id)
    
    # Capacitor sync
    run_cmd("npx cap sync android")
    
    # Update strings.xml right after sync
    update_strings_xml(app_id, app_name)
    update_android_app_gradle(app_id)
    
    # Gradle assembleDebug
    gradlew = ANDROID / "gradlew.bat"
    run_cmd(f'"{gradlew}" assembleDebug', cwd=ANDROID)
    
    built_apk = ANDROID / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
    if not built_apk.is_file():
        raise RuntimeError(f"Built APK not found at {built_apk}")
    
    dest = ROOT / target_apk_name
    shutil.copy2(built_apk, dest)
    size_mb = dest.stat().st_size / (1024 * 1024)
    print(f"[OK] SUCCESS: Built {target_apk_name} ({size_mb:.2f} MB)")
    return dest


def main():
    # 1. Build Paribu Menkul Değerler
    paribu_apk = build_apk(
        brand="paribu",
        app_id="com.paribu.menkuldegerler",
        app_name="Paribu Menkul Değerler",
        bg_color="#061942",
        target_apk_name="Paribu-Menkul-Degerler.apk"
    )
    # Also update legacy Paribu2-debug.apk for backwards compatibility
    shutil.copy2(paribu_apk, ROOT / "Paribu2-debug.apk")

    # 2. Build Zenith Portföy Menkul Değerler
    zenith_apk = build_apk(
        brand="zenith",
        app_id="com.zenith.menkuldegerler",
        app_name="Zenith Menkul Değerler",
        bg_color="#0b192c",
        target_apk_name="Zenith-Menkul-Degerler.apk"
    )

    print("\n=======================================================")
    print("[SUCCESS] DUAL APK BUILD COMPLETE!")
    print(f"1. {paribu_apk.name} ({paribu_apk.stat().st_size / (1024*1024):.2f} MB)")
    print(f"2. {zenith_apk.name} ({zenith_apk.stat().st_size / (1024*1024):.2f} MB)")
    print("=======================================================")


if __name__ == "__main__":
    main()
