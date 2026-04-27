# wed-app — Analysis

The Expo / React Native client used by couples and (via deep links) guests and photographers.

## 1. Tech stack

- **Framework:** Expo SDK 54 + React Native 0.81 + React 19, **Expo Router 6** for file-based navigation (`app/` directory). New Architecture enabled (`newArchEnabled: true`), React Compiler experiment enabled.
- **Language:** Mostly JavaScript with a few `.ts(x)` files (`utils/api.ts`, `utils/savePhoto.ts`, `context/OtpContext.tsx`, `ui/Screen.tsx`).
- **Navigation / native APIs:** `expo-router`, `expo-linking` (deep links), `expo-camera` (QR), `expo-image-picker`, `expo-image-manipulator`, `expo-clipboard`, `expo-sharing`, `expo-file-system`, `expo-media-library`, `expo-haptics`, `expo-blur`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg`.
- **Storage / state:** Three React Contexts (`Otp`, `Wedding`, `Images`) + `@react-native-async-storage/async-storage` for persistence.
- **HTTP:** Mostly raw `fetch`. `axios` is a dep but only used by two unused helpers (`utils/savePhoto.ts`, `app/api/uploadImage.tsX`).
- **Build:** EAS (`eas.json`); `app.json` declares the deep-link scheme `usforever`, Android package `com.anonymous.WeddingApp`.

## 2. Architecture overview

A standard Expo Router app. `app/_layout.js` mounts three nested context providers (Otp → Wedding → Images) wrapped in `GestureHandlerRootView` + `SafeAreaProvider`, then renders the route stack. Most screens are flat under `app/`, with one parameterized route group `app/share/[slug].js` that handles deep-link entry from a couple-issued share URL.

```
GestureHandlerRootView
└── SafeAreaProvider
    └── OtpProvider
        └── WeddingProvider          ← persists to AsyncStorage["USFOREVER_WEDDING_CTX_V1"]
            └── ImagesProvider       ← in-memory image cache + selection / favorites
                └── Stack            ← expo-router pages (index, onboarding, signin, verify, ...)
```

## 3. Folder structure

```
wed-app/
├── app.json                expo config (scheme, intent filters, EAS projectId)
├── babel.config.js
├── metro.config.js
├── tsconfig.json           extends "expo/tsconfig.base"
├── app/                    expo-router pages
│   ├── _layout.js          provider tree + Stack screen options (modals)
│   ├── index.js            splash with logo animation + cold/warm deep-link handler
│   ├── onboarding.js       carousel intro
│   ├── signin.js           phone entry → POST /api/send-otp
│   ├── verify.js           OTP keypad → POST /api/verify-otp → store JWT → ensure-defaults
│   ├── setup-wedding.js    couple's first-run wedding details form
│   ├── animation.js        post-login transition
│   ├── home.js             home / tabs entry
│   ├── create-album.js     1500+ line couple folder grid + entry point for guest deep links
│   ├── selected.js         "Selected" sub-folder view (swipe-to-select)
│   ├── DynamicGallery.js   1800+ line photo grid (browsing + multi-select)
│   ├── DynamicImagePreview.js   1700+ line full-screen photo viewer
│   ├── face-consent.js     bottom-sheet consent modal
│   ├── face-recognition.js camera/gallery → POST /api/face/search
│   ├── face-result.js      filtered gallery with selfie thumbnail
│   ├── share-access.js     bottom-sheet to choose passcode/duration before share
│   ├── share-link.js       bottom-sheet that POSTs /api/share-links/generate + shows the URL
│   ├── share/[slug].js     deep-link gate (also handles web → app intent fallback)
│   ├── passwordscreen.js   passcode entry for protected share links
│   ├── ConnectToTVModal.js QR scanner → /api/tv/pair/confirm
│   ├── ConnectionSuccessModal.js
│   ├── subscription.js     paywall placeholder
│   ├── profile.js          settings + Edit Profile / FAQ / Active share links / Logout
│   ├── tc.js               Terms (modal)
│   ├── privacy.js          Privacy (modal)
│   ├── AboutUs.js
│   └── api/uploadImage.tsX  unused legacy upload helper (note the .tsX extension)
├── components/             ButtonRow, AlbumFooterBar, NewAlbumSheet, RenameAlbumSheet,
│                           SharedLinksModal, EditProfileModal, ErrorModal, FaqModal, ...
├── context/
│   ├── ImagesContext.js    images per album + favorites + Selected folder + share access state
│   ├── OtpContext.tsx      contact_no + verification flag during OTP flow
│   └── WeddingContext.js   wedding details + AsyncStorage persistence + backend pull/push helpers
├── hooks/
│   └── useTvConnection.js  polls /api/tv/pair/active and exposes connect / disconnect handlers
├── ui/                     Screen.tsx, layout.js (responsive sizing tokens)
├── theme/                  colors.js, text.js
└── utils/
    ├── api.ts              const API_URL = "<ngrok>/api"
    ├── nav.js              safeBack(fallback)
    ├── savePhoto.ts        unused — calls /photos/auto-process (not on backend)
    └── sharePhoto.js       expo-sharing helper
