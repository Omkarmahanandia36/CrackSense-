"""CrackSense AI - Asset & Icon Generator (Phase 5).

Generates 100% local, high-fidelity app branding assets:
- 1024x1024 Master Brand Icon (PNG)
- 1024x1024 Adaptive Icon (Foreground & Background)
- Windows Electron Multi-Resolution Icon (.ico)
- High-Resolution Splash Screens (Android & Desktop)
- Web Favicons & Logos

ZERO Adobe dependencies. Built entirely using Python Pillow vector primitives.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP_DIR = os.path.join(PROJECT_ROOT, "desktop")
FRONTEND_DIR = os.path.join(DESKTOP_DIR, "frontend")
ANDROID_RES = os.path.join(FRONTEND_DIR, "android", "app", "src", "main", "res")
BUILD_DIR = os.path.join(DESKTOP_DIR, "build")
PUBLIC_DIR = os.path.join(FRONTEND_DIR, "public")

# Palette constants from tokens.css
NAVY_BASE = (6, 20, 27, 255)        # #06141B
NAVY_SURFACE = (17, 33, 45, 255)    # #11212D
STEEL_BORDER = (74, 92, 106, 255)   # #4A5C6A
FROST_SILVER = (204, 208, 207, 255) # #CCD0CF
CYAN_GLOW = (0, 240, 255, 255)      # Luminous Cyan
CYAN_CORE = (255, 255, 255, 255)    # Bright white core
AMBER_RETICLE = (255, 159, 10, 255) # Safety Amber
CORAL_DEFECT = (255, 111, 97, 255)  # Defect Highlight


def draw_squircle_mask(size: int, radius: int) -> Image.Image:
    """Create a high-resolution antialiased squircle alpha mask."""
    mask = Image.new("L", (size * 4, size * 4), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size * 4, size * 4], radius=radius * 4, fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def create_gradient_canvas(size: int) -> Image.Image:
    """Generate subtle radial slate-gradient background matching glass UI."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    center_x, center_y = size / 2, size / 2
    max_radius = size * 0.72

    # Draw gradient lines radiating from center
    draw = ImageDraw.Draw(img)
    for r in range(int(max_radius), 0, -2):
        t = r / max_radius
        # Interpolate from NAVY_SURFACE in center to NAVY_BASE at edges
        cr = int(NAVY_SURFACE[0] * (1 - t) + NAVY_BASE[0] * t)
        cg = int(NAVY_SURFACE[1] * (1 - t) + NAVY_BASE[1] * t)
        cb = int(NAVY_SURFACE[2] * (1 - t) + NAVY_BASE[2] * t)
        draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            fill=(cr, cg, cb, 255),
        )
    return img


