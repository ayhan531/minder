#!/usr/bin/env python
"""
Build 3 Independent APKs:
1. Paribu Menkul Değerler (com.paribu.menkuldegerler) -> Paribu-Menkul-Degerler.apk
2. Zenith Portföy & Menkul Değerler (com.zenith.menkuldegerler) -> Zenith-Menkul-Degerler.apk
3. Aura Özel Portföy & Yatırım (com.aura.varlikyonetimi) -> Aura-Ozel-Yatirim.apk
"""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
ANDROID = ROOT / "android"
DIST = ROOT / "dist"
JAVA_HOME = Path(r"C:\Program Files\Android\openjdk\jdk-21.0.8")

if not JAVA_HOME.is_dir():
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


def update_android_java_package(app_id: str):
    java_root = ANDROID / "app" / "src" / "main" / "java"
    com_dir = java_root / "com"
    if com_dir.exists():
        shutil.rmtree(com_dir, ignore_errors=True)
    
    parts = app_id.split(".")
    target_dir = java_root
    for p in parts:
        target_dir = target_dir / p
    target_dir.mkdir(parents=True, exist_ok=True)

    main_activity = target_dir / "MainActivity.java"
    main_activity.write_text(f"""package {app_id};

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {{}}
""", encoding="utf-8")
    print(f"[*] MainActivity.java generated for package {app_id} at {main_activity}")


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
        email = "destek@zenithmenkul.com"
        phone = "0850 440 9000"
        key_name = "zenith-native-store-v2"
    elif brand_key == "aura":
        name = "AURA"
        descriptor = "ÖZEL PORTFÖY & YATIRIM"
        symbol = "A"
        logo_url = "/assets/aura-logo.svg"
        tagline = "Prestijli Varlık ve Fon Yönetimi"
        primary = "#1e293b"
        accent = "#d97706"
        danger = "#b91c1c"
        font = "Manrope"
        radius = "10"
        email = "destek@auravarlik.com"
        phone = "0850 888 7000"
        key_name = "aura-native-store-v2"
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
        email = "destek@paribumenkuldeger.com"
        phone = "0850 303 6000"
        key_name = "paribu2-native-store-v2"

    content = re.sub(r'const KEY = "[^"]+";', f'const KEY = "{key_name}";', content)
    
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
    
    # Update strings.xml, app gradle, and Java package right after sync
    update_strings_xml(app_id, app_name)
    update_android_app_gradle(app_id)
    update_android_java_package(app_id)
    
    # Delete stale build outputs
    app_build_dir = ANDROID / "app" / "build"
    if app_build_dir.exists():
        shutil.rmtree(app_build_dir, ignore_errors=True)
    
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
    # If a specific brand is passed via argument, build only that one
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    if target in ["paribu", "all"]:
        paribu_apk = build_apk(
            brand="paribu",
            app_id="com.paribu.menkuldegerler",
            app_name="Paribu Menkul Değerler",
            bg_color="#061942",
            target_apk_name="Paribu-Menkul-Degerler.apk"
        )
        shutil.copy2(paribu_apk, ROOT / "Paribu2-debug.apk")

    if target in ["zenith", "all"]:
        zenith_apk = build_apk(
            brand="zenith",
            app_id="com.zenith.menkuldegerler",
            app_name="Zenith Menkul Değerler",
            bg_color="#0b192c",
            target_apk_name="Zenith-Menkul-Degerler.apk"
        )

    if target in ["aura", "all"]:
        aura_apk = build_apk(
            brand="aura",
            app_id="com.aura.varlikyonetimi",
            app_name="Aura Özel Yatırım",
            bg_color="#0f172a",
            target_apk_name="Aura-Ozel-Yatirim.apk"
        )

    print("\n=======================================================")
    print("[SUCCESS] APK BUILDS COMPLETED!")
    for apk_file in [ROOT / "Paribu-Menkul-Degerler.apk", ROOT / "Zenith-Menkul-Degerler.apk", ROOT / "Aura-Ozel-Yatirim.apk"]:
        if apk_file.is_file():
            print(f"- {apk_file.name} ({apk_file.stat().st_size / (1024*1024):.2f} MB)")
    print("=======================================================")


if __name__ == "__main__":
    main()
