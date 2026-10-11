"""Erzeugt die App-Icons (Glut-Sechseck mit Klinge) in assets/icons/.
Aufruf: python tools/make_icons.py  (benötigt Pillow)"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'icons'
BG = (16, 21, 28)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def icon(size, scale=0.62):
    S = size * 4  # überabgetastet, dann verkleinert
    img = Image.new('RGB', (S, S), BG)
    # weicher Glutschein
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).ellipse([S * .18, S * .18, S * .82, S * .82], fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(S * .08))
    img.paste(Image.new('RGB', (S, S), (240, 162, 74)), (0, 0), glow)
    # Sechseck mit Verlauf
    cx, cy, r = S / 2, S / 2, S * scale / 2
    hexpts = [(cx + r * math.sin(a), cy - r * math.cos(a)) for a in [i * math.pi / 3 for i in range(6)]]
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).polygon(hexpts, fill=255)
    grad = Image.new('RGB', (S, S))
    gd = ImageDraw.Draw(grad)
    top, mid, bot = (255, 214, 140), (240, 162, 74), (168, 88, 24)
    for y in range(S):
        t = (y - (cy - r)) / (2 * r)
        t = min(1, max(0, t))
        c = lerp(top, mid, t / .55) if t < .55 else lerp(mid, bot, (t - .55) / .45)
        gd.line([(0, y), (S, y)], fill=c)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.polygon(hexpts, outline=(255, 226, 170), width=max(2, int(S * .008)))
    # Klinge (dunkel), diagonal
    ink = (26, 18, 8)
    w = r * .2
    blade = [(-w * .55, -r * .78), (0, -r * 1.0), (w * .55, -r * .78), (w * .55, r * .22), (-w * .55, r * .22)]
    guard = [(-r * .42, r * .22), (r * .42, r * .22), (r * .42, r * .36), (-r * .42, r * .36)]
    grip = [(-w * .32, r * .36), (w * .32, r * .36), (w * .32, r * .7), (-w * .32, r * .7)]
    ang = math.radians(35)

    def tr(pts, oy=-r * .06):
        out = []
        for x, y in pts:
            y += oy
            out.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
        return out
    for poly in (blade, guard, grip):
        d.polygon(tr(poly), fill=ink)
    px, py = tr([(0, r * .78)])[0]
    d.ellipse([px - w * .5, py - w * .5, px + w * .5, py + w * .5], fill=ink)
    # Lichtkante auf der Klinge
    d.line(tr([(0, -r * .9), (0, r * .15)]), fill=(255, 226, 170), width=max(1, int(S * .006)))
    return img.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192).save(OUT / 'icon-192.png')
    icon(512).save(OUT / 'icon-512.png')
    icon(512, scale=.5).save(OUT / 'icon-maskable-512.png')
    icon(180).save(OUT / 'apple-touch-icon.png')
    icon(32, scale=.86).save(OUT / 'favicon-32.png')
    print('Icons geschrieben nach', OUT)
