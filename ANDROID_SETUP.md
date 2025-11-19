# Android Studio Setup for TowRadar

## 🎯 You're Here: Android Platform Added! ✅

The Android native project has been created successfully in the `android/` directory with all 8 Capacitor plugins:
- ✅ @capacitor/app
- ✅ @capacitor/geolocation
- ✅ @capacitor/haptics
- ✅ @capacitor/network
- ✅ @capacitor/push-notifications
- ✅ @capacitor/share
- ✅ @capacitor/splash-screen
- ✅ @capacitor/status-bar

## 📥 Step 1: Install Android Studio

### Download
Visit: https://developer.android.com/studio

**Recommended:** Download the latest stable version

### Installation
1. Run the installer
2. Choose "Standard" installation
3. Accept licenses
4. Let it download SDK components (this takes 10-15 minutes)

### What Gets Installed
- Android Studio IDE
- Android SDK (Software Development Kit)
- Android Emulator
- Build tools and Gradle

## ⚙️ Step 2: Configure Android Studio (First Launch)

### SDK Setup
1. Open Android Studio
2. Click "More Actions" → "SDK Manager"
3. Ensure these are installed:
   - ✅ Android SDK Platform (API 34 or latest)
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
   - ✅ Intel/AMD Emulator Accelerator (for faster emulation)

### JDK Setup
Android Studio includes JDK 17+ by default. Verify:
1. Settings → Build, Execution, Deployment → Build Tools → Gradle
2. Gradle JDK should show "Embedded JDK" or "JDK 17+"

## 📱 Step 3: Create an Emulator (Virtual Device)

### Quick Setup
1. In Android Studio: Tools → Device Manager
2. Click "Create Virtual Device"
3. Choose a device (recommended: Pixel 5 or Pixel 6)
4. Select a system image:
   - **Recommended:** Tiramisu (API 33) or UpsideDownCake (API 34)
   - Download if needed (click download icon)
5. Click "Finish"

### Emulator Tips
- Choose "Pixel 5" for good balance of features and performance
- Enable "Hardware - GLES 2.0" for better graphics
- Allocate at least 2GB RAM for smooth performance

## 🚀 Step 4: Open Your TowRadar Android Project

### From Command Line
```bash
npm run cap:android
```

This will:
1. Run a final sync
2. Open Android Studio with your TowRadar project

### From Android Studio Directly
1. File → Open
2. Navigate to: `D:\AOS\Towing\towradar\towradar\android`
3. Click "OK"

### First Open (Gradle Sync)
Android Studio will run Gradle sync (builds project dependencies):
- This takes 2-5 minutes on first run
- Watch the bottom status bar for progress
- Wait for "Gradle sync finished" message

## ▶️ Step 5: Run Your App!

### On Emulator
1. Start your emulator: Tools → Device Manager → Click ▶️ on your device
2. Wait for emulator to boot (1-2 minutes first time)
3. In Android Studio toolbar, select your device from dropdown
4. Click the green ▶️ Run button
5. Your TowRadar app will install and launch!

### On Physical Device
1. **Enable Developer Options** on your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Developer Options will appear in Settings

2. **Enable USB Debugging**:
   - Settings → Developer Options → USB Debugging (ON)

3. **Connect via USB**:
   - Plug in your phone
   - Allow USB debugging when prompted
   - Device will appear in Android Studio's device dropdown

4. **Run**: Click the green ▶️ Run button

## 🔧 Troubleshooting

### "SDK not found"
- Open SDK Manager (Tools → SDK Manager)
- Install Android SDK Platform and Build-Tools

### "Gradle sync failed"
- Check internet connection (Gradle downloads dependencies)
- Try: Build → Clean Project, then Build → Rebuild Project
- Check Android Studio's Event Log for specific errors

### "Emulator won't start"
- Install Intel/AMD virtualization technology in BIOS
- On Windows: Ensure Hyper-V is disabled if using Intel HAXM
- Try: Tools → SDK Manager → SDK Tools → Install "Intel x86 Emulator Accelerator"

### "App crashes immediately"
- Check Logcat (bottom of Android Studio) for errors
- Common: Missing permissions or incorrect configuration

### "Can't find project"
- Make sure to open the `android` folder, not the root project
- Path should be: `...\towradar\towradar\android`

## 📊 Viewing Logs (Logcat)

While your app runs:
1. Click "Logcat" tab at bottom of Android Studio
2. Filter by package: `com.towradar.app`
3. View all console.log(), errors, and system messages

## 🔄 Making Changes

After editing your React/Next.js code:

```bash
# Rebuild and sync
npm run cap:sync

# Then in Android Studio, click Run again
```

**No need to close Android Studio!** Just sync and re-run.

## 🎨 Customizing Your Android App

### App Name
Edit: `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">TowRadar</string>
```

### App Icon
Replace icons in: `android/app/src/main/res/mipmap-*dpi/`
- ic_launcher.png (round icon)
- ic_launcher_round.png (square icon)

Use Android Studio's Image Asset tool:
- Right-click `res` → New → Image Asset
- Follow wizard to generate all sizes

### Splash Screen
Edit: `android/app/src/main/res/drawable/splash.png`

Or customize in `capacitor.config.ts`:
```typescript
SplashScreen: {
  backgroundColor: '#0f172a',
  spinnerColor: '#10b981'
}
```

### Permissions
Edit: `android/app/src/main/AndroidManifest.xml`

Already included:
- Internet
- Network state
- Location (fine and coarse)
- Vibrate (haptics)
- Post notifications

## 🚢 Building for Release

### Generate Signed APK/AAB

1. Build → Generate Signed Bundle / APK
2. Choose "Android App Bundle" (AAB) for Play Store
3. Create a keystore (first time):
   - Click "Create new..."
   - Choose a secure password
   - Save the .jks file securely!
4. Select "release" build variant
5. Click "Finish"

### Or via Command Line
```bash
npx cap build android --keystorepath=path/to/keystore.jks
```

### Important: Keep Your Keystore Safe!
- You'll need it for every app update
- If you lose it, you can't update your app on Play Store
- Back it up securely

## 📱 Publishing to Google Play Store

1. Create a developer account: https://play.google.com/console
   - One-time $25 fee
2. Create a new app in Play Console
3. Upload your AAB file
4. Fill in store listing (description, screenshots, etc.)
5. Set up pricing & distribution
6. Submit for review

### Required Assets
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (at least 2)
- Privacy policy URL
- Content rating questionnaire

## ✅ Checklist

- [ ] Android Studio installed
- [ ] SDK configured (API 33+)
- [ ] Emulator created
- [ ] Project opened in Android Studio
- [ ] Gradle sync successful
- [ ] App runs on emulator
- [ ] (Optional) App runs on physical device
- [ ] Logcat shows no errors
- [ ] Can make code changes and re-sync

## 🎉 You're Ready!

Once Android Studio is installed and your emulator is running, you can:
1. Run `npm run cap:android`
2. Click ▶️ Run in Android Studio
3. See your TowRadar app running natively on Android!

## 🆘 Need Help?

- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Android Studio Docs](https://developer.android.com/studio/intro)
- [Capacitor Discord](https://ionic.link/discord)

---

**Your native Android app is ready to build!** Just install Android Studio and you're good to go! 🚀
