from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "design-qa"
OUT.mkdir(parents=True, exist_ok=True)

PAIRS = [
    ("home", "photo_2026-08-31_15-42-03.jpg", "final-mobile-home.png"),
    ("trade", "photo_2026-08-31_15-38-59.jpg", "final-mobile-trade.png"),
    ("portfolio", "photo_2026-08-31_15-41-49.jpg", "final-mobile-portfolio.png"),
    ("profile", "photo_2026-08-31_15-46-59.jpg", "final-mobile-profile.png"),
]

for name, reference_name, implementation_name in PAIRS:
    reference = Image.open(ROOT / reference_name).convert("RGB")
    implementation = Image.open(OUT / implementation_name).convert("RGB")
    # The supplied references include a photographed phone frame. Crop to the
    # app-owned screen and normalize both sides to the verified CSS viewport.
    reference = reference.crop((70, 15, 650, 1265)).resize((393, 852), Image.Resampling.LANCZOS)
    implementation = implementation.resize((393, 852), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (786, 882), "white")
    canvas.paste(reference, (0, 30))
    canvas.paste(implementation, (393, 30))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 8), "REFERANS", fill="#101d38")
    draw.text((405, 8), "PARIBU 2", fill="#101d38")
    canvas.save(OUT / f"comparison-{name}.png", quality=95)

print("Created:", ", ".join(f"comparison-{name}.png" for name, *_ in PAIRS))
