"""
Generate 4 icon design options inspired by Instagram/TikTok aesthetics.
Keeps: blue background + 3 arches design.
"""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

SIZE = 1024
CX = 512
CY = 750   # base y-position of arches
RADII = [400, 295, 190]   # outer → inner

OUT_DIR = "/home/user/Reps/design_concepts"


# ─── helpers ────────────────────────────────────────────────────────────────

def new_canvas(bg_color=(26, 41, 81, 255)):
    img = Image.new("RGBA", (SIZE, SIZE), bg_color)
    return img


def draw_arch(img, cx, cy, r, width, color):
    """Draw a top-opening semicircle arch."""
    draw = ImageDraw.Draw(img)
    bbox = [cx - r, cy - r, cx + r, cy + r]
    draw.arc(bbox, start=180, end=0, fill=color, width=width)


def arch_with_glow(base, cx, cy, r, width, color, glow_color, blur=18, glow_extra=30):
    """Arch with a soft bloom/glow behind it."""
    # glow layer
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_arch(glow, cx, cy, r, width + glow_extra, glow_color)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=blur))
    base.alpha_composite(glow)
    # main arch on top
    draw_arch(base, cx, cy, r, width, color)


def gradient_bg(top_color, bottom_color):
    """Vertical gradient background."""
    img = Image.new("RGBA", (SIZE, SIZE))
    draw = ImageDraw.Draw(img)
    r1, g1, b1 = top_color
    r2, g2, b2 = bottom_color
    for y in range(SIZE):
        t = y / SIZE
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))
    return img


def radial_gradient_bg(center_color, edge_color):
    """Radial gradient background."""
    img = Image.new("RGBA", (SIZE, SIZE))
    pixels = img.load()
    r1, g1, b1 = center_color
    r2, g2, b2 = edge_color
    max_dist = math.sqrt(2) * SIZE / 2
    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x - SIZE / 2, y - SIZE / 2
            t = min(math.sqrt(dx * dx + dy * dy) / max_dist, 1.0)
            r = int(r1 + (r2 - r1) * t)
            g = int(g1 + (g2 - g1) * t)
            b = int(b1 + (b2 - b1) * t)
            pixels[x, y] = (r, g, b, 255)
    return img


def gradient_arch(img, cx, cy, r, width, colors, n_segments=120):
    """Draw an arch with a colour gradient along its length (n_segments steps)."""
    draw = ImageDraw.Draw(img)
    bbox = [cx - r, cy - r, cx + r, cy + r]
    step = 180.0 / n_segments
    for i in range(n_segments):
        t = i / (n_segments - 1)
        # interpolate across the color stops
        seg = t * (len(colors) - 1)
        idx = int(seg)
        frac = seg - idx
        if idx >= len(colors) - 1:
            c = colors[-1]
        else:
            c1, c2 = colors[idx], colors[idx + 1]
            c = tuple(int(c1[j] + (c2[j] - c1[j]) * frac) for j in range(3))
        angle_start = 180 + i * step
        angle_end = 180 + (i + 1) * step
        draw.arc(bbox, start=angle_start, end=angle_end, fill=c + (255,), width=width)


def save(img, name):
    path = os.path.join(OUT_DIR, name)
    img.convert("RGB").save(path)
    print(f"Saved {path}")


# ─── Option A: Vibrant Pop ──────────────────────────────────────────────────
# Bold bright colours, thick strokes – feels energetic like Instagram Reels.
# Outer = electric gold  |  middle = hot coral  |  inner = sky cyan

def make_option_a():
    img = new_canvas((20, 30, 72, 255))

    # subtle vignette via a slightly lighter centre overlay
    vignette = radial_gradient_bg((35, 50, 105), (12, 20, 55))
    img.alpha_composite(vignette)

    W = 52   # stroke width

    # arches with a gentle inner-glow bloom
    arch_with_glow(img, CX, CY, RADII[0], W,
                   color=(255, 176, 0, 255),
                   glow_color=(255, 176, 0, 90),
                   blur=22, glow_extra=28)

    arch_with_glow(img, CX, CY, RADII[1], W,
                   color=(255, 75, 95, 255),
                   glow_color=(255, 75, 95, 90),
                   blur=22, glow_extra=28)

    arch_with_glow(img, CX, CY, RADII[2], W,
                   color=(0, 210, 255, 255),
                   glow_color=(0, 210, 255, 90),
                   blur=22, glow_extra=28)

    save(img, "option_a_vibrant_pop.png")


