# Kje Dogaja

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.

## Development (Expo Go)

- Recommended start command: `npm start`
- This project is configured to start with tunnel mode for stable iPhone connections.

If Expo Go shows `exp://192.168.x.x:8081` and times out:

- Run: `npx expo start --tunnel --host tunnel --clear`
- Make sure Expo Go scans the tunnel QR (not LAN URL)
- Keep laptop awake and disable VPN/proxy while testing
- If still needed, run LAN fallback on same Wi-Fi: `npm run dev:lan`

## Release setup (EAS + App Store + Play Store)

## Final pre-store checklist

- Bundle/package IDs are set to `com.kjedogaja.app` in `app.json`.
- The app can now build in **Supabase-only mode**. `EXPO_PUBLIC_BACKEND_URL` is optional and should only be set if you deploy the custom `/backend` service.
- Run credentials sanity:
	- `eas credentials -p ios`
	- `eas credentials -p android`
- Build sanity:
	- `eas build -p ios --profile production`
	- `eas build -p android --profile production`
- Submit sanity:
	- `eas submit -p ios --latest --profile production`
	- `eas submit -p android --latest --profile production`

### Store assets note

- A `1024x1024` app icon has been generated from the current logo and wired into `app.json`.
- Replace it later only if you want a redesigned brand icon.

### 1) Optional backend URL

- `EXPO_PUBLIC_BACKEND_URL` is optional.
- Leave it unset unless you explicitly deploy the custom `/backend` service.
- If you do deploy that service, use a real public HTTPS URL.

### 2) Build app binaries

- iOS production build: `eas build -p ios --profile production`
- Android production build (AAB): `eas build -p android --profile production`

The app config now accepts production builds with no backend URL and only validates the URL when one is provided.

### 3) Submit to stores

- iOS submit to App Store Connect:
	- `eas submit -p ios --latest --profile production`
	- Then enable TestFlight/internal testing in App Store Connect.
- Android submit to Google Play:
	- `eas submit -p android --latest --profile production`
	- Then choose Internal/Open/Production track in Play Console.

Before first iOS submit, replace placeholders in `eas.json` submit profile:
- `submit.production.ios.ascAppId`
- `submit.production.ios.appleId`

### 4) What users install

- Development testing: Expo Go / internal preview builds.
- Public users: TestFlight (iOS), Google Play testing tracks, App Store, Play Store.

No extra server is needed to host app binaries, but your backend API must be publicly reachable over HTTPS.