def draw_radar_and_fissure(draw: ImageDraw.ImageDraw, size: int, scale: float = 1.0, is_foreground: bool = False):
    """Draw precision crack fissure, AI detection brackets, and radar rings."""
    cx, cy = size / 2, size / 2
    s = scale * (size / 1024.0)

    # 1. Subtle concentric radar grid
    if not is_foreground:
        for r_ratio in [140, 260, 380]:
            r = r_ratio * s
            draw.ellipse(
                [cx - r, cy - r, cx + r, cy + r],
                outline=(74, 92, 106, 50),
                width=max(1, int(2 * s)),
            )

        # Crosshair axis lines
        cross_len = 390 * s
        draw.line([cx - cross_len, cy, cx + cross_len, cy], fill=(74, 92, 106, 40), width=max(1, int(1.5 * s)))
        draw.line([cx, cy - cross_len, cx, cy + cross_len], fill=(74, 92, 106, 40), width=max(1, int(1.5 * s)))

    # 2. Main Concrete Crack Fissure Coordinates (Vector geometry relative to 1024)
    main_fissure = [
        (330, 230), (370, 310), (350, 380), (410, 440),
        (480, 490), (510, 520), (540, 580), (520, 640),
        (590, 710), (670, 780), (710, 820)
    ]
    branch_right = [
        (510, 520), (580, 490), (640, 510), (710, 470), (760, 480)
    ]
    branch_left = [
        (480, 490), (430, 550), (380, 580), (320, 660), (280, 700)
    ]

    def scale_pts(pts):
        return [(cx + (x - 512) * s, cy + (y - 512) * s) for x, y in pts]

    mf = scale_pts(main_fissure)
    br = scale_pts(branch_right)
    bl = scale_pts(branch_left)

    # Helper to draw path with width and color
    def draw_path(pts, color, width):
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i + 1]], fill=color, width=max(1, int(width)))
            # Smooth joints
            r = width / 2.0
            draw.ellipse([pts[i][0] - r, pts[i][1] - r, pts[i][0] + r, pts[i][1] + r], fill=color)

    # Outer luminous cyan glow
    glow_color = (0, 240, 255, 65)
    draw_path(mf, glow_color, 24 * s)
    draw_path(br, glow_color, 18 * s)
    draw_path(bl, glow_color, 18 * s)

    # Mid cyan intensity
    mid_color = (0, 240, 255, 180)
    draw_path(mf, mid_color, 12 * s)
    draw_path(br, mid_color, 8 * s)
    draw_path(bl, mid_color, 8 * s)

    # Bright core fissure
    core_color = (255, 255, 255, 255)
    draw_path(mf, core_color, 4 * s)
    draw_path(br, core_color, 3 * s)
    draw_path(bl, core_color, 3 * s)

    # 3. AI Detection Reticle / Bounding Brackets (Safety Amber / Neon)
    # Bounding region around the detected central crack
    bx1, by1 = cx - 180 * s, cy - 180 * s
    bx2, by2 = cx + 200 * s, cy + 200 * s
    b_len = 45 * s
    bw = max(2, int(4.5 * s))
    reticle_color = AMBER_RETICLE

    # Top-Left Bracket
    draw.line([bx1, by1, bx1 + b_len, by1], fill=reticle_color, width=bw)
    draw.line([bx1, by1, bx1, by1 + b_len], fill=reticle_color, width=bw)

    # Top-Right Bracket
    draw.line([bx2, by1, bx2 - b_len, by1], fill=reticle_color, width=bw)
    draw.line([bx2, by1, bx2, by1 + b_len], fill=reticle_color, width=bw)

    # Bottom-Left Bracket
    draw.line([bx1, by2, bx1 + b_len, by2], fill=reticle_color, width=bw)
    draw.line([bx1, by2, bx1, by2 - b_len], fill=reticle_color, width=bw)

    # Bottom-Right Bracket
    draw.line([bx2, by2, bx2 - b_len, by2], fill=reticle_color, width=bw)
    draw.line([bx2, by2, bx2, by2 - b_len], fill=reticle_color, width=bw)

    # Detection confidence chip: "[AI: 99% CRACK]"
    chip_w, chip_h = 100 * s, 24 * s
    chip_x, chip_y = bx1, by1 - chip_h - 6 * s
    draw.rounded_rectangle([chip_x, chip_y, chip_x + chip_w, chip_y + chip_h], radius=4 * s, fill=(255, 159, 10, 230))


def generate_master_icon(size: int = 1024) -> Image.Image:
    """Build the final 1024x1024 master icon with squircle mask and glass border."""
    base = create_gradient_canvas(size)
    draw = ImageDraw.Draw(base)

    # Draw radar and fissure elements
    draw_radar_and_fissure(draw, size, scale=1.0, is_foreground=False)

    # Glass border highlight
    mask = draw_squircle_mask(size, radius=210)
    final_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_icon.paste(base, (0, 0), mask)

    # Outline squircle border
    border_draw = ImageDraw.Draw(final_icon)
    border_draw.rounded_rectangle(
        [2, 2, size - 3, size - 3],
        radius=210,
        outline=(155, 168, 171, 70),
        width=4,
    )
    # Top specular glass shine
    border_draw.arc([16, 8, size - 16, 300], start=200, end=340, fill=(255, 255, 255, 80), width=3)

    return final_icon


