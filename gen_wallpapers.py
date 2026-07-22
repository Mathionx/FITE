from PIL import Image, ImageDraw, ImageFilter
import random, math, os

OUT = "assets/wallpapers"
os.makedirs(OUT, exist_ok=True)

W, H = 720, 1280

PALETTES = [
    ("wall-1", [(20,60,220),(90,150,255),(10,20,60)]),      # deep blue
    ("wall-2", [(10,140,110),(120,230,190),(5,40,35)]),      # mint
    ("wall-3", [(255,110,90),(255,190,120),(60,15,20)]),     # coral sunset
    ("wall-4", [(110,70,230),(190,140,255),(20,10,45)]),     # violet
    ("wall-5", [(245,160,30),(255,220,140),(45,25,5)]),      # sunshine
    ("wall-6", [(230,70,130),(255,160,200),(40,10,25)]),     # rose
    ("wall-7", [(30,35,45),(70,90,120),(5,5,10)]),           # slate night
    ("wall-8", [(15,120,150),(140,220,235),(5,30,40)]),      # teal sky
]

def make_wallpaper(name, colors, seed):
    random.seed(seed)
    img = Image.new("RGB", (W, H), colors[-1])
    draw = ImageDraw.Draw(img)

    # vertical base gradient between two darker tones
    top, bottom = colors[-1], tuple(max(0,c-10) for c in colors[-1])
    for y in range(H):
        t = y / H
        r = int(top[0] + (bottom[0]-top[0])*t)
        g = int(top[1] + (bottom[1]-top[1])*t)
        b = int(top[2] + (bottom[2]-top[2])*t)
        draw.line([(0,y),(W,y)], fill=(r,g,b))

    # soft blurred color blobs (organic, non-repeating, static)
    blob_layer = Image.new("RGBA", (W, H), (0,0,0,0))
    bd = ImageDraw.Draw(blob_layer)
    for i in range(6):
        c = random.choice(colors[:2])
        cx = random.randint(0, W)
        cy = random.randint(0, H)
        r = random.randint(int(W*0.25), int(W*0.55))
        alpha = random.randint(120, 200)
        bd.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(c[0], c[1], c[2], alpha))
    blob_layer = blob_layer.filter(ImageFilter.GaussianBlur(radius=90))
    img = Image.alpha_composite(img.convert("RGBA"), blob_layer)
    img = img.convert("RGB")

    # gentle top+bottom darkening for legibility of overlaid UI text (static, not animated)
    grad = Image.new("L", (1, H), 0)
    for y in range(H):
        d_top = max(0, 1 - y/(H*0.35))
        d_bot = max(0, 1 - (H-y)/(H*0.4))
        grad.putpixel((0,y), int(max(d_top, d_bot) * 110))
    grad = grad.resize((W, H))
    dark = Image.new("RGB", (W,H), (0,0,0))
    img = Image.composite(dark, img, grad)

    img.save(f"{OUT}/{name}.jpg", quality=82, optimize=True)
    print("saved", name)

for i, (name, colors) in enumerate(PALETTES):
    make_wallpaper(name, colors, seed=i*17+3)

print(os.listdir(OUT))
