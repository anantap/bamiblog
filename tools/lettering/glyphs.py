"""An alphabet built only from the bami.blog logo's own shapes. Logo coordinates; baseline ≈ y 124."""
import re
from pathlib import Path
LOGO = Path(__file__).resolve().parents[2] / "public" / "logo.svg"
_d = re.search(r' d="([^"]+)"', open(LOGO).read()).group(1)
SUB = ["M" + s for s in _d.split("M")[1:]]
# 0 g, 13 g-hole · 1 m · 2 a, 9 a-hole · 3 o, 12 o-hole · 4 dot · 5 l · 6 i-stem, 14 i-dot · 7 b2, 11 b2-hole · 8 b1, 10 b1-hole
RED = "#e54c2a"
OCX, OCY = 281.7, 84      # centre of the o
STEM = (165, 88.5)        # centre of the i-stem (≈24 wide, 67 tall)
TAIL = (321, 142)         # centre of the g's tail

def P(*ids): return "".join(SUB[i] for i in ids)

def piece(ids, sx=1, sy=1, rot=0, to=(0, 0), about=(0, 0), clip=None):
    ax, ay = about; tx, ty = to
    inner = f'<path d="{P(*ids)}"/>'
    if clip: inner = f'<g clip-path="url(#{clip})">{inner}</g>'
    return f'<g transform="translate({tx} {ty}) rotate({rot}) scale({sx} {sy}) translate({-ax} {-ay})">{inner}</g>'

DEFS = ('<clipPath id="gtail" clipPathUnits="userSpaceOnUse"><rect x="280" y="116" width="90" height="60"/></clipPath>'
        # rounds off the spike inside the m's counter, so it reads as an n
        '<clipPath id="ncounter" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" d="M80 0H170V200H80Z M115 100 a10 28 0 1 0 20 0 a10 28 0 1 0 -20 0Z"/></clipPath>')

def _n():
    # the logo's m, outline edited: top notch smoothed into one arch, counter spike into a round counter
    from outline import n_outline
    return f'<path d="{n_outline(counter=(114, 141.5, 70, 90), counter_apex=66, top_apex=44)}"/>'

def _s():
    k = 0.62
    low = piece((0,), sx=k, sy=k, to=(30, 104), about=TAIL, clip="gtail")               # the g's tail
    top = piece((0,), sx=k, sy=k, rot=180, to=(30, 70), about=TAIL, clip="gtail")       # …and the same tail turned around
    spine = piece((6,), sx=0.55, sy=0.62, rot=-82, to=(30, 88), about=STEM)              # i-stroke joining them
    return low + top + spine

# name: (svg, left, right) — left/right edges in the glyph's own coordinates
GLYPHS = {
    "a": (f'<path d="{P(2, 9)}"/>', 53.5, 102.3),
    "b": (f'<path d="{P(8, 10)}"/>', 5.2, 56.4),
    "o": (f'<path d="{P(3, 12)}"/>', 257.4, 306.1),
    "d": (f'<path transform="translate(434.2 0) scale(-1 1)" d="{P(7, 11)}"/>', 192.1, 242.3),   # b, mirrored
    "e": (f'<g transform="rotate(180 78 89)"><path d="{P(2, 9)}"/></g>', 53.7, 102.5),          # a, upside down
    "n": (_n(), 94.5, 156.6),
    "u": (f'<g transform="rotate(180 125.5 89)">{_n()}</g>', 94.4, 156.5),                        # n, upside down
    "t": (piece((5,), sy=0.8, to=(253, 124), about=(253, 124)) + piece((6,), sx=0.55, sy=0.55, rot=90, to=(252, 60), about=STEM), 234.5, 271.0),
    "s": (_s(), 10, 50),
}

def word_svg(text, gap=2.0, space=24):
    parts, x = [], 0.0
    for ch in text:
        if ch == " ":
            x += space; continue
        svg, x0, x1 = GLYPHS[ch]
        parts.append(f'<g transform="translate({x - x0:.1f} 0)">{svg}</g>')
        x += (x1 - x0) + gap
    return "".join(parts), x - gap
