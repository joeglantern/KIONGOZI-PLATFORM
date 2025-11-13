# Quick Implementation Guide: Adding Kiongozi Logo to Mobile App

## Current Status
- Mobile app found: React Native + Expo
- Current assets: Placeholder icons (blue circles)
- Logo location: `/Users/qc/Desktop/Files/KIONGOZI-PLATFORM/public/Kiongozi.png` (861x580px)

---

## Implementation Checklist

### Create Logo Assets (Use Canva - FREE & EASY)
- [ ] Visit https://www.canva.com/
- [ ] Create custom 1024x1024px design
- [ ] Add white background
- [ ] Place Kiongozi.png in center
- [ ] Export as PNG (recommended filename: `splash-icon.png`)
- [ ] Create copy for app icon (filename: `icon.png`)
- [ ] Create copy for Android adaptive icon (filename: `adaptive-icon.png`)

### Replace Mobile App Assets
- [ ] Navigate to: `/Users/qc/Desktop/Files/KIONGOZI-PLATFORM/kiongozi-mobile-working/assets/`
- [ ] Backup current files:
  ```bash
  mkdir backup && cp *.png backup/
  ```
- [ ] Replace:
  - `splash-icon.png` (1024x1024)
  - `icon.png` (1024x1024)
  - `adaptive-icon.png` (1024x1024)

### Test the Changes
- [ ] Navigate to project: `cd /Users/qc/Desktop/Files/KIONGOZI-PLATFORM/kiongozi-mobile-working`
- [ ] Install dependencies: `npm install`
- [ ] Start dev environment: `npm run start`
- [ ] Test on iOS: `npm run ios`
- [ ] Test on Android: `npm run android`
- [ ] Verify splash screen displays logo
- [ ] Verify app icon appears on home screen
- [ ] Check app launches successfully

### Optional: Update In-App Logo Placeholders
- [ ] Replace blue circles in LoginScreen (28x28px)
- [ ] Replace blue circles in MobileMenu (40x40px)
- [ ] Replace blue circles in ChatScreen
- [ ] Test all screens display logo correctly

### Build for Distribution
- [ ] Test build: `eas build --platform android`
- [ ] Production build iOS: `eas build --platform ios`
- [ ] Production build Android: `eas build --platform android --auto-submit`

---

## File Locations Summary

```
KIONGOZI-PLATFORM/
├── public/
│   └── Kiongozi.png (CURRENT LOGO - 861x580px)
│
└── kiongozi-mobile-working/
    ├── app.json (Splash config)
    ├── assets/ (Replace these files)
    │   ├── icon.png (1024x1024) ← APP ICON
    │   ├── splash-icon.png (1024x1024) ← SPLASH SCREEN
    │   ├── adaptive-icon.png (1024x1024) ← ANDROID ICON
    │   └── favicon.png (48x48)
    │
    └── src/
        ├── screens/
        │   ├── LoginScreen.tsx (Has placeholder logo)
        │   └── ChatScreen.tsx (Has placeholder logo)
        └── components/
            ├── MobileMenu.tsx (Has placeholder logo)
            └── EnhancedAIMessage.tsx (Has placeholder logo)
```

---

## Image Size Requirements

| Component | Size | Format | Notes |
|-----------|------|--------|-------|
| Splash Screen | 1024x1024 | PNG | Recommended, use `contain` mode |
| App Icon | 1024x1024 | PNG | For app stores & home screen |
| Android Icon | 1024x1024 | PNG | Adaptive icon foreground |
| In-App Small | 28x28, 40x40 | PNG | Optional, for login/menu |

---

## Recommended Tool: Canva

Why Canva?
- Free version available
- No design skills needed
- Simple drag-and-drop interface
- Automatic dimension handling
- Quick PNG export

Steps:
1. Go to canva.com
2. Click "Create a design"
3. Choose custom size (1024x1024)
4. Add white background
5. Upload Kiongozi.png
6. Center it
7. Download as PNG

Time estimate: 10 minutes

---

## Configuration Files to Update

### app.json (Lines 11-15)
Already correctly configured:
```json
"splash": {
  "image": "./assets/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#ffffff"
}
```

### app.json (Lines 7, 27-29)
Verify these paths:
```json
"icon": "./assets/icon.png",
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  }
}
```

---

## Expected Results After Implementation

1. **Splash Screen**: Kiongozi logo appears on app startup (white background)
2. **App Icon**: Logo visible on home screen and app store
3. **Android**: Adaptive icon displays with logo (Android 8.0+)
4. **In-App**: All screens show the logo appropriately
5. **Brand Consistency**: Mobile app matches web branding

---

## Troubleshooting

### Logo appears pixelated
- Ensure source image is 1024x1024 or larger
- Check PNG is not compressed too much
- Verify no scaling up of smaller image

### Splash screen doesn't update
- Clear cache: `expo prebuild --clean`
- Rebuild: `eas build --platform android --no-cache`

### Logo has white borders (Android)
- This is normal with `contain` mode
- Logo won't be cropped, just centered
- To remove borders: use `cover` mode (may crop logo)

### File size too large
- Compress PNG without losing quality
- Use online tools: tinypng.com or imagecompressor.com
- Target: <100 KB for splash, <30 KB for icon

---

## Timeline Estimate

| Task | Time |
|------|------|
| Create logo in Canva | 10 min |
| Replace asset files | 5 min |
| Run first test build | 10 min |
| Debug/fix issues | 10-20 min |
| Final production build | 5-30 min (varies) |
| **TOTAL** | **40-75 min** |

---

## Next Document
See `MOBILE_APP_LOGO_ANALYSIS.md` for detailed technical information.
