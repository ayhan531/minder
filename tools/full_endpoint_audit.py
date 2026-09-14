import http.cookiejar
import json
import mimetypes
import os
import random
import re
import sqlite3
import time
import urllib.error
import urllib.request
from pathlib import Path


BASE = os.getenv("AUDIT_BASE", "http://localhost:4173")
ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "6623161b5735463242da489b96c9120e.jpg"
OUT = ROOT / "audit-current" / "full-endpoint-audit.json"
AUDIT_DB = Path(os.getenv("AUDIT_DB_PATH", ROOT / "data" / "guney.db"))


def bootstrap_admin() -> tuple[str, str]:
    env_tc = os.getenv("ADMIN_TC")
    env_password = os.getenv("ADMIN_PASSWORD")
    if env_tc and env_password:
        return env_tc, env_password

    text = (ROOT / "data" / "bootstrap_admin.txt").read_text(encoding="utf-8")
    return (
        re.search(r"^TC=(.+)$", text, re.MULTILINE).group(1).strip(),
        re.search(r"^PASSWORD=(.+)$", text, re.MULTILINE).group(1).strip(),
    )


def client() -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request(opener, method: str, path: str, data=None, headers=None, expect: int | None = None):
    body = None
    req_headers = headers or {}
    if isinstance(data, dict):
        body = json.dumps(data).encode("utf-8")
        req_headers = {"Content-Type": "application/json", **req_headers}
    elif data is not None:
        body = data
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=req_headers)
    try:
        with opener.open(req, timeout=30) as response:
            text = response.read().decode("utf-8")
            return response.status, json.loads(text) if text else {}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8")
        if expect and exc.code == expect:
            return exc.code, json.loads(text) if text else {}
        raise RuntimeError(f"{method} {path} -> {exc.code} {text}") from exc


def multipart(fields: dict, files: dict[str, Path]):
    boundary = f"----codexBoundary{random.getrandbits(64):016x}"
    parts = []
    for key, value in fields.items():
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
        )
    for key, path in files.items():
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{path.name}"\r\nContent-Type: {ctype}\r\n\r\n'.encode()
            + path.read_bytes()
            + b"\r\n"
        )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={boundary}"}


