"""Write a word as an SVG made only from the bami.blog logo's own shapes.

    python3 tools/lettering/build.py "send noods" public/lettering/send-noods.svg
    python3 tools/lettering/build.py --outline "about" public/lettering/about-outline.svg
    python3 tools/lettering/build.py --gap=-6 --arc=32 --soft=2 "bamiversary" public/lettering/bamiversary.svg

--gap sets the space between letters (default 2; negative pulls them into each other). --arc bends the word
along a circle, ends down like a rainbow, spanning that many degrees. --soft rounds off every sharp corner
where pieces meet or are cut (blur by that much, then back to a crisp edge); about 2 keeps the shapes.

Available letters: a–z and space. Each one is made only from the logo: see glyphs.py.
"""
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from glyphs import DEFS, GLYPHS, RED, word_svg

TOP, BOTTOM = 4, 136  # vertical band shared by all letters (logo coordinates)
BASELINE = 124
DESCENDERS = {"g": 170, "j": 152, "y": 164}  # letters whose tails hang below the band, and how far
OUTLINE = 6           # outline thickness in logo units (≈1.3px at the sizes used on the site)

# Traces the edge of the combined shape: erode the letters, keep what was eaten away.
# Working on the merged silhouette means overlapping pieces don't show seams.
OUTLINE_FILTER = (f'<filter id="outline" x="-2%" y="-5%" width="104%" height="110%">'
                  f'<feMorphology in="SourceAlpha" operator="erode" radius="{OUTLINE}" result="inner"/>'
                  f'<feComposite in="SourceAlpha" in2="inner" operator="out" result="ring"/>'
                  f'<feFlood flood-color="{RED}"/><feComposite in2="ring" operator="in"/></filter>')

def arc_svg(text, gap, degrees, bottom, space=24):
    """The word bent along a circle: each letter moved onto the arc and turned to follow it.
    Returns the SVG body and its bounds (each letter's box, turned, so a little generous)."""
    letters, x = [], 0.0
    for ch in text:
        if ch == " ":
            x += space; continue
        svg, x0, x1 = GLYPHS[ch]
        letters.append((svg, x0, x1, x))
        x += (x1 - x0) + gap
    width = x - gap
    radius = width / math.radians(degrees)
    parts, xs, ys = [], [], []
    for svg, x0, x1, left in letters:
        cx = left + (x1 - x0) / 2
        angle = (cx - width / 2) / radius
        px = width / 2 + radius * math.sin(angle)
        py = radius * (1 - math.cos(angle))
        turn = math.degrees(angle)
        parts.append(f'<g transform="translate({px - cx:.1f} {py:.1f}) rotate({turn:.2f} {cx:.1f} {BASELINE})">'
                     f'<g transform="translate({left - x0:.1f} 0)">{svg}</g></g>')
        for bx, by in ((left, TOP), (left + x1 - x0, TOP), (left, bottom), (left + x1 - x0, bottom)):
            dx, dy = bx - cx, by - BASELINE
            xs.append(px + dx * math.cos(angle) - dy * math.sin(angle))
            ys.append(py + BASELINE + dx * math.sin(angle) + dy * math.cos(angle))
    return "".join(parts), (min(xs), min(ys), max(xs), max(ys))

def soft_filter(radius, box):
    x, y, w, h = box
    return (f'<filter id="soft" filterUnits="userSpaceOnUse" x="{x - 10:.1f}" y="{y - 10:.1f}" width="{w + 20:.1f}" height="{h + 20:.1f}">'
            f'<feGaussianBlur in="SourceGraphic" stdDeviation="{radius:g}"/>'
            f'<feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -11"/></filter>')

def main(text, out, outline=False, gap=2.0, arc=0.0, soft=0.0):
    bottom = max([BOTTOM] + [DESCENDERS[c] for c in text if c in DESCENDERS])
    if arc:
        body, (left, top, right, low) = arc_svg(text, gap, arc, bottom)
        box = (left - 2, top, right - left + 4, low - top)
    else:
        body, width = word_svg(text, gap)
        box = (-2, TOP, width + 4, bottom - TOP)
    defs = DEFS + (OUTLINE_FILTER if outline else "")
    filt = ' filter="url(#outline)"' if outline else ""
    group = f'<g fill="{RED}"{filt}>{body}</g>'
    if soft:
        defs += soft_filter(soft, box)
        group = f'<g filter="url(#soft)">{group}</g>'
    view = f"{box[0]:g} {box[1]:g} {box[2]:.1f} {box[3]:g}" if not arc else " ".join(f"{v:.1f}" for v in box)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" '
           f'role="img" aria-label="{text}"><defs>{defs}</defs>{group}</svg>\n')
    Path(out).write_text(svg)
    print(f"{out}: {box[2]:.0f}×{box[3]:.0f}")

if __name__ == "__main__":
    args = sys.argv[1:]
    option = lambda name, default: next((float(a.split("=", 1)[1]) for a in args if a.startswith(f"--{name}=")), default)
    outline = "--outline" in args
    gap, arc, soft = option("gap", 2.0), option("arc", 0.0), option("soft", 0.0)
    args = [a for a in args if not a.startswith("--")]
    main(*args[:2], outline=outline, gap=gap, arc=arc, soft=soft)
