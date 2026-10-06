"""An alphabet built only from the bami.blog logo's own shapes. Logo coordinates; baseline ≈ y 124."""
from source import SUB
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
    return f'<path d="{n_outline()}"/>'

def _outline(name):
    import outline
    return f'<path d="{getattr(outline, name)()}"/>'

TAIL_TOP = (346, 118)     # where the g's tail leaves the bowl

def _tail(to, k=1.0):
    """The g's tail hung from point `to` (its thin top end)."""
    return piece((0,), sx=k, sy=k, to=to, about=TAIL_TOP, clip="gtail")

def _stem(cx, cy, rot=0, sx=1.0, sy=1.0):
    """The i's stem (thin top, blobby bottom) centred on (cx, cy)."""
    return piece((6,), sx=sx, sy=sy, rot=rot, to=(cx, cy), about=STEM)

def _s():
    k = 0.62
    low = piece((0,), sx=k, sy=k, to=(30, 104), about=TAIL, clip="gtail")               # the g's tail
    top = piece((0,), sx=k, sy=k, rot=180, to=(30, 70), about=TAIL, clip="gtail")       # …and the same tail turned around
    spine = piece((6,), sx=0.55, sy=0.62, rot=-82, to=(30, 88), about=STEM)              # i-stroke joining them
    return low + top + spine

# name: (svg, left, right) — left/right edges in the glyph's own coordinates
def _arrow(spread=40, arm=0.85, shaft=1.2):
    import math
    dx, dy = 33 * arm * math.sin(math.radians(spread)), 33 * arm * math.cos(math.radians(spread))
    head = (f'<g transform="rotate(-90 26 88)">{_stem(26 - dx, 119 - dy, rot=-spread, sx=0.9, sy=arm)}'
            f'{_stem(26 + dx, 119 - dy, rot=spread, sx=0.9, sy=arm)}</g>')   # tip at (57, 88)
    return f'<g transform="translate(34 0)">{_stem(57 - 33 * shaft - 4, 88, rot=90, sx=0.6, sy=shaft)}{head}</g>'

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
    # straight from the logo
    "g": (f'<path d="{P(0, 13)}"/>', 289.0, 355.0),
    "i": (f'<path d="{P(6, 14)}"/>', 151.0, 177.5),
    "l": (f'<path d="{P(5)}"/>', 236.0, 270.0),
    "m": (f'<path d="{P(1)}"/>', 94.5, 156.6),
    # flipped / turned
    "p": (f'<path transform="translate(0 190) scale(1 -1)" d="{P(8, 10)}"/>', 5.2, 56.4),                  # b, flipped
    "q": (f'<path transform="translate(61.6 190) scale(-1 -1)" d="{P(8, 10)}"/>', 5.2, 56.4),              # b, turned
    "w": (f'<g transform="rotate(180 125.5 89)"><path d="{P(1)}"/></g>', 94.4, 156.5),                     # m, upside down
    # combined
    "h": (_n() + piece((5,), to=(108, 130), about=(250, 124)), 94.5, 156.6),                               # n + l
    "f": (f'<path transform="translate(506 0) scale(-1 1)" d="{P(5)}"/>' + _stem(250, 64, rot=90, sx=0.55, sy=0.6), 233.0, 272.0),  # mirrored l + bar
    "j": (f'<path d="{P(6, 14)}"/>' + _tail((168, 110), 0.8), 127.0, 177.5),                               # i + g-tail
    "k": (f'<path d="{P(5)}"/>' + _stem(276, 74, rot=42, sx=0.7, sy=0.6) + _stem(279, 104, rot=-36, sx=0.75, sy=0.6), 236.0, 300.0),
    "v": (_stem(14, 86, rot=-20, sx=0.9) + _stem(38, 86, rot=20, sx=0.9), 0.0, 52.0),
    "x": (_stem(26, 88, rot=34, sx=0.85, sy=1.05) + _stem(26, 88, rot=-34, sx=0.85, sy=1.05), 0.0, 52.0),
    "y": (f'<g transform="rotate(180 125.5 89)">{_n()}</g>' + _tail((153, 108), 0.85), 94.4, 157.0),       # u + g-tail
    "z": (_stem(25, 62, rot=90, sx=0.6, sy=0.7) + _stem(25, 117, rot=-90, sx=0.6, sy=0.7) + _stem(25, 90, rot=50, sx=0.6, sy=0.85), 0.0, 50.0),
    # arrow: two i-stems meeting in their blobby ends as the head, one laid flat as the shaft
    "→": (_arrow(), 0.0, 95.0),
    # edited outlines
    "c": (_outline("c_outline"), 257.4, 300.0),
    "r": (_outline("r_outline"), 94.5, 140.0),
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
