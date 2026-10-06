"""Point-level edits to logo outlines (used to turn the logo's m into an n)."""
import re, math
from glyphs import SUB

def flatten(d, steps=12):
    toks = re.findall(r"[MLCZ]|-?\d+\.?\d*", d)
    pts, i, cur, cmd = [], 0, (0, 0), None
    while i < len(toks):
        t = toks[i]
        if t in "MLCZ": cmd = t; i += 1
        if cmd == "Z": continue
        if cmd in ("M", "L"):
            cur = (float(toks[i]), float(toks[i + 1])); pts.append(cur); i += 2
        elif cmd == "C":
            c1 = (float(toks[i]), float(toks[i + 1])); c2 = (float(toks[i + 2]), float(toks[i + 3])); p = (float(toks[i + 4]), float(toks[i + 5])); i += 6
            for k in range(1, steps + 1):
                s = k / steps; a = (1 - s) ** 3; b = 3 * (1 - s) ** 2 * s; c = 3 * (1 - s) * s * s; e = s ** 3
                pts.append((a * cur[0] + b * c1[0] + c * c2[0] + e * p[0], a * cur[1] + b * c1[1] + c * c2[1] + e * p[1]))
            cur = p
    return pts

def replace_run(pts, inside, make):
    """Replace the contiguous run of points matching `inside` with points from make(start, end)."""
    n = len(pts); flags = [inside(p) for p in pts]
    # rotate so we start outside the run
    s0 = next(i for i in range(n) if not flags[i]); pts = pts[s0:] + pts[:s0]; flags = flags[s0:] + flags[:s0]
    a = next(i for i in range(n) if flags[i]); b = a
    while b < n and flags[b]: b += 1
    start, end = pts[a - 1], pts[b % n]
    return pts[:a] + make(start, end) + pts[b:]

def arc(start, end, apex_y, n=24):
    """Smooth half-ellipse-ish curve from start to end, peaking at apex_y halfway."""
    out = []
    for k in range(1, n):
        t = k / n
        x = start[0] + (end[0] - start[0]) * t
        ybase = start[1] + (end[1] - start[1]) * t
        out.append((x, ybase + (apex_y - (start[1] + end[1]) / 2) * math.sin(math.pi * t)))
    return out

def smooth(pts, passes=2):
    for _ in range(passes):
        n = len(pts); pts = [((pts[i - 1][0] + 2 * pts[i][0] + pts[(i + 1) % n][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[(i + 1) % n][1]) / 4) for i in range(n)]
    return pts

def n_outline(notch=(110, 142, 70), counter=(112, 139, 70, 100), top_apex=44, counter_apex=74):
    pts = flatten(SUB[1])
    x0, x1, ymax = notch
    pts = replace_run(pts, lambda p: x0 < p[0] < x1 and p[1] < ymax, lambda s, e: arc(s, e, top_apex))
    cx0, cx1, cy0, cy1 = counter
    pts = replace_run(pts, lambda p: cx0 < p[0] < cx1 and cy0 < p[1] < cy1, lambda s, e: arc(s, e, counter_apex))
    pts = smooth(pts)
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + "Z"
