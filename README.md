# InvenApp

A simple offline inventory manager built with Expo / React Native.
Accounts and inventory are stored on the device (AsyncStorage).

## Features

- Create an account and log in; your session is remembered on this device.
- Keep each account's inventory separate, with item counts, total stock, and inventory value.
- Search and sort items, track low stock, and refresh inventory.
- Add, edit, adjust, and remove items with input validation and confirmation prompts.
- Change your account name and password from Settings.
- Set the quantity used to flag low-stock items.
- Export/share your inventory as CSV and clear all app data from Settings.
- View the app version and log out safely from Settings.

## Log in

Open the app and choose **Register** to create an account with your name, email, and password. Then log in with that email and password. There are no default or demo credentials; accounts and inventory are stored locally on the device.

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
