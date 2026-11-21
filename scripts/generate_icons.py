import os
import sys
import io
import base64
from PIL import Image, ImageDraw

src_path = 'public/icons8-google-wallet-material-rounded-96.png'
if not os.path.exists(src_path):
    print(f'Error: Source file missing: {src_path}')
    sys.exit(1)

src = Image.open(src_path).convert('RGBA')
alpha = src.split()[3]
bbox = alpha.getbbox()
print(f'Original Google Wallet icon crop bbox: {bbox}')
cropped_alpha = alpha.crop(bbox)

# FinTrack Material 3 Theme Palette
BG_DARK = (14, 15, 18, 255)       # #0e0f12
CARD_BG = (22, 23, 28, 255)       # #16171c
BORDER = (35, 37, 44, 255)        # #23252c
ACCENT = (168, 199, 250, 255)     # #a8c7fa

def make_icon(size, icon_scale=0.58, card=True, solid_bg=False):
    canvas = Image.new('RGBA', (size, size), BG_DARK if solid_bg else (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    if card:
        margin = max(1, int(size * 0.04))
        r = int(size * 0.22)
        bw = max(1, int(size * 0.02))
        draw.rounded_rectangle(
            [margin, margin, size - margin, size - margin],
            radius=r,
            fill=CARD_BG,
            outline=BORDER,
            width=bw
        )
    elif solid_bg:
        canvas = Image.new('RGBA', (size, size), BG_DARK)
    
    # Target icon size
    target_w = int(size * icon_scale)
    aspect = cropped_alpha.height / cropped_alpha.width
    target_h = int(target_w * aspect)
    
    icon_alpha = cropped_alpha.resize((target_w, target_h), Image.Resampling.LANCZOS)
    tint = Image.new('RGBA', (target_w, target_h), ACCENT)
    tint.putalpha(icon_alpha)
    
    pos = ((size - target_w) // 2, (size - target_h) // 2)
    canvas.paste(tint, pos, tint)
    return canvas

# 1. pwa-512x512.png (PWA install splash & store icon)
pwa_512 = make_icon(512, icon_scale=0.58, card=True, solid_bg=True)
pwa_512.save('public/pwa-512x512.png', 'PNG')

# 2. pwa-192x192.png (Android home screen icon)
pwa_192 = make_icon(192, icon_scale=0.58, card=True, solid_bg=True)
pwa_192.save('public/pwa-192x192.png', 'PNG')

# 3. pwa-maskable-512x512.png (Android adaptive maskable icon with safe zone)
pwa_maskable = make_icon(512, icon_scale=0.52, card=False, solid_bg=True)
pwa_maskable.save('public/pwa-maskable-512x512.png', 'PNG')

# 4. apple-touch-icon.png (180x180 for iOS)
apple_touch = make_icon(180, icon_scale=0.58, card=True, solid_bg=True)
apple_touch.save('public/apple-touch-icon.png', 'PNG')

# 5. favicon-96x96.png (Standard 96x96 PNG favicon)
fav_96 = make_icon(96, icon_scale=0.62, card=True, solid_bg=False)
fav_96.save('public/favicon-96x96.png', 'PNG')

# 6. favicon-32x32.png (Standard 32x32 PNG favicon)
fav_32 = make_icon(32, icon_scale=0.65, card=True, solid_bg=False)
fav_32.save('public/favicon-32x32.png', 'PNG')

# 7. favicon-16x16.png (Standard 16x16 PNG favicon)
fav_16 = make_icon(16, icon_scale=0.70, card=True, solid_bg=False)
fav_16.save('public/favicon-16x16.png', 'PNG')

# 8. favicon.ico (Multi-size 16x16, 32x32, 48x48 ICO)
fav_48 = make_icon(48, icon_scale=0.65, card=True, solid_bg=False)
fav_96.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

# 9. favicon.svg (Vector wrapper with embedded high-res Google Wallet artwork)
buf = io.BytesIO()
fav_512 = make_icon(512, icon_scale=0.58, card=False, solid_bg=False)
fav_512.save(buf, format='PNG')
b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="115" fill="#16171c" stroke="#23252c" stroke-width="16"/>
  <image href="data:image/png;base64,{b64}" width="512" height="512" />
</svg>"""

with open('public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# 10. mask-icon.svg (Safari pinned tab icon)
with open('public/mask-icon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# Clean up test file if present
if os.path.exists('public/test_pwa512.png'):
    os.remove('public/test_pwa512.png')

print("Successfully generated all 10 icon variants from the user's Google Wallet assets!")
