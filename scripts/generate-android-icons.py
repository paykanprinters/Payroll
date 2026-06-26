"""
Generate Android launcher icons (adaptive foreground + legacy square/round) for
the Kan Printers Staff app from the brand transparent icon.

Source : Kan Printers brand transparent icon (CMYK pie + ink splatter).
Output : android/app/src/main/res/mipmap-*  (overwrites placeholder icons)
         plus a copy of the generated set into the brand directory.

Adaptive icon notes:
- Foreground canvas is 108dp. The central ~66% is the guaranteed "safe zone".
  We fit the pie inside the safe zone and let the splatter bleed outward, since
  launcher masks (circle/squircle/rounded square) crop the outer ring.
- Background is a solid colour (#FFFFFF) supplied by @color/ic_launcher_background,
  so the foreground PNGs stay transparent.

Run: python scripts/generate-android-icons.py
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

SOURCE = r"C:\Cursor\KANPRINTERS\KANPRINTERS_LOGO_AND_SOCIAL_DESIGN\brand_package\social_media_kit\icons\icon_transparent_1024.png"

REPO_RES = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "android", "app", "src", "main", "res",
)
BRAND_OUT = r"C:\Cursor\KANPRINTERS\KANPRINTERS_LOGO_AND_SOCIAL_DESIGN\brand_package\android_app_icon"

BACKGROUND = (255, 255, 255, 255)  # matches @color/ic_launcher_background

# Foreground (adaptive) sizes per density: 108dp canvas.
FOREGROUND_SIZES = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}

# Legacy launcher sizes per density: 48dp canvas.
LEGACY_SIZES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

# Fraction of the canvas the trimmed logo content occupies.
# Foreground: smaller so the pie lands in the safe zone, splatter bleeds out.
FG_CONTENT_FRACTION = 0.82
# Legacy: a touch larger; full icon already sits on its own background tile.
LEGACY_CONTENT_FRACTION = 0.90


def load_trimmed_source() -> Image.Image:
    img = Image.open(SOURCE).convert("RGBA")
    bbox = img.getbbox()  # bounds of non-transparent content
    if bbox:
        img = img.crop(bbox)
    return img


def scaled_logo(content: Image.Image, canvas: int, fraction: float) -> Image.Image:
    target = int(round(canvas * fraction))
    w, h = content.size
    scale = target / max(w, h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    return content.resize((new_w, new_h), Image.LANCZOS)


def make_foreground(content: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    logo = scaled_logo(content, size, FG_CONTENT_FRACTION)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))
    return canvas


def make_legacy(content: Image.Image, size: int, round_icon: bool) -> Image.Image:
    base = Image.new("RGBA", (size, size), BACKGROUND)
    logo = scaled_logo(content, size, LEGACY_CONTENT_FRACTION)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    base.alpha_composite(logo, (x, y))

    if round_icon:
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size - 1, size - 1), fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(base, (0, 0), mask)
        return out

    # Square (legacy) icons get lightly rounded corners.
    radius = int(size * 0.10)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


def save(img: Image.Image, *paths: str) -> None:
    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        img.save(p, "PNG")


def main() -> None:
    content = load_trimmed_source()
    print(f"Source trimmed content size: {content.size}")

    for density, size in FOREGROUND_SIZES.items():
        fg = make_foreground(content, size)
        save(
            fg,
            os.path.join(REPO_RES, f"mipmap-{density}", "ic_launcher_foreground.png"),
            os.path.join(BRAND_OUT, f"mipmap-{density}", "ic_launcher_foreground.png"),
        )

    for density, size in LEGACY_SIZES.items():
        square = make_legacy(content, size, round_icon=False)
        rnd = make_legacy(content, size, round_icon=True)
        save(
            square,
            os.path.join(REPO_RES, f"mipmap-{density}", "ic_launcher.png"),
            os.path.join(BRAND_OUT, f"mipmap-{density}", "ic_launcher.png"),
        )
        save(
            rnd,
            os.path.join(REPO_RES, f"mipmap-{density}", "ic_launcher_round.png"),
            os.path.join(BRAND_OUT, f"mipmap-{density}", "ic_launcher_round.png"),
        )

    # Play-store / preview size (not used by APK, handy for reference).
    preview = make_legacy(content, 512, round_icon=False)
    save(preview, os.path.join(BRAND_OUT, "ic_launcher-web-512.png"))

    print("Done. Wrote icons to android res and brand directory.")


if __name__ == "__main__":
    main()
