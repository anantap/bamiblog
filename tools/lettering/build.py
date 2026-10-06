"""Write a word as an SVG made only from the bami.blog logo's own shapes.

    python3 tools/lettering/build.py "send noods" public/lettering/send-noods.svg

Available letters: a–z and space. Each one is made only from the logo: see glyphs.py.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from glyphs import DEFS, RED, word_svg

TOP, BOTTOM = 4, 136  # vertical band shared by all letters (logo coordinates)

def main(text, out):
    body, width = word_svg(text)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 {TOP} {width + 4:.1f} {BOTTOM - TOP}" '
           f'role="img" aria-label="{text}"><defs>{DEFS}</defs><g fill="{RED}">{body}</g></svg>\n')
    Path(out).write_text(svg)
    print(f"{out}: {width + 4:.0f}×{BOTTOM - TOP}")

if __name__ == "__main__":
    main(*sys.argv[1:3])
