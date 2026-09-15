# Eminevim Yatırım Web

APK referansı korunarak web projesine dönüştürülmüş yatırım, e-şube ve admin paneli.

## Hızlı Başlangıç (Lokal)
1. Python 3.10+ kurulu olmalıdır.
2. Sunucuyu başlatın:
   ```bash
   python tools/backend_server.py
   ```
3. Tarayıcınızda açın:
   `http://localhost:5002/esube`

### Varsayılan Giriş Bilgileri:
- **Yönetici:** T.C. `10000000000` / Şifre: sunucu ilk açılışta `data/bootstrap_admin.txt` içine yazılır (veya `ADMIN_PASSWORD` ortam değişkeniyle sabitlenebilir).
- **Müşteri:** T.C. `10000000146` / Şifre: `TestUser123` (varsayılan; `TEST_USER_TC` / `TEST_USER_PASSWORD` ile özelleştirilebilir).

## Render 1-Click Dağıtım
Proje kök dizininde hazır `render.yaml` bulunmaktadır.
1. Depoyu GitHub'a aktarın.
2. Render.com > Blueprint seçin ve repoyu bağlayın.
3. Otomatik olarak canlıya alınır.

