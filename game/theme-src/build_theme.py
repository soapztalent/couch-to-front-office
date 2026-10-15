#!/usr/bin/env python3
"""Builds theme-core.css (v9 shared theme layer). Two parts:
 1. RECOLOR (auto): every legacy office rule (styles/front-office/office-redesign/visual-polish/game-feel/live-rink.css)
    that paints a blue/slate colour or an arena photo is re-emitted (selector prefixed with `html`, so legacy specificity
    order is kept and it wins over the original) with the colour shifted to the neutral hub greys (same luminance) and
    photo layers removed. Gold/red/green/team colours are untouched. Not !important (unless the legacy one was), so the
    core layer, FA2, home and setup CSS still win.
 2. CORE: theme-core.src.css; selectors without html/body/:root/:where/@ are prefixed html body[data-view="office"],
    every declaration gets !important. Core rules always outrank the recolor layer.
usage: build_theme.py OUT.css   (legacy CSS is read from OUT's folder)"""
import os, re, sys, colorsys
HERE = os.path.dirname(os.path.abspath(__file__))
dest = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "theme-core.css")
APP = os.path.dirname(os.path.abspath(dest))
LEGACY = ["styles.css", "front-office.css", "office-redesign.css", "visual-polish.css", "game-feel.css", "live-rink.css"]
SPLIT = re.compile(r",(?![^(]*\))")

def sel(s):
    s = s.strip()
    if s.startswith(("html", "body", ":root", ":where", "@")): return s
    return 'html body[data-view="office"] ' + s
def decls(d):
    out = []
    for x in re.split(r";(?![^(]*\))", d):
        x = x.strip()
        if x: out.append(x if "!important" in x else x + " !important")
    return ";".join(out)
def walk(text, fn):
    """fn(head, body) -> str|None for plain rules; @media/@supports recurse; other @-blocks dropped."""
    out, i = [], 0
    while True:
        j = text.find("{", i)
        if j < 0: break
        head = text[i:j].strip()
        if head.startswith("@"):
            depth, k = 1, j + 1
            while depth:
                depth += {"{": 1, "}": -1}.get(text[k], 0); k += 1
            if head.startswith(("@media", "@supports")):
                inner = walk(text[j + 1:k - 1], fn)
                if inner.strip(): out.append(head + "{" + inner + "}")
            i = k; continue
        k = text.find("}", j)
        r = fn(head, text[j + 1:k])
        if r: out.append(r)
        i = k + 1
    return "\n".join(out)

# ---------- recolor ----------
def neutral(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    sat = (max(r, g, b) - min(r, g, b)) / (max(r, g, b) or 1)
    blueish = b - r >= 8 and b >= g - 30
    if not blueish: return None
    if lum > 120 and sat > 0.42: return None          # bright saturated blue = semantic (info/link): keep
    v = lum
    return (max(0, round(v - 2)), round(v), min(255, round(v + 3)))
def hx(c):
    c = c.lstrip('#')
    if len(c) in (3, 4): c = ''.join(ch * 2 for ch in c)
    return c
def recolor_value(v):
    changed = [False]
    def rep_hex(m):
        c = hx(m.group(0)); r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4)); a = c[6:8]
        n = neutral(r, g, b)
        if not n: return m.group(0)
        changed[0] = True; return '#%02x%02x%02x' % n + a
    def rep_rgb(m):
        parts = [p.strip() for p in m.group(2).split(',')]
        try: r, g, b = (float(parts[i]) for i in range(3))
        except Exception: return m.group(0)
        n = neutral(r, g, b)
        if not n: return m.group(0)
        changed[0] = True
        return 'rgba(%d,%d,%d,%s)' % (n + ((parts[3] if len(parts) > 3 else '1'),))
    v2 = re.sub(r'#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b', rep_hex, v)
    v2 = re.sub(r'(rgba?)\(([^)]*)\)', rep_rgb, v2)
    if 'url(' in v2 and 'arena' in v2:      # arena/boston photo layers -> gone
        changed[0] = True
        v2 = re.sub(r"url\([^)]*arena[^)]*\)[^,]*", "none", v2)
    return v2 if changed[0] else None
COLOR_PROPS = re.compile(r'^(--[\w-]+|background(-color|-image)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|color|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|scrollbar-color|column-rule(-color)?)$')
def recolor_rule(head, body):
    norm, imp = [], []
    for x in re.split(r";(?![^(]*\))", body):
        if ':' not in x: continue
        p, v = x.split(':', 1); p = p.strip().lower(); v = v.strip()
        if not COLOR_PROPS.match(p): continue
        important = '!important' in v; v = v.replace('!important', '').strip()
        nv = recolor_value(v)
        if nv is None: continue
        (imp if important else norm).append(p + ':' + nv + (' !important' if important else ''))
    out = []
    sels = [s.strip() for s in SPLIT.split(head) if s.strip()]
    def where(s):
        m = re.search(r'::?(before|after|placeholder|selection|marker|-webkit-[\w-]+)\b.*$', s)
        if m: return ':where(' + s[:m.start()] + ')' + s[m.start():] if s[:m.start()].strip() else None
        return ':where(' + s + ')'
    ss = [s if s.startswith('html') else ('html' + s if s.startswith(':root') else 'html ' + s) for s in sels]
    if norm: out.append(','.join(ss) + '{' + ';'.join(norm) + '}')
    if imp:
        out.append(','.join(ss) + '{' + ';'.join(imp) + '}')
    return '\n'.join(out) or None

parts = ["/* GENERATED by build_theme.py from theme-core.src.css + legacy CSS recolor. Do not edit by hand. */",
         "/* ===== 1. legacy recolor layer (auto) ===== */"]
nrec = 0
for f in LEGACY:
    p = os.path.join(APP, f)
    if not os.path.exists(p): continue
    t = re.sub(r"/\*[\s\S]*?\*/", "", open(p, encoding="utf-8").read())
    r = walk(t, recolor_rule)
    nrec += r.count('{'); parts.append('/* from ' + f + ' */\n' + r)
src = re.sub(r"/\*[\s\S]*?\*/", "", open(os.path.join(HERE, "theme-core.src.css"), encoding="utf-8").read())
parts.append("/* ===== 2. theme core ===== */")
parts.append(walk(src, lambda h, b: ",".join(sel(s) for s in SPLIT.split(h)) + "{" + decls(b) + "}"))
css = "\n".join(parts) + "\n"
open(dest, "w", encoding="utf-8").write(css)
print("wrote", dest, len(css), "bytes;", nrec, "recolor rules")
