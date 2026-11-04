# Gera a imagem de abertura do executável portátil (assets/splash.bmp), mostrada
# enquanto o .exe se descompacta, antes de o Electron iniciar. O instalador portátil
# só aceita BMP de 24 bits, sem transparência.
#
# Uso: python scripts/make-splash.py   (requer Pillow)

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / 'src' / 'assets' / 'logo.png'
OUT = ROOT / 'assets' / 'splash.bmp'
FONT = 'C:/Windows/Fonts/segoeuib.ttf'

W, H = 560, 320
SCALE = 2  # desenha em resolução dobrada e reduz no fim (bordas suaves)

def main():
    w, h = W * SCALE, H * SCALE
    img = Image.new('RGB', (w, h), (7, 7, 9))

    # Brilho radial suave no centro, como na tela de abertura do app.
    glow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(glow).ellipse((w * 0.12, -h * 0.35, w * 0.88, h * 1.05), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(120 * SCALE // 2))
    img = Image.composite(Image.new('RGB', (w, h), (30, 30, 34)), img, glow)

    logo = Image.open(LOGO).convert('RGBA')
    logo_w = int(w * 0.56)
    logo = logo.resize((logo_w, int(logo.height * logo_w / logo.width)), Image.LANCZOS)
    lx, ly = (w - logo.width) // 2, int(h * 0.44) - logo.height // 2
    img.paste(logo, (lx, ly), logo)

    # Texto discreto de status (a imagem é estática, então nada de barra "parada").
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, 11 * SCALE)
    label, spacing = 'INICIANDO', 4 * SCALE
    widths = [d.textlength(c, font=font) for c in label]
    total = sum(widths) + spacing * (len(label) - 1)
    x, y = (w - total) / 2, ly + logo.height + 26 * SCALE
    for c, cw in zip(label, widths):
        d.text((x, y), c, font=font, fill=(112, 112, 120))
        x += cw + spacing

    # Borda fina para a imagem não "sumir" sobre fundos escuros.
    d.rectangle((0, 0, w - 1, h - 1), outline=(38, 38, 44), width=SCALE)

    img = img.resize((W, H), Image.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, 'BMP')
    print(f'ok: {OUT} ({W}x{H})')

if __name__ == '__main__':
    main()
