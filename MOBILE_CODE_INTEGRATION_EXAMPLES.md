# Code Integration Examples: Replacing Logo Placeholders

This document provides actual code examples for replacing the blue circle placeholders with the real Kiongozi logo.

---

## Current Placeholder Pattern

All screens currently use this pattern:

```javascript
// In styles
aiIcon: {
  width: 28,
  height: 28,
  backgroundColor: '#3b82f6', // Blue placeholder
  borderRadius: 14,
  justifyContent: 'center',
  alignItems: 'center',
}

// In JSX
<View style={styles.aiIcon} />
```

---

## Option 1: Update Color Only (Minimal Change)

If you want to keep the placeholder but change the color to match the Kiongozi brand:

### Change 1: Update Color to Orange
```javascript
// File: src/screens/LoginScreen.tsx (around line 382)

// BEFORE:
aiIcon: {
  width: 28,
  height: 28,
  backgroundColor: '#3b82f6', // Blue
  borderRadius: 14,
}

// AFTER:
aiIcon: {
  width: 28,
  height: 28,
  backgroundColor: '#FFA500', // Orange (Kiongozi brand color)
  borderRadius: 14,
}
```

Apply to:
- `src/screens/LoginScreen.tsx` (line 382)
- `src/components/MobileMenu.tsx` (size 40x40, radius 20)
- `src/screens/ChatScreen.tsx`
- `src/components/EnhancedAIMessage.tsx`

---

## Option 2: Use Image Component with Real Logo (Recommended)

This requires creating small logo versions but gives professional results.

### Step 1: Create Small Logo Assets

First, create these image files and place in `/assets/`:
- `logo-28.png` (28x28px)
- `logo-40.png` (40x40px)  
- `logo-96.png` (96x96px)

### Step 2: Update LoginScreen

```javascript
// File: src/screens/LoginScreen.tsx

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  Image,  // ADD THIS IMPORT
} from 'react-native';
// ... rest of imports

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  // ... existing code ...

  return (
    <SafeAreaView style={styles.container}>
      {/* ... existing code ... */}
      <Animated.View style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* CHANGE: Replace View with Image */}
            <Image
              source={require('../assets/logo-28.png')}
              style={styles.aiIcon}
            />
            <Text style={styles.title}>
              {isSignUp ? 'Create an account' : 'Sign in'}
            </Text>
          </View>
        </View>
        {/* ... rest of component ... */}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  
  // UPDATE: Remove borderRadius and backgroundColor, add resizeMode
  aiIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    // REMOVE: backgroundColor: '#3b82f6',
    // REMOVE: borderRadius: 14,
  },
  
  // ... rest of styles ...
});
```

### Step 3: Update MobileMenu

```javascript
// File: src/components/MobileMenu.tsx

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
  Image,  // ADD THIS IMPORT
} from 'react-native';
// ... rest of imports

export default function MobileMenu({
  visible,
  onClose,
  darkMode,
  // ... other props ...
}: MobileMenuProps) {
  // ... existing code ...

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      // ... other props ...
    >
      {/* ... existing modal content ... */}
      
      {/* Header section - find and update */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <View style={styles.logoContainer}>
          {/* CHANGE: Replace View with Image */}
          <Image
            source={require('../assets/logo-40.png')}
            style={styles.aiIcon}
          />
          <View>
            <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>
              Kiongozi<Text style={styles.platformText}>Platform</Text>
            </Text>
            <Text style={[styles.headerSubtitle, darkMode && styles.headerSubtitleDark]}>
              Green & Digital Transition AI
            </Text>
          </View>
        </View>
        {/* ... rest of header ... */}
      </View>
      
      {/* ... rest of component ... */}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  
  // UPDATE: Remove backgroundColor and borderRadius for 40x40 icon
  aiIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    // REMOVE: backgroundColor: '#3b82f6',
    // REMOVE: borderRadius: 20,
  },
  
  // ... rest of styles ...
});
```

### Step 4: Update ChatScreen

```javascript
// File: src/screens/ChatScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Image,  // ADD THIS IMPORT
} from 'react-native';
// ... rest of imports

export default function ChatScreen() {
  // ... existing code ...

  // Find the header with aiIcon and update:
  // <View style={styles.aiIcon} />
  // Change to:
  // <Image source={require('../assets/logo-28.png')} style={styles.aiIcon} />
  
  const styles = StyleSheet.create({
    // ... existing styles ...
    aiIcon: {
      width: 28,  // adjust as needed
      height: 28,
      resizeMode: 'contain',
      // REMOVE: backgroundColor: '#3b82f6',
    },
    // ... rest of styles ...
  });
}
```

### Step 5: Update EnhancedAIMessage

