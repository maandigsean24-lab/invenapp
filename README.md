# InvenApp

An inventory manager built with Expo / React Native and Supabase.

## Features

- Create an account and log in; your session is remembered on this device.
- Keep each account's inventory separate, with item counts, total stock, and inventory value.
- Search and sort items, track low stock, and refresh inventory.
- Add, edit, adjust, and remove items with input validation and confirmation prompts.
- Invite existing InvenApp accounts to view and edit an inventory; accepted collaborators see live stock changes, and owners can revoke access at any time.
- Manage invitations, collaborators, and shared inventories on a dedicated screen opened from Settings.
- Collaborators can leave a shared inventory at any time.
- Stock history identifies the account that made each recorded stock or price change.
- Accept or decline inventory invitations from Settings.
- Receive in-app notifications for new invitations and shared inventory items being added or removed.
- Change your account name and password from Settings.
- Set the quantity used to flag low-stock items.
- Export/share your inventory as CSV and clear all app data from Settings.
- View the app version and log out safely from Settings.

## Log in

Open the app and choose **Register** to create an account with your name, email, and password. Then log in with that email and password. There are no default or demo credentials. Accounts and inventory are stored in Supabase.

To enable inventory sharing and notifications on an existing Supabase project, run `supabase/inventory_sharing.sql` in the Supabase SQL Editor after `schema.sql`, `stock_history.sql`, and `item_photos.sql`. If you already ran an earlier version of this sharing script, run the updated script again to add stock-history authorship; older history entries will show that the user was not recorded. The recipient must already have an InvenApp account. Invitations appear in the recipient's Settings and notification center; no email is sent.

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