```

## 4. Key modules

### `utils/api.ts`
Single hardcoded base URL (`https://deserted-cheryll-forwardly.ngrok-free.dev/api`). Used by every screen via `import { API_URL } from '../utils/api'`. There is **no** dev/prod switch.

### `context/WeddingContext.js`
Holds `{ brideName, groomName, weddingDate, weddingId, phone, hasCompletedWeddingSetup, profilePhotoUri, albums }`. Persists to `AsyncStorage["USFOREVER_WEDDING_CTX_V1"]` after every mutation. `fetchWeddingFromBackend` GETs `/api/weddings/context`, `saveWeddingToBackend` PATCHes it; `applyOtpVerifyPayload` is the one-shot helper that the verify-OTP screen uses to seed the context after login. Notably uses `process.env.EXPO_PUBLIC_API_BASE_URL` here even though the rest of the app uses `utils/api.API_URL` — two parallel URL sources.

### `context/ImagesContext.js`
The largest piece of client state.
- `imagesByAlbum: { [albumId]: Image[] }` — server rows merged with `_optimistic` rows during upload.
- `selectedFolder: { [folderName]: Image[] }` — drives the swipe-to-select feature.
- `favorites: { [event]: Image[] }`.
- `shareAccess: { slug, token, role, accessToken }` — set by the deep-link gate so subsequent `/api/share/photos` calls send `Authorization: Bearer <accessToken>`.
- `fetchPhotosPage` implements cursor pagination against `GET /api/photos?albumId=...&cursor=...&limit=...`.
- `syncFromDeepLink` picks the right photo endpoint depending on whether a JWT, a slug+token pair, or a regular `albumId` is present.
- A side-effect (`useEffect`) PUTs `/api/tv/selections` whenever `selectedFolder` changes, mirroring the curated set to whichever TV is paired.

### `context/OtpContext.tsx`
Tiny — just `{ contact_no, otp?, is_verified? }` carried between `signin.js` and `verify.js`.

### `app/_layout.js`
Declares which screens render as transparent/bottom-sheet modals (`privacy`, `tc`, `passwordscreen`, `face-consent`, `face-recognition`).

### `app/index.js` (Splash)
Animates logo + checks for cold-start deep links via `Linking.getInitialURL()`. If the URL contains `/share/`, it `router.replace()`s into `/share/[slug]` directly because `unstable_settings.initialRouteName='index'` would otherwise eat the route. After 3000 ms (hardcoded) it sends the user to `/onboarding`.

### `app/share/[slug].js`
Deep-link entry. On native it `POST`s to `/api/share-links/resolve/:slug?t=...`. On 401 + `requiresPasscode`, it routes to `/create-album` with `needsPassword=true` so create-album mounts as a blurred backdrop and pushes `passwordscreen` on top. On success it routes to `/create-album` with the resolved metadata. On web it uses Android Intent URLs / iOS scheme + `DEV_BUILD_URL` fallback to bounce into the installed app.

### `app/passwordscreen.js`
Modal that POSTs the passcode to `/api/share-links/resolve/:slug?t=...`, then routes to `/create-album` with the issued `accessToken`. Blocks Android hardware back so the user can't bypass.

### `app/create-album.js`
The hub for couple flow: lists albums (via `/api/albums?weddingId=...`), creates/renames/deletes, opens share-access sheet, hosts the TV cast modal. Also doubles as the destination for guest deep-links (`isGuestMode`), where it uses the passed-in `albums` JSON instead of fetching from the API.

### `hooks/useTvConnection.js`
On a screen mount, calls `GET /api/tv/pair/active?weddingId=...` and then polls every 4 seconds. Exposes `onCastPress` (open `ConnectToTVModal`), `onConnected`, and `onDisconnect` (which calls `POST /api/tv/pair/cancel`). The auth token used here is the user JWT from AsyncStorage.

## 5. How wed-app and the backend communicate

- **Base URL:** `utils/api.ts` — currently an ngrok dev tunnel.
- **Auth token:** stored in `AsyncStorage["USFOREVER_AUTH_TOKEN_V1"]` after `verify-otp`. Sent as `Authorization: Bearer <jwt>` only by:
  - `share-link.js` (POST `/api/share-links/generate`)
  - `useTvConnection.js` (GET `/api/tv/pair/active`)
  - `ConnectToTVModal.js` (POST `/api/tv/pair/confirm`)
  - `ConnectToTVModal.js` cancel path / `useTvConnection.onDisconnect` (POST `/api/tv/pair/cancel`)
  - `ImagesContext.js` (PUT `/api/tv/selections`)
  - `WeddingContext.js` (`/api/weddings/context` GET/PATCH)
  - Active-share-links list in `SharedLinksModal`.
