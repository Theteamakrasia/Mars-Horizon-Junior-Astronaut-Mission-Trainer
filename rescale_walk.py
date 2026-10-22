from PIL import Image

# --- Tweak these ---
SCALE = 1.1          # Character scale multiplier
FOOT_PAD = 6         # Pixels of transparent space beneath feet
# -------------------

CELL_W = 480
CELL_H = 680

for name in ['walk-right', 'walk-left']:
    strip = Image.open(f'Assets/images/interior/sprite/{name}.png').convert('RGBA')
    new_strip = Image.new('RGBA', (CELL_W * 4, CELL_H), (0, 0, 0, 0))

    for i in range(4):
        cell = strip.crop((i * CELL_W, 0, (i + 1) * CELL_W, CELL_H))
        alpha = cell.getchannel('A')
        bbox = alpha.getbbox()

        if bbox is None:
            continue

        left, top, right, bottom = bbox
        char = cell.crop(bbox)
        cw, ch = char.size

        new_w = round(cw * SCALE)
        new_h = round(ch * SCALE)
        scaled = char.resize((new_w, new_h), Image.Resampling.LANCZOS)

        paste_x = (CELL_W - new_w) // 2
        paste_y = CELL_H - FOOT_PAD - new_h
        if paste_y < 0:
            paste_y = 0

        canvas = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
        canvas.paste(scaled, (paste_x, paste_y), scaled)
        new_strip.paste(canvas, (i * CELL_W, 0))

    new_strip.save(f'Assets/images/interior/sprite/{name}.webp', 'WEBP', quality=92, method=6)
    print(f'{name}.webp done — scale {SCALE}, foot_pad {FOOT_PAD}')
    strip.close()