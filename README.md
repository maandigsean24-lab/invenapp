# InvenApp

A simple offline inventory manager built with Expo / React Native.
Accounts and inventory are stored on the device (AsyncStorage).

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` (Android emulator) / `w` (web).

## Build an installable Android app (APK)

```bash
npm install -g eas-cli
eas login
eas build:configure      # first time only
eas build -p android --profile preview
```

EAS prints a download link for the `.apk` when the build finishes.
Use `--profile production` to build an `.aab` for the Play Store.
