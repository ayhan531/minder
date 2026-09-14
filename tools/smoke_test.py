"""Isolated end-to-end smoke test for the Paribu 2 backend.

Runs the real server against a temporary SQLite database, so development data
is never changed. Uses only the Python standard library.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORT = 4191
BASE = f"http://127.0.0.1:{PORT}"


class Client:
    def __init__(self) -> None:
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))

    def call(self, path: str, method: str = "GET", payload: dict | None = None, timeout: float = 25):
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            BASE + path,
            data=body,
            method=method,
            headers={"Content-Type": "application/json", "User-Agent": "Paribu2-Smoke/1.0"},
        )
        try:
            with self.opener.open(request, timeout=timeout) as response:
                raw = response.read()
                content_type = response.headers.get("Content-Type", "")
                return json.loads(raw.decode("utf-8")) if "json" in content_type else raw
        except urllib.error.HTTPError as error:
            raw = error.read().decode("utf-8", "replace")
            raise AssertionError(f"{method} {path} -> {error.code}: {raw}") from error


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    (ROOT / "artifacts").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="paribu2-smoke-", dir=ROOT / "artifacts") as data_dir:
        env = os.environ.copy()
        env.update(
            {
                "PORT": str(PORT),
                "DATA_DIR": data_dir,
                "ADMIN_TC": "10000000000",
                "ADMIN_PASSWORD": "AdminPass!2026",
                "ADMIN_NAME": "Paribu Test Admin",
                "ADMIN_EMAIL": "admin@example.test",
                "SEED_TEST_USER": "1",
                "TEST_USER_TC": "20000000000",
                "TEST_USER_PASSWORD": "TestPass!2026",
                "TEST_USER_NAME": "Mert Yılmaz",
                "TEST_USER_EMAIL": "mert@example.test",
                "TEST_USER_CASH": "250000",
                "REQUIRE_LIVE_MARKET_FOR_TRADING": "0",
            }
        )
        process = subprocess.Popen(
            [sys.executable, str(ROOT / "tools" / "backend_server.py")],
            cwd=ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            health = Client()
            for _ in range(80):
                try:
                    if health.call("/api/health", timeout=.5).get("ok"):
                        break
                except Exception:
                    time.sleep(0.15)
            else:
                raise AssertionError("Test sunucusu başlamadı")
            print("PASS health", flush=True)

            public = Client()
            expect(public.call("/api/me").get("user") is None, "Anonim oturum hatalı")
            expect(bool(public.call("/api/public/config")), "Public config boş")
            print("PASS public", flush=True)

            user = Client()
            login = user.call("/api/login", "POST", {"tc": "20000000000", "password": "TestPass!2026"})
            expect(login["user"]["status"] == "approved", "Test kullanıcısı onaylı değil")
            market = user.call("/api/market")
            stocks = [item for item in market.get("quotes", []) if item.get("asset_class") == "stock"]
            expect(any(item["symbol"] == "THYAO" for item in stocks), "THYAO piyasa verisi yok")
            expect(bool(user.call("/api/profile/security")), "Güvenlik özeti alınamadı")
            print("PASS auth+market+security", flush=True)
            before = user.call("/api/portfolio")
            expect(before["account"]["cash_balance"] >= 250000, "Başlangıç bakiyesi hatalı")

            buy = user.call(
                "/api/orders",
                "POST",
                {
                    "symbol": "THYAO",
                    "side": "buy",
                    "order_type": "market",
                    "amount_mode": "quantity",
                    "quantity": 2,
                    "limit_price": 1,
                    "client_order_id": "smoke-buy-1",
                },
            )
            expect(buy["order"]["status"] == "approved", "Piyasa alış emri gerçekleşmedi")
            print("PASS buy", flush=True)
            duplicate = user.call(
                "/api/orders",
                "POST",
                {
                    "symbol": "THYAO",
                    "side": "buy",
                    "order_type": "market",
                    "amount_mode": "quantity",
                    "quantity": 2,
                    "client_order_id": "smoke-buy-1",
                },
            )
            expect(duplicate.get("duplicate") is True, "Emir idempotency koruması çalışmıyor")
            print("PASS idempotency", flush=True)
            sell = user.call(
                "/api/orders",
                "POST",
                {
                    "symbol": "THYAO",
                    "side": "sell",
                    "order_type": "market",
                    "amount_mode": "quantity",
                    "quantity": 1,
                    "client_order_id": "smoke-sell-1",
                },
            )
            expect(sell["order"]["status"] == "approved", "Piyasa satış emri gerçekleşmedi")
            print("PASS sell", flush=True)
            after = user.call("/api/portfolio")
            expect(any(item["symbol"] == "THYAO" and item["quantity"] == 1 for item in after["positions"]), "Pozisyon miktarı güncellenmedi")
            expect(bool(user.call("/api/orders")["orders"]), "Emir geçmişi boş")
            expect(len(user.call("/api/transactions/export")) > 20, "CSV hareket çıktısı boş")

            withdrawal = user.call(
                "/api/money-requests",
                "POST",
                {
                    "request_type": "withdraw",
                    "amount": 500,
                    "account_holder": "Mert Yılmaz",
                    "bank_name": "Test Bankası",
                    "iban": "TR330006100519786457841326",
                    "note": "İzole smoke testi",
                },
            )
            money_id = int(withdrawal["request"]["id"])
            expect(withdrawal["request"]["status"] == "pending", "Çekim talebi oluşmadı")
            expect(user.call(f"/api/money-requests/{money_id}/cancel", "POST", {}).get("ok"), "Çekim iptal edilemedi")
            print("PASS money", flush=True)

            admin = Client()
            admin_login = admin.call("/api/login", "POST", {"tc": "10000000000", "password": "AdminPass!2026"})
            expect(admin_login["user"]["role"] == "admin", "Admin oturumu açılamadı")
            expect(admin.call("/api/admin/step-up", "POST", {"password": "AdminPass!2026"})["ok"], "Admin step-up başarısız")
            admin_paths = [
                "/api/admin/summary", "/api/admin/users", "/api/admin/orders", "/api/admin/money",
                "/api/admin/reports", "/api/admin/contact-messages", "/api/admin/documents",
                "/api/admin/bank-accounts", "/api/admin/t2-settlements", "/api/admin/transactions",
                "/api/admin/positions", "/api/admin/user-balances", "/api/admin/system-settings",
                "/api/admin/stock-descriptions",
            ]
            for path in admin_paths:
                expect(admin.call(path) is not None, f"Admin endpoint boş: {path}")
            print("PASS admin", flush=True)

            print("PASS: auth, market, portfolio, buy, idempotency, sell, T+2, money, CSV, admin")
            return 0
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    raise SystemExit(main())
