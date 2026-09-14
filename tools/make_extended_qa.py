from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "design-qa"
SCREENS = [
    ("Giriş", "final-login.png"), ("Ana Sayfa", "final-home.png"),
    ("Piyasalar", "final-markets.png"), ("Alış", "final-trade-buy.png"),
    ("Satış", "final-trade-sell.png"), ("Portföy", "final-portfolio.png"),
    ("Elde Olanlar", "final-holdings.png"), ("Satılanlar", "final-sold.png"),
    ("Geçmiş", "final-history.png"), ("Emirler", "final-orders.png"),
    ("Hesap", "final-profile.png"), ("Hesap Özeti", "final-overview.png"),
    ("Güvenlik", "final-security.png"), ("Kimlik", "final-identity.png"),
    ("Belgeler", "final-documents.png"), ("Para İşlemleri", "final-money.png"),
    ("Bildirimler", "final-notifications.png"), ("Takip Listem", "final-favorites.png"),
    ("Canlı Destek", "final-support.png"), ("Hareketler", "final-transactions.png"),
]

thumb_w, thumb_h = 196, 426
gap, label_h = 12, 24
cols = 5
rows = (len(SCREENS) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (thumb_w + gap) + gap, rows * (thumb_h + label_h + gap) + gap), "#edf2f8")
draw = ImageDraw.Draw(sheet)
for index, (label, filename) in enumerate(SCREENS):
    source = Image.open(OUT / filename).convert("RGB")
    source = source.crop((0, 0, source.width, min(source.height, 852))).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = gap + (index % cols) * (thumb_w + gap)
    y = gap + (index // cols) * (thumb_h + label_h + gap)
    draw.text((x + 4, y + 4), label, fill="#0f1d38")
    sheet.paste(source, (x, y + label_h))

sheet.save(OUT / "implementation-screen-matrix.png", quality=95)

reference = Image.open(ROOT / "photo_2026-08-31_15-57-04.jpg").convert("RGB")
target_h = sheet.height
reference = reference.resize((round(reference.width * target_h / reference.height), target_h), Image.Resampling.LANCZOS)
comparison = Image.new("RGB", (reference.width + sheet.width + 18, target_h + 36), "white")
comparison.paste(reference, (0, 36))
comparison.paste(sheet, (reference.width + 18, 36))
heading = ImageDraw.Draw(comparison)
heading.text((10, 10), "REFERANS EKRAN MATRISI", fill="#0f1d38")
heading.text((reference.width + 28, 10), "PARIBU2 UYGULAMA EKRAN MATRISI", fill="#0f1d38")
if comparison.width > 2000:
    comparison = comparison.resize((2000, round(comparison.height * 2000 / comparison.width)), Image.Resampling.LANCZOS)
comparison.save(OUT / "comparison-all-screens.jpg", quality=88, optimize=True)
print(OUT / "comparison-all-screens.jpg")
