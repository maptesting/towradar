# Capacitor Mobile App Setup - TowRadar

This document covers the complete Capacitor setup for TowRadar, following the [official Capacitor documentation](https://capacitorjs.com/docs/getting-started).

## ✅ Installation Complete

All Capacitor packages have been installed and configured according to the official documentation.

### Installed Packages

**Core Packages:**
- `@capacitor/core` (v7.4.4) - Core JavaScript runtime
- `@capacitor/cli` (v7.4.4) - Command line interface (dev dependency)
- `@capacitor/android` (v7.4.4) - Android platform
- `@capacitor/ios` (v7.4.4) - iOS platform

**Native Plugins:**
- `@capacitor/push-notifications` - Push notifications
- `@capacitor/geolocation` - GPS location services
- `@capacitor/haptics` - Haptic feedback (vibration)
- `@capacitor/share` - Native share dialog
- `@capacitor/splash-screen` - Splash screen control
- `@capacitor/status-bar` - Status bar styling
- `@capacitor/app` - App state and URL handling
- `@capacitor/network` - Network status monitoring

## 📁 Project Structure

```
towradar/
├── out/                        # Static export (webDir for Capacitor)
│   ├── index.html             # Must have <head> tag (✓ verified)
│   ├── manifest.json          # PWA manifest
│   └── ...                    # Other static assets
├── lib/
│   └── capacitor.ts           # Helper utilities for native features
├── capacitor.config.ts        # Capacitor configuration
├── next.config.js             # Next.js with output: 'export'
└── package.json               # Scripts for Capacitor workflow
```

## ⚙️ Configuration Files

### capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.towradar.app',
  appName: 'TowRadar',
  webDir: 'out',  // Next.js static export directory
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      spinnerColor: '#10b981'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

### next.config.js

Configured for static export as required by Capacitor:

```javascript
const nextConfig = {
  output: 'export',           // Required for Capacitor
  images: {
    unoptimized: true,        // Required for static export
  },
  assetPrefix: './',          // Relative paths for Capacitor
  trailingSlash: true,        // Proper routing in Capacitor
}
```

### package.json Scripts

```json
{
  "scripts": {
    "build:mobile": "next build",
    "cap:sync": "npm run build:mobile && npx cap sync",
    "cap:android": "npm run cap:sync && npx cap open android",
    "cap:ios": "npm run cap:sync && npx cap open ios",
    "cap:add:android": "npx cap add android",
    "cap:add:ios": "npx cap add ios",
    "cap:run:android": "npx cap run android",
    "cap:run:ios": "npx cap run ios"
  }
}
```

## 🚀 Capacitor Workflow (Per Official Docs)

### 1. Build Your Web Code

```bash
npm run build:mobile
```

This creates the `out/` directory with your static Next.js export.

### 2. Add Native Platforms (First Time Only)

**For Android:**
```bash
npm run cap:add:android
```
- Creates `android/` directory with Android Studio project
- Requires Android Studio installed
- Minimum SDK: API 22 (Android 5.1)

**For iOS:**
```bash
npm run cap:add:ios
```
- Creates `ios/` directory with Xcode workspace
- Requires Xcode (macOS only)
- Minimum iOS: 13.0

### 3. Sync Web Code to Native Projects

After building, sync copies your web bundle and updates native dependencies:

```bash
npx cap sync
```

Or use the combined script:
```bash
npm run cap:sync
```

This command:
- Copies `out/` contents to native projects
- Updates native plugin dependencies
- Installs CocoaPods (iOS)
- Updates Gradle dependencies (Android)

### 4. Open Native IDEs

**Android Studio:**
```bash
npm run cap:android
```

**Xcode:**
```bash
npm run cap:ios
```

### 5. Run on Devices/Emulators

**Android:**
```bash
npm run cap:run:android
```

**iOS:**
```bash
npm run cap:run:ios
```

Or use the native IDEs (Android Studio / Xcode) to run and debug.

## 🔄 Development Workflow

### Daily Development Cycle

1. **Edit your React/Next.js code** in VS Code (same as before)
2. **Test in browser first**: `npm run dev` (http://localhost:3000)
3. **When ready to test on mobile**:
   ```bash
   npm run cap:sync        # Build and sync to native
   npm run cap:android     # Open Android Studio
   # OR
   npm run cap:ios         # Open Xcode
   ```
4. **Run in emulator/device** from Android Studio or Xcode

### Making Changes

**The beauty of Capacitor**: You maintain a **single codebase**!

- Edit components in `components/`
- Edit pages in `pages/`
- Edit styles in `styles/`
- Use native features via `lib/capacitor.ts`

After changes:
```bash
npm run cap:sync
```

That's it! Your changes are now in the native apps.

## 📱 Native Features Usage

### Haptic Feedback

```typescript
import { hapticImpact, hapticNotification } from '@/lib/capacitor';

// On button press
await hapticImpact('light');  // or 'medium', 'heavy'

// On success/error
await hapticNotification('success');  // or 'warning', 'error'
```

### Geolocation

```typescript
import { getCurrentLocation, watchPosition } from '@/lib/capacitor';

// Get current position
const location = await getCurrentLocation();
console.log(location); // { lat: 35.2271, lng: -80.8431 }

// Watch position
const watchId = await watchPosition((position) => {
  console.log('New position:', position);
});

// Stop watching
clearWatch(watchId);
```

### Push Notifications

```typescript
import { requestPushPermissions } from '@/lib/capacitor';

const result = await requestPushPermissions();
if (result.granted) {
  console.log('Push notifications enabled!');
}
```

### Share Content

```typescript
import { shareContent } from '@/lib/capacitor';

await shareContent(
  'TowRadar Incident',
  'Check out this crash on I-85',
  'https://towradar.app/incident/123'
);
```

### Feature Detection

```typescript
import { isNativeApp, getPlatform, getAvailableFeatures } from '@/lib/capacitor';

if (isNativeApp()) {
  console.log('Running on:', getPlatform()); // 'ios' or 'android'
  
  const features = await getAvailableFeatures();
  if (features.pushNotifications) {
    // Enable push notifications UI
  }
}
```

## 🔧 Requirements

### For Android Development
- **Android Studio** (latest stable version)
- **Android SDK** (API 22+, target API 34 recommended)
- **Java Development Kit (JDK)** 17+
- **Gradle** (bundled with Android Studio)

### For iOS Development
- **macOS** (required for iOS development)
- **Xcode** (latest stable version)
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Account** (for device testing/distribution)

### Environment Variables (Optional)

```bash
# Custom Android Studio path
export CAPACITOR_ANDROID_STUDIO_PATH="/path/to/android-studio"

# Custom CocoaPods path
export CAPACITOR_COCOAPODS_PATH="/path/to/pod"
```

## 📦 Build for Production

### Android APK/AAB

```bash
npx cap build android
```

Or in Android Studio:
1. Build → Generate Signed Bundle / APK
2. Follow the wizard to create release build

### iOS IPA

```bash
npx cap build ios
```

Or in Xcode:
1. Product → Archive
2. Distribute App → App Store Connect

### Using Fastlane (Recommended)

For automated builds and deployment, see [Fastlane documentation](https://fastlane.tools/).

## 🔄 Updating Capacitor

Keep all Capacitor packages at the same version:

```bash
npm install @capacitor/core@latest @capacitor/android@latest @capacitor/ios@latest
npm install -D @capacitor/cli@latest

# Update plugins
npm install @capacitor/push-notifications@latest @capacitor/geolocation@latest
# ... etc
```

Then sync:
```bash
npx cap sync
```

## 🐛 Troubleshooting

### "Cannot find web assets directory"
- Make sure you ran `npm run build:mobile` first
- Verify `webDir: 'out'` in `capacitor.config.ts`
- Check that `out/index.html` exists

### "index.html is missing <head> tag"
- Capacitor requires a `<head>` tag to inject plugins
- Our `pages/_document.tsx` provides this ✓

### Build fails with TypeScript errors
- Ensure all Capacitor types are installed
- Run `npm install` to update dependencies
- Check that you're importing enums correctly (e.g., `ImpactStyle.Light`)

### Native features don't work in browser
- This is expected! Native features only work in native apps
- Use `isNativeApp()` to check platform
- Our helper library provides browser fallbacks where possible

### Android Studio can't find project
- Make sure you added Android: `npm run cap:add:android`
- Open the `android/` directory, not the root project
- Use "Open Existing Project" in Android Studio

### Xcode build errors
- Run `pod install` in the `ios/App` directory
- Clean build folder: Product → Clean Build Folder
- Ensure you have latest Xcode version

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Workflow Guide](https://capacitorjs.com/docs/basics/workflow)
- [Capacitor Config Reference](https://capacitorjs.com/docs/config)
- [iOS Deployment Guide](https://capacitorjs.com/docs/ios/deploying-to-app-store)
- [Android Deployment Guide](https://capacitorjs.com/docs/android/deploying-to-google-play)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Capacitor GitHub](https://github.com/ionic-team/capacitor)

## ✨ What's Next?

1. **Add platforms**: Run `npm run cap:add:android` or `npm run cap:add:ios`
2. **Create app icons**: Generate icon set (72px-512px) in `/public`
3. **Test on device**: Use Android Studio or Xcode to deploy
4. **Add touch optimizations**: Increase tap targets on key screens
5. **Configure push notifications**: Set up FCM (Android) and APNs (iOS)
6. **Customize splash screen**: Update splash screen images per platform

## 🎉 Success!

Your TowRadar app is now ready for mobile! You have:
- ✅ Capacitor 7.4.4 installed and configured
- ✅ Next.js configured for static export
- ✅ 9 native plugins ready to use
- ✅ Helper library for native features
- ✅ Scripts for streamlined workflow
- ✅ Single codebase for web, iOS, and Android

**Same code. Three platforms. One command to sync.**

That's the power of Capacitor! 🚀