# ─── Option B: Neon Night ───────────────────────────────────────────────────
# TikTok-inspired: very dark background, neon colours, strong glow aura.
# Classic TikTok duo-tone: neon-cyan + neon-coral, plus lime accent.

def make_option_b():
    img = new_canvas((8, 14, 32, 255))

    W = 48

    # strong neon glow
    arch_with_glow(img, CX, CY, RADII[0], W,
                   color=(255, 50, 90, 255),
                   glow_color=(255, 30, 70, 110),
                   blur=30, glow_extra=50)

    arch_with_glow(img, CX, CY, RADII[1], W,
                   color=(0, 240, 255, 255),
                   glow_color=(0, 220, 255, 110),
                   blur=30, glow_extra=50)

    arch_with_glow(img, CX, CY, RADII[2], W,
                   color=(180, 255, 60, 255),
                   glow_color=(160, 255, 40, 110),
                   blur=30, glow_extra=50)

    # Add a faint TikTok-style offset ghost for the outer arch (depth trick)
    ghost = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_arch(ghost, CX + 5, CY + 5, RADII[0], W - 10, (0, 240, 255, 40))
    ghost = ghost.filter(ImageFilter.GaussianBlur(radius=6))
    img.alpha_composite(ghost)

    save(img, "option_b_neon_night.png")


# ─── Option C: Instagram Gradient Arches ────────────────────────────────────
# Each arch sweeps through a warm gradient: left-purple → top-coral → right-gold.
# Background has a cool blue-to-indigo vertical fade.

def make_option_c():
    img = gradient_bg((18, 28, 80), (10, 18, 55))

    W = 46

    # Outer arch: purple → coral → gold (IG warm gradient)
    gradient_arch(img, CX, CY, RADII[0], W,
                  [(180, 60, 220), (255, 60, 120), (255, 160, 0)])

    # Middle arch: coral → gold → orange
    gradient_arch(img, CX, CY, RADII[1], W,
                  [(255, 80, 100), (255, 140, 30), (255, 200, 0)])

    # Inner arch: teal → cyan → sky
    gradient_arch(img, CX, CY, RADII[2], W,
                  [(0, 210, 180), (0, 200, 255), (80, 160, 255)])

    save(img, "option_c_ig_gradient.png")


# ─── Option D: Bold Minimal ─────────────────────────────────────────────────
# Thicker filled-band arches (Instagram-card aesthetic).
# Radial blue background, high-contrast vivid bands with a clean drop-shadow.

def make_option_d():
    img = radial_gradient_bg((40, 70, 160), (10, 20, 65))

    SHADOW_OFFSET = 8
    W = 68   # very thick – band-like

    shadow_alpha = 80

    def arch_shadow(cx, cy, r):
        sh = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        draw_arch(sh, cx + SHADOW_OFFSET, cy + SHADOW_OFFSET, r, W, (0, 0, 0, shadow_alpha))
        sh = sh.filter(ImageFilter.GaussianBlur(radius=10))
        img.alpha_composite(sh)

    arch_shadow(CX, CY, RADII[0])
    arch_shadow(CX, CY, RADII[1])
    arch_shadow(CX, CY, RADII[2])

    # Bold opaque arches
    draw_arch(img, CX, CY, RADII[0], W, (255, 185, 0, 255))    # vivid gold
    draw_arch(img, CX, CY, RADII[1], W, (255, 85, 100, 255))   # vivid coral
    draw_arch(img, CX, CY, RADII[2], W, (30, 215, 200, 255))   # vivid teal

    # thin white highlight line on top of each arch for shine
    HW = 5
    for r in RADII:
        draw_arch(img, CX, CY - 4, r, HW, (255, 255, 255, 80))

    save(img, "option_d_bold_minimal.png")


if __name__ == "__main__":
    make_option_a()
    make_option_b()
    make_option_c()
    make_option_d()
    print("Done – 4 options generated.")
