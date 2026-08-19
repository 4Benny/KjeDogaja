# DEPLOY.md — Kje Dogaja: running, hosting, and all the connections

This is the complete operations guide for the app: how everything connects, how to run it in development, how to build and publish the Android/iOS apps, how to host the web version, where the database lives, and how to back it all up.

---

## 1. Architecture — what talks to what

```
  Android app ──┐
  iOS app ──────┤   @supabase/supabase-js    ┌──────────────────────────────┐
  Web app ──────┴───────────────────────────►│  SUPABASE (hosted cloud)     │
  (one Expo codebase,                        │  viatqtevcpvhnmqvzwvd        │
   expo-router, RN 0.8x)                     │  ├─ Postgres database        │
                                             │  ├─ Auth (e-mail + OTP)      │
        local notifications                  │  ├─ Storage (3 buckets)      │
        (expo-notifications,                 │  └─ Realtime (subscriptions) │
         scheduled on-device)                └──────────────────────────────┘

  Optional, OFF by default:
  EXPO_PUBLIC_BACKEND_URL ────► /backend (custom Fastify service, see §8)
```

**The only server the app needs is Supabase**, and it is already hosted — there is nothing to install or run for the backend. Everything lives in the Supabase project `viatqtevcpvhnmqvzwvd`:

| Piece | What's in it |
|---|---|
| **Database** (Postgres) | Tables: `profiles`, `events`, `event_going`, `event_ratings`, `event_comments`, `event_images`, `organizer_followers` |
| **Auth** | E-mail + password sign-up with a 6-digit OTP e-mail verification; roles (`user` / `organizer` / `admin`) live in `profiles.role` |
| **Storage** | Buckets: `event-posters` (event posters), `event-images` (attendee photo galleries), `avatars` (profile pictures) |
| **Realtime** | The app subscribes to `events` inserts and `organizer_followers` changes to fire "new event from an organizer you follow" notifications |

**Connection credentials** are in `app/integrations/supabase/client.ts` — the project URL and the **anon (public) key**. The anon key is *designed* to ship inside the app; it only grants what Row Level Security (RLS) policies allow. What must never appear in this repo or the app is the **service_role key** — that one bypasses RLS. It stays in the Supabase dashboard only.

**Notifications** are local: reminders (3 days / 1 hour before an event) and "new event" alerts are scheduled on the device by `expo-notifications`. There is no push server to host.

**Maps** use OpenStreetMap tiles (Leaflet in a WebView on native, react-leaflet on web) — free, no API key, nothing to host.

---

## 2. Prerequisites

