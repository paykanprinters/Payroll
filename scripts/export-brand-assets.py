"""Export trimmed PNG brand assets from source PDFs (max dimension capped)."""
from __future__ import annotations

from pathlib import Path

import fitz
from PIL import Image

SRC = Path(r"C:\Cursor\KANPRINTERS\KANPRINTERS_LOGO_AND_SOCIAL_DESIGN\brand_package\logo\pdf")
OUT = Path(__file__).resolve().parent.parent / "public" / "brand"

# Allow large intermediate pixmaps during trim; outputs are small.
Image.MAX_IMAGE_PIXELS = 250_000_000


def is_background(px: tuple[int, int, int, int]) -> bool:
    r, g, b, a = px
    if a < 10:
        return True
    if r > 240 and g > 240 and b > 240:
        return True
    if r < 25 and g < 25 and b < 25:
        return True
    return False


def trim(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    pixels = im.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            if not is_background(pixels[x, y]):
                xs.append(x)
                ys.append(y)
    if not xs:
        return im
    pad = max(4, int(min(w, h) * 0.01))
    box = (
        max(0, min(xs) - pad),
        max(0, min(ys) - pad),
        min(w, max(xs) + pad + 1),
        min(h, max(ys) + pad + 1),
    )
    return im.crop(box)


def pdf_to_png(pdf_path: Path, out_path: Path, max_width: int) -> None:
    doc = fitz.open(pdf_path)
    page = doc[0]
    scale = max_width / page.rect.width
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=True)
    tmp = out_path.with_suffix(".tmp.png")
    pix.save(tmp)
    trimmed = trim(Image.open(tmp))
    trimmed.save(out_path, optimize=True)
    tmp.unlink(missing_ok=True)
    print(f"{out_path.name}: {trimmed.size[0]}x{trimmed.size[1]}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    exports = [
        ("kanprinters_horizontal_color.pdf", "kanprinters_horizontal_color.png", 960),
        ("kanprinters_horizontal_dark.pdf", "kanprinters_horizontal_dark.png", 960),
        ("kanprinters_icon_color.pdf", "kanprinters_icon_color.png", 512),
        ("kanprinters_stacked_color.pdf", "kanprinters_stacked_color.png", 640),
    ]
    for pdf_name, png_name, max_w in exports:
        pdf = SRC / pdf_name
        if not pdf.exists():
            print(f"skip missing {pdf_name}")
            continue
        pdf_to_png(pdf, OUT / png_name, max_w)


if __name__ == "__main__":
    main()
