# -*- coding: utf-8 -*-
"""
Outline the cesoi.de* wordmark — convert <text> (Syne 800) to <path> shapes.
Result: SVG that's font-independent (works without Syne installed).
"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.varLib import instancer

FONT = r"C:\Windows\Fonts\Syne-VariableFont_wght.ttf"
OUT  = r"E:\sites\cesoide\assets\logo\cesoi-de-wordmark-white-outlined.svg"

# Match the original wordmark spec
FONT_SIZE      = 72
AST_FONT_SIZE  = 34.56
BASELINE_Y     = 68
LETTER_SPACING = -2.16
AST_DY         = -21.6
START_X        = 20
WHITE          = "#FFFFFF"
ORANGE         = "#FF6400"

# Load + instance variable font at wght=800
font = TTFont(FONT)
instance = instancer.instantiateVariableFont(font, {"wght": 800})
upem = instance["head"].unitsPerEm
cmap = instance.getBestCmap()
glyph_set = instance.getGlyphSet()
hmtx = instance["hmtx"].metrics

def glyph_path(char):
    name = cmap[ord(char)]
    pen = SVGPathPen(glyph_set)
    glyph_set[name].draw(pen)
    advance = hmtx[name][0]  # advance width in font units
    return pen.getCommands(), advance

paths = []  # list of (d, color, transform)
x = START_X

# Helper to add a glyph at current x with given scale and color
def emit(char, font_size, baseline_y, color):
    global x
    d, advance = glyph_path(char)
    s = font_size / upem
    if d:
        # SVG transforms: read RIGHT to LEFT.
        # 1) scale(s, -s) flips Y so font's "up" becomes SVG's "up"
        # 2) translate(x, baseline_y) places the glyph at the baseline
        t = f"translate({x:.4f} {baseline_y:.4f}) scale({s:.6f} {-s:.6f})"
        paths.append((d, color, t))
    # advance after rendering
    x += advance * s + LETTER_SPACING

# "cesoi" white
for ch in "cesoi":
    emit(ch, FONT_SIZE, BASELINE_Y, WHITE)
# "." orange
emit(".", FONT_SIZE, BASELINE_Y, ORANGE)
# "de" white
for ch in "de":
    emit(ch, FONT_SIZE, BASELINE_Y, WHITE)
# "*" orange, smaller, with dy offset (raised)
emit("*", AST_FONT_SIZE, BASELINE_Y + AST_DY, ORANGE)

# Build SVG
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 96" width="520" height="96">']
for d, color, t in paths:
    svg.append(f'  <path d="{d}" fill="{color}" transform="{t}"/>')
svg.append("</svg>")
svg_text = "\n".join(svg) + "\n"

with open(OUT, "w", encoding="utf-8") as f:
    f.write(svg_text)

print(f"Wrote: {OUT}")
print(f"  Glyphs outlined: {len(paths)}")
print(f"  Advance positions: total width used = {x:.2f} (viewBox is 520 wide)")