- **Node.js 18+** (LTS) and **yarn** (`corepack enable`, the repo has `yarn.lock`)
- An **Expo account** (free) — the project is already linked: EAS project id `70d49e89-e1d1-49d1-abda-bb5a585a1eb7`, slug `kje-dogaja`
- Access to the **Supabase project** dashboard (https://supabase.com/dashboard) — you own the project
- For store releases: a **Google Play Console** account ($25 one-time) and/or **Apple Developer** account ($99/year)

Clone and install:

```bash
git clone https://github.com/4Benny/KjeDogaja.git
cd KjeDogaja
yarn install
```

---

## 3. Running in development

```bash
npm start          # Expo dev server in tunnel mode (works across networks)
```

- Scan the QR with **Expo Go** on your phone (tunnel mode is pre-configured for reliable iPhone connections).
- If the tunnel misbehaves: `npx expo start --tunnel --host tunnel --clear`, or same-Wi-Fi fallback `npm run dev:lan`.
- Web preview: press `w` in the dev server, or `npx expo start --web`.
- No environment variables are needed for development — the app talks straight to Supabase.

Quality checks before any release:

```bash
npx tsc --noEmit   # type check
npx eslint .       # lint
```

---

## 4. Releasing the Android app

Builds run on Expo's EAS cloud (free tier is fine; queue times vary).

```bash
npm i -g eas-cli
eas login
eas build --platform android --profile production     # produces an .aab for Play Store
```

- Package id: `com.kjedogaja.app` (already set in `app.json`). Version codes auto-increment (`autoIncrement: true` in `eas.json`).
- **First time only:** EAS generates and stores the Android signing keystore for you — accept the defaults and never lose access to that Expo account, it holds your signing key.
- For a directly installable test APK instead of a store bundle: `eas build --platform android --profile preview`.

Publish to Google Play:

```bash
eas submit --platform android --profile production
```

(`eas.json` is already configured: production track, released immediately. The first submission must be uploaded manually through the Play Console UI; `eas submit` works from the second one on.)

## 5. Releasing the iOS app

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

- Bundle id: `com.kjedogaja.app`. Requires a paid Apple Developer account; EAS walks you through certificates automatically.
- All the App Store privacy strings (location, photos, notifications) are already in `app.json`.

## 6. Hosting the web version

The web app is a static export — it can be hosted anywhere that serves files:

```bash
npx expo export --platform web      # output lands in ./dist
```

Then pick a host:

- **Cloudflare Pages / Netlify / Vercel (easiest):** point the service at the repo, build command `npx expo export --platform web`, output directory `dist`. Free tier, HTTPS and CDN included. Because expo-router is used, enable SPA fallback (all routes → `index.html`); on Netlify add a `_redirects` file with `/* /index.html 200`, on Cloudflare Pages set the 404 fallback to `index.html`.
- **Your home server** (the Windows 11 VM from your other deployments): copy `dist/` to the VM, serve it with any static server, and expose it through your Cloudflare Tunnel as e.g. `dogaja.yourdomain.com`. A one-liner server: `npx serve -s dist -l 8090` (`-s` gives the SPA fallback).

The web build talks to the same Supabase project, so web and mobile users see the same events, accounts, and photos.

---

## 7. The database — managing, securing, backing up

Everything lives in Supabase; the dashboard (https://supabase.com/dashboard → project `viatqtevcpvhnmqvzwvd`) is your admin panel.

**Day-to-day admin**
- **Table editor** → browse/fix rows in `events`, `profiles`, etc. Promote someone to organizer by setting `profiles.role = 'organizer'` (or `admin`).
- **Authentication → Users** → see accounts, reset passwords, delete users.
- **Storage** → browse the three buckets, delete inappropriate images.

**Security checklist (verify once, keep it that way)**
- RLS is **enabled on every table**, with policies matching what the app expects: anyone can read `published` events; organizers insert/update/delete only rows where `organizer_id = auth.uid()`; users write only their own `event_going` / ratings / comments / images rows; admins can do everything.
- The **service_role key is nowhere** in the repo, the app, or any client.
- Auth → the e-mail OTP template is enabled (the app verifies sign-ups with a 6-digit code).

**Backups**
- Supabase's free tier keeps daily backups for a limited window; paid tiers keep more. For your own copies, install the Supabase CLI and dump on a schedule:
  ```bash
  supabase login
  supabase link --project-ref viatqtevcpvhnmqvzwvd
  supabase db dump -f backup-$(date +%F).sql        # schema + data
  ```
- Storage files (posters/avatars/gallery photos) are separate from the DB dump — download them via the dashboard or the CLI (`supabase storage cp -r ss://<bucket> ./backup/<bucket> --experimental`) occasionally.
- Keep dumps somewhere outside Supabase (your PC, the home server, a cloud drive).

**Limits to know:** the free tier pauses projects after ~1 week of zero traffic (open the dashboard to wake it) and includes 500 MB database + 1 GB storage. If the app grows, the Pro tier ($25/mo) removes pausing and raises limits — no code changes needed.

---

## 8. The optional custom backend (`/backend`) — you can ignore it

`/backend` is a Fastify service built on Natively's `@specific-dev/framework`, with its own Drizzle schema and Better Auth. It is **only used when `EXPO_PUBLIC_BACKEND_URL` is set** (see `.env.example`); with the variable empty — the default — the app runs in **Supabase-only mode** and every feature works.

The app currently uses it for exactly two fallback calls (organizer event update/delete via `utils/api.ts`) to work around strict RLS on past events; both fall back to direct Supabase when the backend is absent.

Recommendation: **leave it undeployed.** If you ever want it: it's designed for Natively's hosting platform (`createApplication` from their framework provisions DB/auth/storage there). Deploying it elsewhere would mean replacing that framework — at that point it's simpler to adjust the RLS policies in Supabase instead.

---

## 9. Configuration reference

| Setting | Where | Value / notes |
|---|---|---|
| Supabase URL + anon key | `app/integrations/supabase/client.ts` | Hardcoded; safe to ship |
| Optional backend URL | `EXPO_PUBLIC_BACKEND_URL` env (see `.env.example`) | Leave empty |
| App id / package | `app.json` | `com.kjedogaja.app`, scheme `kjedogaja` |
| EAS project | `app.json → extra.eas.projectId` | `70d49e89-e1d1-49d1-abda-bb5a585a1eb7` |
| Build profiles | `eas.json` | `development` / `preview` (internal APK) / `production` (store) |
| Storage buckets | Supabase dashboard | `event-posters`, `event-images`, `avatars` |
| Allowed sign-up e-mail domains | `app/auth.tsx` | gmail, outlook, hotmail, yahoo, icloud, proton |

---

## 10. Common operations cheat-sheet

| Task | Command / place |
|---|---|
| Run on your phone | `npm start` → scan QR with Expo Go |
| Test APK for friends | `eas build -p android --profile preview` → share the link EAS prints |
| Store release (Android) | `eas build -p android --profile production` → `eas submit -p android` |
| Store release (iOS) | `eas build -p ios --profile production` → `eas submit -p ios` |
| Update the web app | `npx expo export --platform web` → redeploy `dist/` |
| Make someone an organizer | Supabase → Table editor → `profiles` → set `role` |
| Delete bad content | Supabase → Table editor / Storage |
| Backup | `supabase db dump` + download buckets (§7) |
| Wake a paused project | Open the Supabase dashboard |

## 11. Troubleshooting

- **App loads but no events / endless skeletons:** Supabase project is paused (free tier) — open the dashboard to resume it; or the device has no internet.
- **Sign-up says the e-mail domain isn't allowed:** only the providers listed in §9 are accepted (`app/auth.tsx`).
- **OTP e-mail never arrives:** check spam; in Supabase → Auth → check e-mail sending limits (the built-in sender is rate-limited — connect custom SMTP under Auth → SMTP for production volume).
- **Images upload but don't display:** the bucket is private and the RLS/storage policy blocks reads — the app tries signed URLs first, then public; make sure each bucket has a read policy (or is public).
- **`eas build` fails on credentials:** run `eas credentials` and let it regenerate; make sure you're logged into the Expo account that owns project `70d49e89…`.
- **Web routes 404 on refresh:** the host is missing the SPA fallback to `index.html` (§6).
- **Realtime "new event" notifications don't fire:** Supabase → Database → Replication → make sure `events` and `organizer_followers` are in the `supabase_realtime` publication.
