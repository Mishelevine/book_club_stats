"""Encode the original mascot and generated blink frame as a quiet, transparent GIF.

Requires Pillow only when regenerating the asset; the website has no runtime dependencies.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SIZE = 128
original = Image.open(ROOT / "assets/book-mascot.png").convert("RGBA")
blink = Image.open(ROOT / "assets/book-mascot-blink.png").convert("RGBA")
if original.size != blink.size:
    raise ValueError("Animation source frames must share the same canvas dimensions.")

# Nearest-neighbor scaling and integer movement preserve the pixel-art edges.
sprites = [image.resize((SIZE, SIZE), Image.Resampling.NEAREST) for image in [original, blink]]
palette_source = Image.new("RGB", (SIZE * 2, SIZE))
for index, sprite in enumerate(sprites):
    palette_source.paste(sprite.convert("RGB"), (index * SIZE, 0))
palette = palette_source.quantize(colors=127, dither=Image.Dither.NONE)
colors = [0, 0, 0] + palette.getpalette()[:127 * 3]
colors += [0] * (768 - len(colors))

# Frame, vertical offset, duration in milliseconds. One short blink per 6.9 seconds.
sequence = [
    (0, 0, 1600), (0, -1, 220), (0, -2, 500), (0, -1, 220),
    (0, 0, 900), (1, 0, 120), (0, 0, 1200),
    (0, 1, 220), (0, 2, 500), (0, 1, 220), (0, 0, 1200),
]
frames = []
durations = []
for sprite_index, offset, duration in sequence:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(sprites[sprite_index], (0, offset))
    indexed = canvas.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
    pixels = bytes(color + 1 if alpha >= 128 else 0 for color, alpha in zip(indexed.tobytes(), canvas.getchannel("A").tobytes()))
    frame = Image.frombytes("P", canvas.size, pixels)
    frame.putpalette(colors)
    frames.append(frame)
    durations.append(duration)

destination = ROOT / "assets/book-mascot.gif"
frames[0].save(destination, save_all=True, append_images=frames[1:], duration=durations, loop=0, transparency=0, disposal=2, optimize=False)

with Image.open(destination) as animation:
    assert animation.n_frames == len(sequence)
    assert animation.info["loop"] == 0
    assert animation.info["transparency"] == 0
    total_duration = 0
    for index in range(animation.n_frames):
        animation.seek(index)
        total_duration += animation.info["duration"]
    assert total_duration == sum(durations)
    print(f"GIF ready: {animation.n_frames} frames, {total_duration / 1000:.2f}s loop, {destination.stat().st_size:,} bytes.")