def generate_adaptive_foreground(size: int = 1024) -> Image.Image:
    """Generate Android adaptive icon foreground (inner 66% safe zone)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Scale down by 0.68 so content sits perfectly inside the Android safe zone circle
    draw_radar_and_fissure(draw, size, scale=0.68, is_foreground=True)
    return img


def generate_adaptive_background(size: int = 1024) -> Image.Image:
    """Generate Android adaptive icon background."""
    return create_gradient_canvas(size)


def generate_splash_screen(width: int = 2732, height: int = 2732) -> Image.Image:
    """Generate high-resolution dark glass splash screen."""
    splash = Image.new("RGBA", (width, height), NAVY_BASE)
    draw = ImageDraw.Draw(splash)

    # Background subtle radial ambience
    cx, cy = width / 2, height / 2
    r_max = min(width, height) * 0.45
    for r in range(int(r_max), 0, -8):
        t = r / r_max
        alpha = int(45 * (1 - t))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(17, 33, 45, alpha))

    # Center Master Emblem (540x540)
    emblem_size = int(min(width, height) * 0.28)
    master_icon = generate_master_icon(emblem_size)
    emblem_x = int(cx - emblem_size / 2)
    emblem_y = int(cy - emblem_size / 2 - (40 * height / 1024))
    splash.paste(master_icon, (emblem_x, emblem_y), master_icon)

    return splash


def main():
    print("=" * 64)
    print("       CrackSense AI - Brand Asset Generator (Phase 5)")
    print("=" * 64)

    # 1. Generate 1024x1024 Master Icon
    print("\n[*] Generating Master 1024x1024 PNG Brand Icon...")
    master_1024 = generate_master_icon(1024)
    os.makedirs(BUILD_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    master_icon_path = os.path.join(BUILD_DIR, "icon.png")
    master_1024.save(master_icon_path, format="PNG")
    master_1024.save(os.path.join(DESKTOP_DIR, "icon.png"), format="PNG")
    master_1024.save(os.path.join(PUBLIC_DIR, "logo.png"), format="PNG")
    print(f"  [+] Saved {master_icon_path}")

    # 2. Generate Multi-size Windows ICO for Electron
    print("\n[*] Generating Windows Multi-Resolution .ico (16px to 256px)...")
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    ico_path = os.path.join(BUILD_DIR, "icon.ico")
    master_1024.save(ico_path, format="ICO", sizes=ico_sizes)
    master_1024.save(os.path.join(PUBLIC_DIR, "favicon.ico"), format="ICO", sizes=ico_sizes)
    master_1024.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "favicon.png"), format="PNG")
    print(f"  [+] Saved {ico_path}")

    # 3. Generate Android Adaptive Icon (Foreground & Background)
    print("\n[*] Generating Android Adaptive Icons...")
    fg_1024 = generate_adaptive_foreground(1024)
    bg_1024 = generate_adaptive_background(1024)

    # 4. Generate Android Mipmap Icons
    mipmap_configs = [
        ("mipmap-mdpi", 48, 108),
        ("mipmap-hdpi", 72, 162),
        ("mipmap-xhdpi", 96, 216),
        ("mipmap-xxhdpi", 144, 324),
        ("mipmap-xxxhdpi", 192, 432),
    ]

    for folder_name, launcher_size, fg_size in mipmap_configs:
        target_dir = os.path.join(ANDROID_RES, folder_name)
        os.makedirs(target_dir, exist_ok=True)

        # Standard ic_launcher.png
        launcher_img = master_1024.resize((launcher_size, launcher_size), Image.Resampling.LANCZOS)
        launcher_img.save(os.path.join(target_dir, "ic_launcher.png"), format="PNG")
        launcher_img.save(os.path.join(target_dir, "ic_launcher_round.png"), format="PNG")

        # Foreground ic_launcher_foreground.png
        fg_resized = fg_1024.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
        fg_resized.save(os.path.join(target_dir, "ic_launcher_foreground.png"), format="PNG")
        print(f"  [+] Updated {folder_name} (launcher: {launcher_size}px, fg: {fg_size}px)")

    # 5. Generate Android Splash Screens
    print("\n[*] Generating Native Android Splash Screens...")
    splash_configs = [
        ("drawable", 480, 800),
        ("drawable-port-mdpi", 320, 480),
        ("drawable-port-hdpi", 480, 800),
        ("drawable-port-xhdpi", 720, 1280),
        ("drawable-port-xxhdpi", 960, 1600),
        ("drawable-port-xxxhdpi", 1280, 1920),
        ("drawable-land-mdpi", 480, 320),
        ("drawable-land-hdpi", 800, 480),
        ("drawable-land-xhdpi", 1280, 720),
        ("drawable-land-xxhdpi", 1600, 960),
        ("drawable-land-xxxhdpi", 1920, 1280),
    ]

    for folder_name, w, h in splash_configs:
        target_dir = os.path.join(ANDROID_RES, folder_name)
        os.makedirs(target_dir, exist_ok=True)
        splash_img = generate_splash_screen(w, h)
        splash_img.save(os.path.join(target_dir, "splash.png"), format="PNG")
        print(f"  [+] Generated {folder_name}/splash.png ({w}x{h})")

    print("\n" + "=" * 64)
    print("  SUCCESS: All CrackSense AI branding assets created!")
    print("=" * 64)


if __name__ == "__main__":
    main()
