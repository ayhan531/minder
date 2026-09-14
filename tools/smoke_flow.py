import http.cookiejar
import json
import mimetypes
import os
import random
import re
import sqlite3
import urllib.error
import urllib.request
from pathlib import Path


BASE = os.environ.get("BASE_URL", "http://localhost:4173")
ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "6623161b5735463242da489b96c9120e.jpg"


def bootstrap_admin() -> tuple[str, str]:
    if os.environ.get("ADMIN_TC") and os.environ.get("ADMIN_PASSWORD"):
        return os.environ["ADMIN_TC"], os.environ["ADMIN_PASSWORD"]
    text = (ROOT / "data" / "bootstrap_admin.txt").read_text(encoding="utf-8")
    tc = re.search(r"^TC=(.+)$", text, re.MULTILINE).group(1).strip()
    password = re.search(r"^PASSWORD=(.+)$", text, re.MULTILINE).group(1).strip()
    return tc, password


def client() -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request(opener, method: str, path: str, data=None, headers=None, expect: int | None = None):
    body = None
    request_headers = headers or {}
    if isinstance(data, dict):
        body = json.dumps(data).encode("utf-8")
        request_headers = {"Content-Type": "application/json", **request_headers}
    elif data is not None:
        body = data
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=request_headers)
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


def main() -> None:
    admin_tc, admin_password = bootstrap_admin()
    suffix = random.randint(100000, 999999)
    tc = test_tc()
    user_password = "TestPass!2026"
    new_password = "NewPass!2026"
    user_client = client()
    admin_client = client()

    _, market = request(user_client, "GET", "/api/market")
    fields = {
        "full_name": f"Flow User {suffix}",
        "tc": tc,
        "phone": "05550000000",
        "email": f"flow{suffix}@local.test",
        "city": "Istanbul",
        "district": "Kadikoy",
        "birth_date": "1990-01-01",
        "address": "Test address",
        "password": user_password,
        "accept_kvkk": "1",
        "accept_distance_contract": "1",
        "accept_risk_disclosure": "1",
        "risk_experience": "1",
        "risk_horizon": "2",
        "risk_loss": "1",
        "risk_income": "2",
        "trade_frequency": "2",
        "knowledge_level": "2",
        "education": "Lisans",
        "occupation": "Yazılım uzmanı",
        "traded_products": "Hisse senedi / Fon",
        "investment_goal": "Uzun vadeli büyüme",
    }
    body, headers = multipart(fields, {})
    register_status, _ = request(user_client, "POST", "/api/register", body, headers)
    login_status, _ = request(user_client, "POST", "/api/login", {"tc": tc, "password": user_password})
    body, headers = multipart({}, {"identity_front": IMG, "identity_back": IMG, "selfie": IMG})
    request(user_client, "POST", "/api/profile/documents", body, headers)

    request(admin_client, "POST", "/api/login", {"tc": admin_tc, "password": admin_password, "remember": True})
    request(admin_client, "POST", "/api/admin/step-up", {"password": admin_password})
    users = request(admin_client, "GET", "/api/admin/users")[1]["users"]
    user = next(item for item in users if item["email"] == fields["email"])
    docs = [
        item
        for item in request(admin_client, "GET", "/api/admin/documents")[1]["documents"]
        if item["user_id"] == user["id"]
    ]
    for doc in docs:
        request(admin_client, "POST", f"/api/admin/documents/{doc['id']}/approve", {"note": "ok"})

    request(user_client, "POST", "/api/login", {"tc": tc, "password": user_password, "remember": True})
    request(
        user_client,
        "POST",
        "/api/profile/password",
        {"current_password": user_password, "new_password": new_password},
    )
    request(admin_client, "POST", "/api/admin/balances", {"user_id": user["id"], "action": "add", "amount": 250000, "note": "Otomatik regresyon başlangıç bakiyesi"})
    valid_iban = "TR330006100519786457841326"
    request(admin_client, "POST", "/api/admin/bank-accounts", {"bank_name": "Smoke Bank", "account_holder": "Eminevim Yatırım A.Ş.", "iban": valid_iban, "is_active": "1"})
    body, headers = multipart(
        {
            "request_type": "deposit",
            "amount": "12500",
            "account_ref": valid_iban,
            "transfer_code": f"{user['account_no']}-SMOKE",
            "note": "receipt smoke",
        },
        {"receipt": IMG},
    )
    _, deposit = request(user_client, "POST", "/api/money-requests", body, headers)
    request(admin_client, "POST", f"/api/admin/money/{deposit['request']['id']}/approve", {"reason": "Dekont ve banka kaydı doğrulandı"})
    request(
        user_client,
        "POST",
        "/api/orders",
        {"symbol": "AKBNK", "side": "buy", "quantity": 10, "order_type": "market", "limit_price": 1},
    )
    _, portfolio = request(user_client, "GET", "/api/portfolio")

    data_dir = Path(os.environ.get("DATA_DIR", ROOT / "data"))
    with sqlite3.connect(data_dir / "Eminevim.db") as conn:
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

    print(
        json.dumps(
            {
                "marketCount": len(market["quotes"]),
                "marketOk": market.get("meta", {}).get("ok"),
                "register": register_status,
                "preApprovalLogin": login_status,
                "docs": len(docs),
                "receipt": bool(deposit["request"].get("receipt_url")),
                "cash": portfolio["account"]["cash_balance"],
                "positions": len(portfolio["positions"]),
                "views": views,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()


