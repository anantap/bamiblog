"""The bami.blog logo, split into its separate shapes."""
import re
from pathlib import Path
LOGO = Path(__file__).resolve().parents[2] / "public" / "logo.svg"
_d = re.search(r' d="([^"]+)"', open(LOGO).read()).group(1)
SUB = ["M" + s for s in _d.split("M")[1:]]
# 0 g, 13 g-hole · 1 m · 2 a, 9 a-hole · 3 o, 12 o-hole · 4 dot · 5 l · 6 i-stem, 14 i-dot · 7 b2, 11 b2-hole · 8 b1, 10 b1-hole