```javascript
// File: src/components/EnhancedAIMessage.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,  // ADD THIS IMPORT
} from 'react-native';
// ... rest of imports

export default function EnhancedAIMessage({
  message,
  darkMode = false,
  // ... other props ...
}: EnhancedAIMessageProps) {
  // ... existing code ...

  return (
    <View style={styles.messageContainer}>
      {/* Find and update aiIcon usage */}
      {/* BEFORE: <View style={styles.aiIcon}> */}
      {/* AFTER: */}
      <Image
        source={require('../assets/logo-28.png')}
        style={styles.aiIcon}
      />
      
      {/* ... rest of component ... */}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  aiIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    // REMOVE: backgroundColor styling
  },
  // ... rest of styles ...
});
```

---

## Option 3: Create Reusable Logo Component

For the cleanest implementation, create a reusable component:

### Create Logo Component

```typescript
// File: src/components/KiongozLogo.tsx

import React from 'react';
import {
  Image,
  ImageStyle,
  StyleSheet,
  View,
} from 'react-native';

interface KiongozLogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: ImageStyle;
}

const LOGO_SIZES = {
  small: { width: 28, height: 28 },    // LoginScreen, ChatScreen
  medium: { width: 40, height: 40 },   // MobileMenu
  large: { width: 96, height: 96 },    // Splash screens, welcome
};

export default function KiongozLogo({ 
  size = 'small', 
  style 
}: KiongozLogoProps) {
  const logoSize = LOGO_SIZES[size];

  return (
    <View style={[logoSize, style]}>
      <Image
        source={require('../assets/logo-' + LOGO_SIZES[size].width + '.png')}
        style={{
          width: logoSize.width,
          height: logoSize.height,
          resizeMode: 'contain',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // No styles needed
});
```

### Use Reusable Component

```javascript
// In LoginScreen.tsx
import KiongozLogo from '../components/KiongozLogo';

export default function LoginScreen() {
  // ...
  return (
    <View style={styles.logoContainer}>
      <KiongozLogo size="small" />
      <Text style={styles.title}>Sign in</Text>
    </View>
  );
}

// In MobileMenu.tsx
import KiongozLogo from '../components/KiongozLogo';

export default function MobileMenu() {
  // ...
  return (
    <View style={styles.logoContainer}>
      <KiongozLogo size="medium" />
      <View>
        <Text>Kiongozi<Text>Platform</Text></Text>
      </View>
    </View>
  );
}
```

---

## Checklist for Code Changes

### Minimal Approach (Color Only)
- [ ] Update `aiIcon` color in LoginScreen.tsx
- [ ] Update `aiIcon` color in MobileMenu.tsx
- [ ] Update `aiIcon` color in ChatScreen.tsx
- [ ] Update `aiIcon` color in EnhancedAIMessage.tsx
- [ ] Test app on simulator
- [ ] Commit changes to git

### Full Approach (Real Logo Images)
- [ ] Create logo-28.png, logo-40.png, logo-96.png
- [ ] Add `Image` import to all affected files
- [ ] Replace `<View style={styles.aiIcon} />` with `<Image source={...} />`
- [ ] Update all `aiIcon` styles (remove backgroundColor, borderRadius)
- [ ] Update in: LoginScreen, MobileMenu, ChatScreen, EnhancedAIMessage
- [ ] Create KiongozLogo reusable component (optional but recommended)
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Commit changes to git

---

## Git Commands for Tracking Changes

```bash
# After making changes
cd /Users/qc/Desktop/Files/KIONGOZI-PLATFORM/kiongozi-mobile-working

# Stage new logo files
git add assets/logo-*.png

# Stage modified source files
git add src/screens/LoginScreen.tsx
git add src/components/MobileMenu.tsx
git add src/screens/ChatScreen.tsx
git add src/components/EnhancedAIMessage.tsx
git add src/components/KiongozLogo.tsx  # if created

# Commit
git commit -m "Add Kiongozi logo to mobile app UI components"

# Push to remote
git push origin main
```

---

## Testing Code Changes

```javascript
// In ChatScreen.tsx or any test component, you can verify images load:

useEffect(() => {
  Image.getSize(
    require('../assets/logo-28.png'),
    (width, height) => {
      console.log('Logo 28x28 size:', width, height);
    },
    (error) => {
      console.error('Error loading logo:', error);
    }
  );
}, []);
```

---

## Debugging Tips

### Logo doesn't appear
1. Verify file path is correct
2. Check file exists: `ls -la assets/logo-*.png`
3. Rebuild app: `npm start -- --reset-cache`
4. Check React Native logs for image loading errors

### Logo looks blurry
1. Ensure source PNG is high quality
2. Don't resize from smaller version
3. Use `resizeMode: 'contain'` (not 'stretch')

### Build fails after image changes
1. Clear cache: `expo prebuild --clean`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Rebuild: `npm start`

---

## Performance Considerations

Using local image assets (as recommended):
- Images bundled with app = no network calls
- Faster app launch
- Reduced bandwidth usage
- Works offline

File size impact:
- Three small PNGs (~5-10 KB each) = ~20 KB total
- Negligible impact on app bundle size

---

## Next Steps

1. Choose Option 1, 2, or 3 above
2. Create/optimize logo assets
3. Make code changes
4. Test thoroughly
5. Commit and push changes
6. Deploy with `eas build`
