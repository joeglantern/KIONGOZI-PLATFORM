"""Branded Play Store QR code + poster for Kiongozi Chat.

Outputs (next to this script):
  kchat-playstore-qr.png      QR with the KChat icon in the middle (print / slides)
  kchat-playstore-poster.png  1080x1350 branded poster with the QR (social / print)
Run: python make_qr.py
"""
import os
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
URL = 'https://play.google.com/store/apps/details?id=com.kiongozi.mobile'
ICON = os.path.join(ROOT, 'kiongozi-mobile-working', 'assets', 'icon.png')
LOGO = os.path.join(ROOT, 'kiongozi-mobile-working', 'assets', 'kchat-logo.png')
FONTS = r'C:\kz-ota\node_modules\@expo-google-fonts\space-grotesk'

GREEN = (139, 186, 63)       # logo circle
DEEP = (16, 38, 20)          # dark green for QR modules / poster ground
ORANGE = (255, 138, 0)       # logo lettering
INK = (12, 12, 12)


def font(weight, size):
    name = {'bold': '700Bold/SpaceGrotesk_700Bold.ttf', 'medium': '500Medium/SpaceGrotesk_500Medium.ttf',
            'regular': '400Regular/SpaceGrotesk_400Regular.ttf'}[weight]
    try:
        return ImageFont.truetype(os.path.join(FONTS, name), size)
    except OSError:
        return ImageFont.truetype('segoeuib.ttf' if weight == 'bold' else 'segoeui.ttf', size)


def rounded(im, r):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1), r, fill=255)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def make_qr(size=1200):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=30, border=2)
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(radius_ratio=0.9),
        color_mask=SolidFillColorMask(back_color=(255, 255, 255), front_color=DEEP),
    ).convert('RGBA').resize((size, size), Image.NEAREST)

    # Centre badge: the app icon in a white rounded square (~22% of the code; H level tolerates 30%)
    badge = int(size * 0.22)
    pad = int(badge * 0.12)
    # Current KChat logo (the old icon.png still says "2027"), trimmed to its artwork
    icon = Image.open(LOGO).convert('RGBA')
    icon = icon.crop(icon.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox())
    icon.thumbnail((badge - pad * 2, badge - pad * 2), Image.LANCZOS)
    pad = ((badge - icon.width) // 2)
    pad_y = (badge - icon.height) // 2
    plate = Image.new('RGBA', (badge, badge), (0, 0, 0, 0))
    ImageDraw.Draw(plate).rounded_rectangle((0, 0, badge - 1, badge - 1), int(badge * 0.26), fill=(255, 255, 255, 255))
    plate.alpha_composite(icon, (pad, pad_y))
    img.alpha_composite(plate, ((size - badge) // 2, (size - badge) // 2))
    return img


def make_poster(qr):
    W, H = 1080, 1350
    bg = Image.new('RGBA', (W, H), DEEP + (255,))
    d = ImageDraw.Draw(bg)

    # Soft brand circles (echo of the logo's green disc) — flat shapes, no gradients
    d.ellipse((-260, -300, 520, 480), fill=(30, 70, 34, 255))
    d.ellipse((700, 980, 1380, 1660), fill=(30, 70, 34, 255))
    d.ellipse((860, 140, 960, 240), fill=ORANGE + (255,))

    # Logo
    logo = Image.open(LOGO).convert('RGBA')
    bbox = logo.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox()
    logo = logo.crop(bbox)
    logo.thumbnail((520, 250), Image.LANCZOS)
    bg.alpha_composite(logo, ((W - logo.width) // 2, 60))

    # Headline
    y = 60 + logo.height + 30
    for line, f, col in [('Pakua Kiongozi Chat', font('bold', 66), (255, 255, 255)),
                         ('Scan to get it on Google Play', font('regular', 36), (205, 225, 200))]:
        tw = d.textlength(line, font=f)
        d.text(((W - tw) / 2, y), line, font=f, fill=col)
        y += f.size + 16

    # QR card with soft shadow
    card = 560
    cx, cy = (W - card) // 2, y + 34
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((cx + 6, cy + 16, cx + card + 6, cy + card + 16), 48, fill=(0, 0, 0, 140))
    bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    plate = Image.new('RGBA', (card, card), (0, 0, 0, 0))
    ImageDraw.Draw(plate).rounded_rectangle((0, 0, card - 1, card - 1), 48, fill=(255, 255, 255, 255))
    q = qr.resize((card - 60, card - 60), Image.LANCZOS)
    plate.alpha_composite(q, (30, 30))
    bg.alpha_composite(plate, (cx, cy))

    # Footer pill
    y = cy + card + 48
    pill_text = 'Sauti yako. Jamii yako.'
    f = font('medium', 34)
    tw = d.textlength(pill_text, font=f)
    pw, ph = tw + 64, 66
    d.rounded_rectangle(((W - pw) / 2, y, (W + pw) / 2, y + ph), ph // 2, fill=GREEN + (255,))
    d.text(((W - tw) / 2, y + (ph - f.size) / 2 - 4), pill_text, font=f, fill=INK)
    small = font('regular', 26)
    note = 'play.google.com · com.kiongozi.mobile'
    d.text(((W - d.textlength(note, font=small)) / 2, y + ph + 26), note, font=small, fill=(150, 180, 150))
    return bg.convert('RGB')


def verify(path):
    import cv2
    img = cv2.imread(path)
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    return data


if __name__ == '__main__':
    qr = make_qr()
    qr_path = os.path.join(HERE, 'kchat-playstore-qr.png')
    qr.convert('RGB').save(qr_path, optimize=True)
    poster_path = os.path.join(HERE, 'kchat-playstore-poster.png')
    make_poster(qr).save(poster_path, optimize=True)
    for p in (qr_path, poster_path):
        got = verify(p)
        print(os.path.basename(p), 'scans OK' if got == URL else f'SCAN MISMATCH: {got!r}')
