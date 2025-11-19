# Capacitor Setup Script for TowRadar

Write-Host "🚀 Setting up Capacitor for TowRadar..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Capacitor core packages
Write-Host "📦 Installing Capacitor core packages..." -ForegroundColor Yellow
npm install @capacitor/core @capacitor/cli

# Step 2: Install platform packages
Write-Host "📱 Installing iOS and Android platforms..." -ForegroundColor Yellow
npm install @capacitor/android @capacitor/ios

# Step 3: Install native plugins
Write-Host "🔌 Installing Capacitor plugins..." -ForegroundColor Yellow
npm install @capacitor/push-notifications
npm install @capacitor/geolocation
npm install @capacitor/haptics
npm install @capacitor/share
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/app
npm install @capacitor/network
npm install @capacitor/local-notifications

# Step 4: Update Next.js config for static export
Write-Host "⚙️  Updating Next.js config for Capacitor..." -ForegroundColor Yellow

$nextConfigContent = @"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable static export for Capacitor
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Ensure assets work in Capacitor
  assetPrefix: './',
  trailingSlash: true,
}

module.exports = nextConfig
"@

Set-Content -Path "next.config.js" -Value $nextConfigContent

Write-Host "✅ Next.js config updated for static export" -ForegroundColor Green
Write-Host ""

# Step 5: Update package.json scripts
Write-Host "📝 Adding Capacitor scripts to package.json..." -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json

# Add new scripts
if (-not $packageJson.scripts) {
    $packageJson.scripts = @{}
}

$packageJson.scripts | Add-Member -Name "build:mobile" -Value "next build" -MemberType NoteProperty -Force
$packageJson.scripts | Add-Member -Name "cap:sync" -Value "npm run build:mobile && npx cap sync" -MemberType NoteProperty -Force
$packageJson.scripts | Add-Member -Name "cap:android" -Value "npm run cap:sync && npx cap open android" -MemberType NoteProperty -Force
$packageJson.scripts | Add-Member -Name "cap:ios" -Value "npm run cap:sync && npx cap open ios" -MemberType NoteProperty -Force
$packageJson.scripts | Add-Member -Name "cap:add:android" -Value "npx cap add android" -MemberType NoteProperty -Force
$packageJson.scripts | Add-Member -Name "cap:add:ios" -Value "npx cap add ios" -MemberType NoteProperty -Force

$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"

Write-Host "✅ Package.json updated with Capacitor scripts" -ForegroundColor Green
Write-Host ""

# Step 6: Create .gitignore entries
Write-Host "📄 Updating .gitignore..." -ForegroundColor Yellow

$gitignoreEntries = @"

# Capacitor
android/
ios/
out/
"@

Add-Content -Path ".gitignore" -Value $gitignoreEntries

Write-Host "✅ .gitignore updated" -ForegroundColor Green
Write-Host ""

# Step 7: Build and initialize Capacitor
Write-Host "🔨 Building Next.js for Capacitor..." -ForegroundColor Yellow
npm run build:mobile

Write-Host ""
Write-Host "🎉 Capacitor setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Add Android platform: npm run cap:add:android" -ForegroundColor White
Write-Host "  2. Add iOS platform: npm run cap:add:ios" -ForegroundColor White
Write-Host "  3. Sync and open Android: npm run cap:android" -ForegroundColor White
Write-Host "  4. Sync and open iOS: npm run cap:ios" -ForegroundColor White
Write-Host ""
Write-Host "For ongoing development:" -ForegroundColor Cyan
Write-Host "  - Make changes to your React/Next.js code" -ForegroundColor White
Write-Host "  - Run: npm run cap:sync" -ForegroundColor White
Write-Host "  - Test in Android Studio or Xcode" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important:" -ForegroundColor Yellow
Write-Host "  - You'll need Android Studio for Android development" -ForegroundColor White
Write-Host "  - You'll need Xcode (macOS only) for iOS development" -ForegroundColor White
Write-Host ""
