# Capacitor Quick Start - TowRadar

## 🚀 Get Started (First Time)

### 1. Add Android Platform
```bash
npm run cap:add:android
```
Requires: Android Studio

### 2. Add iOS Platform
```bash
npm run cap:add:ios
```
Requires: Xcode (macOS only)

## 📝 Daily Workflow

### Make Code Changes
Edit your React/Next.js files as normal in VS Code

### Build & Sync to Native
```bash
npm run cap:sync
```

### Open Native IDE
```bash
npm run cap:android    # Opens Android Studio
npm run cap:ios        # Opens Xcode
```

### Or Run Directly
```bash
npm run cap:run:android    # Build and run on Android
npm run cap:run:ios        # Build and run on iOS
```

## 💡 Key Commands

| Command | Description |
|---------|-------------|
| `npm run build:mobile` | Build Next.js static export |
| `npm run cap:sync` | Build + sync to native projects |
| `npm run cap:android` | Sync + open Android Studio |
| `npm run cap:ios` | Sync + open Xcode |
| `npx cap sync` | Sync without building |
| `npx cap update` | Update native dependencies |
| `npx cap doctor` | Check Capacitor setup |

## 📱 Test Your App

### On Web (Dev Server)
```bash
npm run dev
# Visit http://localhost:3000
```

### On Android Emulator
1. Open Android Studio
2. Tools → Device Manager → Create Virtual Device
3. Click ▶️ Run

### On iOS Simulator
1. Open Xcode
2. Select simulator from dropdown
3. Click ▶️ Run

### On Physical Device
1. Enable Developer Mode on device
2. Connect via USB
3. Select device in IDE
4. Click ▶️ Run

## ⚙️ Environment Setup

### Android Requirements
- Android Studio
- Android SDK (API 22+)
- JDK 17+

### iOS Requirements (macOS only)
- Xcode (latest)
- CocoaPods: `sudo gem install cocoapods`

## 🔧 Useful Checks

### Verify Installation
```bash
npx cap --version              # Should show 7.4.4
npx cap doctor                 # Check environment
```

### View Capacitor Config
```bash
npx cap config                 # Show current config
```

### List Installed Plugins
```bash
npx cap ls                     # List all plugins
```

## 📚 Full Documentation

See `CAPACITOR_SETUP.md` for complete documentation including:
- Native feature usage
- Production builds
- Troubleshooting
- Advanced configuration

## 🎯 Common Issues

**Problem**: "Cannot find web assets"  
**Solution**: Run `npm run build:mobile` first

**Problem**: Android Studio won't open  
**Solution**: Install Android Studio first, then run `npm run cap:add:android`

**Problem**: Native features don't work in browser  
**Solution**: Expected! Use emulator/device or check `isNativeApp()`

**Problem**: Build fails after code changes  
**Solution**: Run `npm run cap:sync` after every code change

## ✨ Pro Tips

1. **Always build first**: Changes won't appear until you run `cap:sync`
2. **Use live reload**: Configure `server.url` in capacitor.config.ts for faster dev
3. **Test web first**: Debug in browser before testing on mobile
4. **Single codebase**: Same React code runs on web, iOS, and Android!
5. **Helper library**: Import from `@/lib/capacitor` for native features

## 🚀 Ready to Go!

```bash
# Add your platform
npm run cap:add:android

# Make changes to your code
# (edit files in components/, pages/, etc.)

# Sync and test
npm run cap:sync
npm run cap:android
```

That's it! Happy mobile app building! 🎉
