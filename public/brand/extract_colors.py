import os
from PIL import Image
from collections import Counter

img_path = "/Users/buloy/projects/watch-alley/drive-assets/PNG/Copy of DP FLAT.png"
if not os.path.exists(img_path):
    print("Error: Image path does not exist.")
    exit(1)

# Open image
img = Image.open(img_path)
img = img.convert("RGBA")
pixels = list(img.getdata())

# Filter out background (fully transparent or very dark black background)
colors = []
for r, g, b, a in pixels:
    if a > 50:  # Not transparent
        # Skip pure black background if present
        if r < 15 and g < 15 and b < 15:
            continue
        colors.append((r, g, b))

# Get most common colors
counter = Counter(colors)
common = counter.most_common(10)

print("Most common colors (RGB and HEX):")
for rgb, count in common:
    hex_val = "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])
    print(f"RGB: {rgb} | HEX: {hex_val.upper()} | Percentage: {count / len(colors) * 100:.2f}%")