- All other endpoints (photos, albums, face search, presign, profile-photo, dup detection, weddings list/detail) are called **without** the token — the backend doesn't require it, but that means anyone with a `weddingId` can read the same data.

### Data flows worth highlighting

**OTP login**
```
signin → POST /api/send-otp           (bodyless 200 + SMS)
verify → POST /api/verify-otp         → { jwt, weddingId, albums, brideName, groomName, ... }
       → AsyncStorage.set(JWT)
       → applyOtpVerifyPayload(...)
       → POST /api/albums/ensure-defaults
       → router.replace('/setup-wedding' | '/animation')
```

**Photo upload (couple)**
```
DynamicGallery / NewAlbumSheet
  → POST /api/photos/presign        { weddingId, albumId, originalFileName, mimeType }
  → PUT  <signed S3 url> (raw bytes)
  → POST /api/photos                { data: { image_url: <key>, album, file_name, checksum, size_bytes, ... } }
```
The presign response carries the bucket name back so the app stores the S3 key in `image_url`.

**Guest deep link**
```
usforever://share/<slug>?t=<token>
  → app/share/[slug].js
  → POST /api/share-links/resolve/:slug?t=<token>
       (401 + requiresPasscode) → /passwordscreen → POST /resolve again with passcode
  → /create-album (deep params: weddingId, albumId, role, accessToken, albums[], ...)
  → ImagesContext.syncFromDeepLink → GET /api/share/photos?albumId=... (Bearer accessToken)
```

**Face search (guest)**
```
face-consent (modal) → face-recognition
  → ImagePicker / Camera → ImageManipulator (resize 1280px, JPEG q=0.35)
  → multipart POST /api/face/search { weddingId, image }
  → /face-result with photos[] payload + selfieUri
```
**Caveat:** `weddingId` is read from `useWedding()` (the locally-logged-in couple), not from the share access flow — so a guest's selfie search only works if the couple's wedding context is still loaded. See issues.md.

**TV cast**
```
profile / create-album
  → ConnectToTVModal opens camera (expo-camera CameraView)
  → on QR scanned, parse pairingId from usforever://tv/pair?pairingId=...
  → POST /api/tv/pair/confirm { pairingId, weddingId } (Bearer jwt)
  → ConnectionSuccessModal
useTvConnection polls /api/tv/pair/active to detect TV-side disconnect
ImagesContext PUTs /api/tv/selections whenever selectedFolder changes
```

## 6. External dependencies and services

- **Expo modules** for camera, image picking/manipulation, deep linking, sharing, blur, file system, media library, splash, etc.
- **MSG91** is the SMS provider — handled server-side; the app never calls MSG91 directly.
- **AWS S3** is reached directly for the upload PUT (signed URL from backend) and indirectly for downloads (signed GET URLs from backend).
- **Native deep links:** custom scheme `usforever://`, plus an Android Intent filter (`com.anonymous.WeddingApp`).
- **Native QR scanning:** `expo-camera`'s `CameraView` with `barcodeTypes:['qr']`.

## 7. Notable patterns and design choices

- **Modal-as-route.** Bottom sheets / passcode prompt / face flows are top-level routes mounted with `presentation:'transparentModal'` in `_layout.js`. Lets the deep-link gate "stack" `passwordscreen` over `create-album` for the password-required flow.
- **Optimistic image rows.** `addOptimisticImage` inserts `_optimistic:true` rows tagged `tmp_<...>` at the top of the album so the UI reflects an in-flight upload, and `pruneOptimistic` clears them when the server response merges in.
- **Per-phone scoped AsyncStorage keys** (`makePerUserStorageKey`) so the storage meter and profile photo cache don't bleed between accounts on the same device.
- **Two competing API base URL sources:** the constant in `utils/api.ts` and `process.env.EXPO_PUBLIC_API_BASE_URL` in `WeddingContext.js`. Easy to drift apart (and currently *do* drift because the env var isn't set, leaving the wedding sync silently disabled).
- **Heavy single-file screens.** Several files exceed 1500 lines (`create-album.js`, `DynamicGallery.js`, `DynamicImagePreview.js`, `face-result.js`); UI logic, animation, networking, and styling are all inlined.
- **Aggressive deep-link guarding.** `app/index.js` and `app/share/[slug].js` both intercept cold-start vs warm-start deep links and short-circuit the splash when either is detected.
- **Responsive sizing via `useLayoutTokens`** instead of fixed pixels — every screen calls `clamp(W * 0.x, min, max)` for fonts/paddings/icons.
- **Console logs are everywhere**, including on the deep-link gate (slug + token) and on every render of `ImagesContext`. These will ship in production builds.
