"""Write a word as an SVG made only from the bami.blog logo's own shapes.

    python3 tools/lettering/build.py "send noods" public/lettering/send-noods.svg
    python3 tools/lettering/build.py --outline "about" public/lettering/about-outline.svg

Available letters: a–z and space. Each one is made only from the logo: see glyphs.py.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from glyphs import DEFS, RED, word_svg

TOP, BOTTOM = 4, 136  # vertical band shared by all letters (logo coordinates)
DESCENDERS = {"g": 170, "j": 152, "y": 152}  # letters whose tails hang below the band, and how far
OUTLINE = 6           # outline thickness in logo units (≈1.3px at the sizes used on the site)

# Traces the edge of the combined shape: erode the letters, keep what was eaten away.
# Working on the merged silhouette means overlapping pieces don't show seams.
OUTLINE_FILTER = (f'<filter id="outline" x="-2%" y="-5%" width="104%" height="110%">'
                  f'<feMorphology in="SourceAlpha" operator="erode" radius="{OUTLINE}" result="inner"/>'
                  f'<feComposite in="SourceAlpha" in2="inner" operator="out" result="ring"/>'
                  f'<feFlood flood-color="{RED}"/><feComposite in2="ring" operator="in"/></filter>')

def main(text, out, outline=False):
    body, width = word_svg(text)
    bottom = max([BOTTOM] + [DESCENDERS[c] for c in text if c in DESCENDERS])
    defs = DEFS + (OUTLINE_FILTER if outline else "")
    filt = ' filter="url(#outline)"' if outline else ""
    group = f'<g fill="{RED}"{filt}>{body}</g>'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 {TOP} {width + 4:.1f} {bottom - TOP}" '
           f'role="img" aria-label="{text}"><defs>{defs}</defs>{group}</svg>\n')
    Path(out).write_text(svg)
    print(f"{out}: {width + 4:.0f}×{bottom - TOP}")

if __name__ == "__main__":
    args = sys.argv[1:]
    outline = "--outline" in args
    args = [a for a in args if a != "--outline"]
    main(*args[:2], outline=outline)
