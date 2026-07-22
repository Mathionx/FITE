from PIL import Image, ImageDraw
import math, os

OUT = "assets/icons"
os.makedirs(OUT, exist_ok=True)

ACCENT = (20, 99, 243)      # #1463F3 oneui blue
ACCENT2 = (91, 141, 246)

def rounded_bg(size, radius_ratio=0.22, colors=(ACCENT, ACCENT2)):
    img = Image.new("RGBA", (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    # simple vertical gradient
    top, bottom = colors
    for y in range(size):
        t = y / size
        r = int(top[0] + (bottom[0]-top[0])*t)
        g = int(top[1] + (bottom[1]-top[1])*t)
        b = int(top[2] + (bottom[2]-top[2])*t)
        draw.line([(0,y),(size,y)], fill=(r,g,b,255))
    mask = Image.new("L", (size,size), 0)
    mdraw = ImageDraw.Draw(mask)
    radius = int(size*radius_ratio)
    mdraw.rounded_rectangle([0,0,size,size], radius=radius, fill=255)
    out = Image.new("RGBA",(size,size),(0,0,0,0))
    out.paste(img,(0,0),mask)
    return out

def main_icon(size):
    img = rounded_bg(size)
    d = ImageDraw.Draw(img)
    # Stylised "F" with a flame notch, bold rounded strokes, white
    s = size
    w = s*0.11
    x0 = s*0.30
    y0 = s*0.22
    y1 = s*0.78
    # vertical stroke of F
    d.rounded_rectangle([x0, y0, x0+w, y1], radius=w/2, fill="white")
    # top arm
    d.rounded_rectangle([x0, y0, x0+s*0.40, y0+w], radius=w/2, fill="white")
    # middle arm (shorter, like a fist knuckle accent)
    d.rounded_rectangle([x0, y0+s*0.24, x0+s*0.30, y0+s*0.24+w], radius=w/2, fill="white")
    # flame dot accent bottom right
    fx, fy, fr = s*0.72, s*0.70, s*0.10
    d.ellipse([fx-fr, fy-fr, fx+fr, fy+fr], fill=(255, 199, 89, 255))
    return img

def save(img, name):
    img.save(f"{OUT}/{name}")

for size in [72, 96, 128, 144, 152, 192, 384, 512]:
    save(main_icon(size), f"icon-{size}.png")

# maskable (extra padding so safe-zone works)
def maskable(size):
    img = Image.new("RGBA",(size,size),(0,0,0,0))
    inner = main_icon(int(size*0.7))
    bg = rounded_bg(size, radius_ratio=0)
    img.paste(bg,(0,0))
    off = (size-inner.width)//2
    img.paste(inner,(off,off),inner)
    return img

save(maskable(512), "icon-maskable-512.png")
save(maskable(192), "icon-maskable-192.png")

# ---------------- Mini app icons (rounded square + simple glyph) ----------------
def app_icon(name, glyph_fn, colors):
    size = 192
    img = rounded_bg(size, 0.28, colors)
    d = ImageDraw.Draw(img)
    glyph_fn(d, size)
    save(img, f"app-{name}.png")

def g_sports(d, s):
    d.ellipse([s*0.18,s*0.18,s*0.82,s*0.82], outline="white", width=int(s*0.06))
    d.line([s*0.5,s*0.10,s*0.5,s*0.90], fill="white", width=int(s*0.045))
    d.line([s*0.10,s*0.5,s*0.90,s*0.5], fill="white", width=int(s*0.045))

def g_foods(d, s):
    d.line([s*0.35,s*0.18,s*0.35,s*0.48], fill="white", width=int(s*0.045))
    d.line([s*0.28,s*0.18,s*0.28,s*0.34], fill="white", width=int(s*0.035))
    d.line([s*0.42,s*0.18,s*0.42,s*0.34], fill="white", width=int(s*0.035))
    d.line([s*0.35,s*0.48,s*0.35,s*0.82], fill="white", width=int(s*0.045))
    d.pieslice([s*0.55,s*0.16,s*0.78,s*0.40], 200, 160, fill="white")
    d.line([s*0.66,s*0.16,s*0.66,s*0.82], fill="white", width=int(s*0.045))

def g_gallery(d, s):
    d.rounded_rectangle([s*0.16,s*0.22,s*0.84,s*0.78], radius=s*0.08, outline="white", width=int(s*0.045))
    d.ellipse([s*0.28,s*0.34,s*0.40,s*0.46], fill="white")
    d.polygon([(s*0.20,s*0.72),(s*0.42,s*0.50),(s*0.58,s*0.66),(s*0.70,s*0.54),(s*0.80,s*0.72)], fill="white")

def g_checklist(d, s):
    d.rounded_rectangle([s*0.20,s*0.16,s*0.80,s*0.84], radius=s*0.10, outline="white", width=int(s*0.045))
    d.line([s*0.32,s*0.40,s*0.44,s*0.52], fill="white", width=int(s*0.05))
    d.line([s*0.44,s*0.52,s*0.68,s*0.30], fill="white", width=int(s*0.05))
    d.line([s*0.32,s*0.64,s*0.68,s*0.64], fill="white", width=int(s*0.045))

def g_notes(d, s):
    d.rounded_rectangle([s*0.22,s*0.16,s*0.78,s*0.84], radius=s*0.06, outline="white", width=int(s*0.04))
    for i in range(3):
        y = s*0.36 + i*s*0.14
        d.line([s*0.32,y,s*0.68,y], fill="white", width=int(s*0.03))

def g_money(d, s):
    d.ellipse([s*0.16,s*0.16,s*0.84,s*0.84], outline="white", width=int(s*0.05))
    d.line([s*0.5,s*0.28,s*0.5,s*0.72], fill="white", width=int(s*0.04))
    d.arc([s*0.36,s*0.30,s*0.62,s*0.50], 200, 380, fill="white", width=int(s*0.035))
    d.arc([s*0.38,s*0.50,s*0.64,s*0.70], 20, 200, fill="white", width=int(s*0.035))

def g_settings(d, s):
    cx, cy, r = s*0.5, s*0.5, s*0.14
    d.ellipse([cx-r,cy-r,cx+r,cy+r], outline="white", width=int(s*0.045))
    for i in range(8):
        ang = i * (360/8)
        rad = math.radians(ang)
        x1 = cx + math.cos(rad)*s*0.24
        y1 = cy + math.sin(rad)*s*0.24
        x2 = cx + math.cos(rad)*s*0.34
        y2 = cy + math.sin(rad)*s*0.34
        d.line([x1,y1,x2,y2], fill="white", width=int(s*0.045))

app_icon("sports", g_sports, ((240,90,90),(255,140,120)))
app_icon("foods", g_foods, ((242,169,59),(255,198,92)))
app_icon("gallery", g_gallery, ((124,92,252),(164,140,255)))
app_icon("checklist", g_checklist, ((44,182,125),(79,214,172)))
app_icon("notes", g_notes, ((91,141,246),(124,168,255)))
app_icon("money", g_money, ((240,80,142),(255,138,182)))
app_icon("settings", g_settings, ((100,105,115),(140,145,155)))

print("done", os.listdir(OUT))