def test_tc() -> str:
    digits = [random.randint(1, 9)] + [random.randint(0, 9) for _ in range(8)]
    digits.append(((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10)
    digits.append(sum(digits[:10]) % 10)
    return "".join(map(str, digits))


def register_user(opener, label: str):
    suffix = random.randint(100000, 999999)
    tc = test_tc()
    password = f"{label}Pass!2026"
    fields = {
        "full_name": f"Endpoint Audit {label} {suffix}",
        "tc": tc,
        "phone": "05550000000",
        "email": f"endpoint-{label.lower()}-{suffix}@local.test",
        "city": "Istanbul",
        "district": "Kadikoy",
        "birth_date": "1990-01-01",
        "address": "Endpoint audit address",
        "password": password,
        "risk_experience": "2",
        "risk_horizon": "2",
        "risk_loss": "1",
        "risk_income": "2",
        "trade_frequency": "2",
        "knowledge_level": "2",
        "education": "Lisans",
        "occupation": "Kalite uzmanı",
        "traded_products": "Hisse senedi / Fon",
        "investment_goal": "Uzun vadeli büyüme",
        "accept_kvkk": "1",
        "accept_distance_contract": "1",
        "accept_risk_disclosure": "1",
    }
    body, headers = multipart(fields, {})
    status, _ = request(opener, "POST", "/api/register", body, headers)
    return {"tc": tc, "password": password, "fields": fields, "register_status": status}


def live_bundle_map() -> dict:
    path = ROOT / "audit-live" / "guney-esube-app.js"
    text = path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""
    checks = [
        "/stocks",
        "/portfolio",
        "/transactions",
        "/profile",
        "/admin/users",
        "/admin/portfolios",
        "/admin/user-balances",
        "/admin/credit-applications",
        "/admin/credit-settings",
        "/admin/t2-settlements",
        "/admin/verifications",
        "/admin/bank-accounts",
        "/admin/deposit-requests",
        "/admin/deposits",
        "/admin/withdrawals",
        "/admin/stock-descriptions",
        "/admin/settings",
        "deposit_requests",
        "withdrawal_requests",
        "pending_orders",
        "user_balances",
        "user_positions",
        "credit_applications",
        "identity_documents",
        "system_settings",
        "stock_descriptions",
        "t2_settlements",
        "bank_accounts",
        "Beni Hatırla",
        "Şifre Değiştir",
        "placeLimitOrder",
        "cancel_remaining",
        "pending_balance",
    ]
    return {item: item in text for item in checks}


def cleanup_user_ids(user_ids: list[int]) -> None:
    if not user_ids:
        return
    with sqlite3.connect(AUDIT_DB) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        conn.executemany("DELETE FROM users WHERE id=?", [(item,) for item in user_ids])
        conn.commit()


def main() -> None:
    admin_tc, admin_password = bootstrap_admin()
    admin = client()
    user = client()
    reject_user = client()
    created_user_ids: list[int] = []
    results: dict = {"local": {}, "live_read_only": live_bundle_map(), "cleanup": True}

    try:
        main_user = register_user(user, "Main")
        rejected = register_user(reject_user, "Reject")
        results["local"]["register"] = {
            "main": main_user["register_status"],
            "reject": rejected["register_status"],
        }
        pending_login_status, _ = request(
            user,
            "POST",
            "/api/login",
            {"tc": main_user["tc"], "password": main_user["password"]},
        )
        results["local"]["pre_approval_login_allowed"] = pending_login_status
        document_body, document_headers = multipart(
            {},
            {"identity_front": IMG, "identity_back": IMG, "selfie": IMG},
        )
        document_status, _ = request(
            user,
            "POST",
            "/api/profile/documents",
            document_body,
            document_headers,
        )
        results["local"]["profile_document_upload"] = document_status

        request(admin, "POST", "/api/login", {"tc": admin_tc, "password": admin_password, "remember": True})
        request(admin, "POST", "/api/admin/step-up", {"password": admin_password})
        admin_gets = [
            "/api/admin/summary",
            "/api/admin/users",
            "/api/admin/orders",
            "/api/admin/money",
            "/api/admin/reports",
            "/api/admin/documents",
            "/api/admin/bank-accounts",
            "/api/admin/t2-settlements",
            "/api/admin/transactions",
            "/api/admin/positions",
            "/api/admin/user-balances",
            "/api/admin/system-settings",
            "/api/admin/stock-descriptions",
        ]
        results["local"]["admin_gets"] = {path: request(admin, "GET", path)[0] for path in admin_gets}

        users = request(admin, "GET", "/api/admin/users")[1]["users"]
        main_row = next(item for item in users if item["email"] == main_user["fields"]["email"])
        reject_row = next(item for item in users if item["email"] == rejected["fields"]["email"])
        created_user_ids.extend([main_row["id"], reject_row["id"]])

        docs = [
            item
            for item in request(admin, "GET", "/api/admin/documents")[1]["documents"]
            if item["user_id"] == main_row["id"]
        ]
        for document in docs:
            request(admin, "POST", f"/api/admin/documents/{document['id']}/approve", {"note": "Belge kalite kontrolü tamamlandı"})
        request(
            admin,
            "POST",
            f"/api/admin/users/{main_row['id']}",
            {
                "full_name": main_row["full_name"],
                "phone": main_row["phone"],
                "email": main_row["email"],
                "city": "Istanbul",
                "district": "Audit",
                "birth_date": "1990-01-01",
                "address": "Updated audit address",
                "status": "under_review",
                "kyc_note": "audit update",
            },
        )
        request(admin, "POST", f"/api/admin/users/{main_row['id']}/approve", {})
        request(admin, "POST", f"/api/admin/users/{reject_row['id']}/reject", {})
        results["local"]["admin_user_actions"] = ["documents_approved", "user_update", "user_approve", "user_reject"]

        request(user, "POST", "/api/login", {"tc": main_user["tc"], "password": main_user["password"], "remember": True})
        user_gets = ["/api/me", "/api/system-bank-accounts", "/api/portfolio", "/api/orders", "/api/money-requests"]
        results["local"]["user_gets"] = {path: request(user, "GET", path)[0] for path in user_gets}
        request(
            user,
            "POST",
            "/api/profile/password",
            {"current_password": main_user["password"], "new_password": "EndpointNew!2026"},
        )

        request(admin, "POST", "/api/admin/balances", {"user_id": main_row["id"], "action": "add", "amount": 250000, "note": "Endpoint audit bakiye ekleme"})
        request(admin, "POST", "/api/admin/balances", {"user_id": main_row["id"], "action": "subtract", "amount": 1000, "note": "Endpoint audit bakiye azaltma"})
        request(admin, "POST", "/api/admin/balances", {"user_id": main_row["id"], "action": "credit", "amount": 50000, "note": "Endpoint audit kredi limiti"})

        _, bank = request(
            admin,
            "POST",
            "/api/admin/bank-accounts",
            {"bank_name": "Audit Bank", "account_holder": "Guney Menkul Degerler", "iban": "TR330006100519786457841326", "branch_name": "Audit", "description": "Endpoint audit hesabi", "is_active": "1", "sort_order": 99},
        )
        bank_id = max(item["id"] for item in bank["bank_accounts"] if item["bank_name"] == "Audit Bank")

        body, headers = multipart(
            {
                "request_type": "deposit",
                "amount": "12500",
                "account_ref": "TR330006100519786457841326",
                "transfer_code": f"{main_row['account_no']}-AUDIT",
                "note": "audit deposit",
            },
            {"receipt": IMG},
        )
        _, deposit = request(user, "POST", "/api/money-requests", body, headers)
        request(admin, "POST", f"/api/admin/money/{deposit['request']['id']}/approve", {"reason": "Dekont ve banka hareketi doğrulandı"})

        _, withdraw_cancel = request(
            user,
            "POST",
            "/api/money-requests",
            {"request_type": "withdraw", "amount": 700, "bank_name": "Audit Bank", "account_holder": main_row["full_name"], "iban": "TR330006100519786457841326"},
        )
        request(user, "POST", f"/api/money-requests/{withdraw_cancel['request']['id']}/cancel", {})
        _, withdraw_approve = request(
            user,
            "POST",
            "/api/money-requests",
            {"request_type": "withdraw", "amount": 600, "bank_name": "Audit Bank", "account_holder": main_row["full_name"], "iban": "TR330006100519786457841326"},
        )
        request(admin, "POST", f"/api/admin/money/{withdraw_approve['request']['id']}/approve", {"reason": "Hesap sahibi ve bakiye doğrulandı"})
        _, credit = request(user, "POST", "/api/money-requests", {"request_type": "credit", "amount": 25000, "note": "audit credit"})
        request(admin, "POST", f"/api/admin/money/{credit['request']['id']}/reject", {"reason": "Kredi değerlendirme koşulları sağlanmadı"})
        results["local"]["money_actions"] = ["deposit_with_receipt_approved", "withdraw_cancelled", "withdraw_approved", "credit_rejected"]

        _, editable = request(user, "POST", "/api/orders", {"symbol": "AKBNK", "side": "buy", "quantity": 10, "order_type": "limit", "limit_price": 60})
        request(user, "POST", f"/api/orders/{editable['order']['id']}/edit", {"quantity": 11, "limit_price": 61})
        request(user, "POST", f"/api/orders/{editable['order']['id']}/cancel", {})
        _, rejected_order = request(user, "POST", "/api/orders", {"symbol": "AKBNK", "side": "buy", "quantity": 5, "order_type": "limit", "limit_price": 60})
        request(admin, "POST", f"/api/admin/orders/{rejected_order['order']['id']}/reject", {"reason": "Endpoint audit ret senaryosu"})
        _, approved_order = request(user, "POST", "/api/orders", {"symbol": "AKBNK", "side": "buy", "quantity": 10, "order_type": "limit", "limit_price": 60})
        request(admin, "POST", f"/api/admin/orders/{approved_order['order']['id']}/approve", {"reason": "Limit koşulu ve bakiye doğrulandı"})
        request(user, "POST", "/api/orders", {"symbol": "AKBNK", "side": "buy", "quantity": 10, "order_type": "market", "limit_price": 1})
        request(user, "POST", "/api/orders", {"symbol": "AKBNK", "side": "sell", "quantity": 3, "order_type": "market", "limit_price": 1})
        _, pending_sell = request(user, "POST", "/api/orders", {"symbol": "AKBNK", "side": "sell", "quantity": 2, "order_type": "limit", "limit_price": 70})
        request(admin, "POST", f"/api/admin/orders/{pending_sell['order']['id']}/approve", {"reason": "Pozisyon adedi ve limit doğrulandı"})
        results["local"]["order_actions"] = ["limit_edit_cancel", "limit_reject", "limit_approve", "market_buy", "market_sell", "limit_sell_approve"]

        t2_rows = request(admin, "GET", "/api/admin/t2-settlements")[1]["t2_settlements"]
        for row in [item for item in t2_rows if item["user_id"] == main_row["id"] and item["status"] == "pending"]:
            request(admin, "POST", f"/api/admin/t2-settlements/{row['id']}", {})

        request(admin, "POST", "/api/admin/positions", {"user_id": main_row["id"], "action": "set", "symbol": "THYAO", "quantity": 4, "price": 300, "note": "Endpoint audit pozisyon ayarı"})
        request(admin, "POST", "/api/admin/positions", {"user_id": main_row["id"], "action": "add", "symbol": "THYAO", "quantity": 1, "price": 310, "note": "Endpoint audit pozisyon ekleme"})
        request(admin, "POST", "/api/admin/positions", {"user_id": main_row["id"], "action": "reduce", "symbol": "THYAO", "quantity": 1, "price": 310, "note": "Endpoint audit pozisyon azaltma"})
        request(admin, "POST", f"/api/admin/bank-accounts/{bank_id}", {"action": "toggle"})
        request(admin, "POST", f"/api/admin/bank-accounts/{bank_id}", {"action": "delete"})
        request(admin, "POST", "/api/admin/system-settings", {"trading_enabled": "1", "maintenance_mode": "0", "price_simulation": "0", "credit_monthly_interest_rate": "2.7"})
        request(admin, "POST", "/api/admin/stock-descriptions", {"symbol": "AKBNK", "description": "audit description", "risk_note": "audit risk"})

        final_portfolio = request(user, "GET", "/api/portfolio")[1]
        final_admin_summary = request(admin, "GET", "/api/admin/summary")[1]["summary"]
        final_reports = request(admin, "GET", "/api/admin/reports")[1]
        with sqlite3.connect(AUDIT_DB) as conn:
            views = {
                name: conn.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
                for name in [
                    "deposit_requests",
                    "withdrawal_requests",
                    "pending_orders",
                    "user_balances",
                    "user_positions",
                    "credit_applications",
                    "identity_documents",
                ]
            }
        results["local"]["final"] = {
            "cash_balance": final_portfolio["account"]["cash_balance"],
            "pending_balance": final_portfolio["account"]["pending_balance"],
            "positions": len(final_portfolio["positions"]),
            "orders": len(final_portfolio["orders"]),
            "money_requests": len(final_portfolio["money_requests"]),
            "transactions": len(final_portfolio["transactions"]),
            "documents": len(final_portfolio["documents"]),
            "admin_summary": final_admin_summary,
            "report_sections": list(final_reports.keys()),
            "views": views,
        }
    finally:
        cleanup_user_ids(created_user_ids)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        results["generated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(results["local"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

