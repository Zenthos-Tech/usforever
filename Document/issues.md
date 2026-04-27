# Issues — wed-app & wed-backend

Severity guide: **High** = exploitable / data loss / app crash, **Med** = real bug or strong code-smell, **Low** = polish / hygiene. Bugs first, code-quality second.

## Web-app

### Bugs (logic / runtime)

- [x] **[Severity: High]** `wed-app/app/create-album.js:203` — `isGuestMode` references `needsPassword` 12 lines before its `const` declaration on line 215. This is a temporal-dead-zone ReferenceError that throws as soon as the component renders the guest-deep-link path. Move the `const needsPassword = …` above line 203.
- [ ] **[Severity: High]** `wed-app/app/face-recognition.js:139,155` — uses `weddingId` from `useWedding()`, so guests who arrived via a deep link (and never went through OTP login) will hit "Wedding ID not found" or, worse, search faces in the **couple's local context wedding** rather than the shared wedding. Source weddingId from the share-access state instead.
- [x] **[Severity: Med]** `wed-app/context/WeddingContext.js:17` — reads `process.env.EXPO_PUBLIC_API_BASE_URL`, while every other module reads `utils/api.API_URL`. With the env var unset, `fetchWeddingFromBackend`/`saveWeddingToBackend` short-circuit (`reason:'missing_api_base'`) so wedding profile sync never runs. Pick one source of truth.
- [x] **[Severity: Med]** `wed-app/app/api/uploadImage.tsX` — file extension is `.tsX` (not `.tsx`), so Metro/TypeScript don't resolve it. Plus it points at `/upload` (Strapi-era endpoint that no longer exists). Dead and broken — delete.
- [x] **[Severity: Med]** `wed-app/utils/savePhoto.ts:5` — calls `POST /photos/auto-process`, an endpoint that doesn't exist in `wed-backend`. Dead code that will 404 if ever invoked.
- [x] **[Severity: High]** `wed-app/utils/api.ts:1` — production base URL is a hardcoded ngrok dev tunnel (`deserted-cheryll-forwardly.ngrok-free.dev`). Any release build ships pointing at someone's laptop.
- [x] **[Severity: High]** `wed-app/app/share/[slug].js:23-26` — `console.log` prints the full share token + slug. In release builds these survive to logcat / device logs, leaking access credentials.
- [ ] **[Severity: Med]** `wed-app/context/ImagesContext.js:164-166` — `useEffect` runs `syncSelectionsRef.current?.()` on every change to `selectedFolder` (and on every weddingId change). Combined with the per-mutation calls inside `removeFromSelected`/`clearSelected`, the same TV-selections PUT fires multiple times for one user action. Debounce or move the side-effect to a single explicit call site.
- [x] **[Severity: Med]** `wed-app/app/share-access.js:178-184` — branches on `Array.isArray(weddingData?.albums)`, but `WeddingContext` shape is `albums: { wedding: {…}, engagement: {…} }` (object). Code path is dead; the `targetName` lookup will never resolve.
- [ ] **[Severity: Med]** `wed-app/app/index.js:194-195` — hard-coded `await new Promise(r => setTimeout(r, 3000))` before `/onboarding`. Blocks the user for 3 s every cold start, even when assets are warm.
- [ ] **[Severity: Med]** `wed-app/hooks/useTvConnection.js:59` — comment says "every 8s", interval is `4000` ms. Doubles the API load and battery cost. Plus there's no pause-on-background, so it polls forever while the app is visible.
- [ ] **[Severity: Med]** `wed-app/app/verify.js:236-238` — JWT persisted in plain `AsyncStorage`. On a rooted/jailbroken device or a backed-up Android keystore this is readable. Use `expo-secure-store` for the auth token.
- [ ] **[Severity: Med]** `wed-app/app/verify.js:278-280` — fetches `/api/photos/profile-photo?weddingId=…` without a Bearer token. Only works because the backend doesn't require auth on that endpoint (which is itself a problem, see backend list). Add the Authorization header now so we can lock the endpoint down.
- [ ] **[Severity: Med]** `wed-app/app/onboarding.js:113-121` — auto-advance `setInterval` is recreated on every state change because `rawIndex` is in its dep array; effectively the timer restarts each tick. Works but jitters.
- [ ] **[Severity: Low]** `wed-app/app/index.js:175,179` — substring-only matching for `share/` in deep links. A URL like `https://example.com/notshare/foo` still matches because of `'/share/'`. Use `URL` parsing or a tighter regex.
- [ ] **[Severity: Low]** `wed-app/app.json:88-94` — trailing comma after the `extra:{...}` object. Strict JSON parsers reject this; many tools tolerate it but a few do not.
- [x] **[Severity: Low]** `wed-app/context/ImagesContext.js:126` — `console.log(paginationByAlbum,'PAGINATION')` runs every render. Remove or guard with `__DEV__`.
- [ ] **[Severity: Low]** `wed-app/app/share-access.js:317` — error `Alert.alert('Album not ready', ...${String(albumIdProp)})` references "Strapi numeric id", a stale message from the old backend.
- [ ] **[Severity: Low]** `wed-app/context/ImagesContext.js:1-9` — header comment still claims the API matches "YOUR Strapi routes/controllers". The backend was rewritten to Express; comments mislead future readers.

### Code quality / design

- [ ] **[Severity: Med]** `wed-app/app/create-album.js`, `DynamicGallery.js`, `DynamicImagePreview.js`, `face-result.js` — all > 1300 lines, with networking, animation, sizing tokens, and styling inlined. Extracting hooks/components would make these reviewable.
- [ ] **[Severity: Med]** `wed-app/app/share-link.js:209,253-254` and many other places — full URL + token printed via `console.log`/`console.warn`. Strip in production builds.
- [ ] **[Severity: Low]** `wed-app/app/setup-wedding.js`, multiple files — `process.env.EXPO_PUBLIC_API_*` env vars referenced inconsistently across the codebase. Consolidate to one helper.
- [ ] **[Severity: Low]** `wed-app/app/share-link.js:65-74` — date math (`'3days'`, `'nolimit'`) duplicated in `share-access.js` (`getDurationLabel`). Keep in one util.

## Backend

### Bugs / security (auth & access control)

- [ ] **[Severity: High]** `wed-backend/src/routes/photo.ts` — entire `/api/photos/*` router is unauthenticated. Specifically:
  - `POST /presign` (l. 15) — anyone can mint S3 PUT URLs into any couple's folder.
  - `POST /` (l. 51) — anyone can insert a `Photo` row with arbitrary `image_url`, `albumId`, `uploadedById`.
  - `POST /resolve-duplicate` (l. 199) — anyone can rewrite `image_url`/metadata of any photo by ID and trigger `deleteS3Object` on the previous key.
  - `GET /` (l. 270), `GET /:id` (l. 331) — anyone with an `albumId` reads every photo signed URL.
  - `DELETE /:id` (l. 342) — userId is taken from query/body and only enforced when both sides are non-empty (`rawUserId && photo.uploadedById && …`); omit `userId` and the check is skipped, deleting any photo + its S3 object.
  - `POST /sync-sizes` (l. 122), `GET /storage-summary` (l. 96), `POST /check-duplicate` (l. 154), `POST /profile-photo/presign` (l. 232), `GET /profile-photo` (l. 255) — all unauthenticated.
- [ ] **[Severity: High]** `wed-backend/src/routes/album.ts` — none of `GET /`, `POST /`, `POST /ensure-defaults`, `PUT /:id/rename`, `DELETE /:id` require auth or check that the caller owns the wedding. `DELETE /:id` also `Photo.deleteMany` for non-default albums **without removing the underlying S3 objects**, so storage leaks every "delete album" action.
- [x] **[Severity: High]** `wed-backend/src/routes/wedding.ts:42-49` — `GET /api/weddings` lists every wedding row in the DB with no auth. PII (bride/groom names, phones, dates) leaks in bulk.
- [x] **[Severity: High]** `wed-backend/src/routes/wedding.ts` — every other handler (`GET /context`, `PATCH /context`, `GET /:id`, `PUT /:id`, `DELETE /:id`) is also unauthenticated and unscoped. `DELETE /api/weddings/:id` will erase any couple's wedding given the id.
- [ ] **[Severity: High]** `wed-backend/src/routes/face.ts:10-51` — `POST /api/face/search` accepts `weddingId` in the multipart body with no auth, so anyone with a wedding id can run a selfie against that couple's Rekognition collection.
- [x] **[Severity: High]** `wed-backend/src/middleware/auth.ts:18` — `JWT_SECRET` defaults to the literal `'change-me-in-production'` (`config/env.ts:35`). If env is missing, all tokens are forgeable. Throw on startup when `JWT_SECRET` is the default.
- [x] **[Severity: High]** `wed-backend/.env.example:18` — example `JWT_EXPIRES_IN=30y`. Combined with no token revocation list, a stolen JWT is good for thirty years.
- [x] **[Severity: High]** `wed-backend/src/routes/contact.ts:22-48` — `firstName`, `lastName`, `email`, `phone`, `message` are interpolated raw into the SES `Subject:` line and HTML body. Allows email-header injection (newline in firstName ⇒ extra recipient) and HTML/script injection in the rendered message. Escape and reject `\r\n` in headers.
- [x] **[Severity: Med]** `wed-backend/src/index.ts:21-25` — `cors({ origin: '*', methods: [...DELETE...]})`. With `'*'` plus credentialed JWTs in headers from any origin, this is overly permissive for an authenticated API. Restrict to known app origins.
- [x] **[Severity: Med]** `wed-backend/src/routes/shareLink.ts:48-52` — `getPublicBase` falls back to `req.get('host')` when `PUBLIC_APP_BASE_URL` is empty (and `.env.example` ships it empty), reopening the host-header-injection that the comment claims to prevent.
- [x] **[Severity: Med]** `wed-backend/src/routes/photo.ts:35-37,160-163` — `Album.findById(albumId)`/`Photo.findById(...)` throw `CastError` if the id isn't a valid ObjectId; the surrounding try/catch surfaces it as a 500 leaking the Mongoose error. Validate id shape and 400 instead.
- [ ] **[Severity: Med]** `wed-backend/src/middleware/errorHandler.ts:9` — sends raw `err.message` to clients. Internal errors (Mongo, AWS) leak their messages.
- [x] **[Severity: Med]** `wed-backend/src/middleware/errorHandler.ts:9` — sends raw `err.message` to clients. Internal errors (Mongo, AWS) leak their messages.
- [x] **[Severity: High]** `wed-backend/bitbucket-pipelines.yml` — the entire pipeline runs Laravel commands (`php artisan down`, `composer install`, `php artisan migrate`) for a project named `vendoo`. This is the wrong repo's CI; deploys will silently no-op or break. Replace with a Node deploy or delete.
- [x] **[Severity: High]** `wed-backend/src/routes/tvMedia.ts:79` — `const { weddingId } = req.body || req.query`. `req.body` is `{}` (truthy) for a DELETE without a JSON body, so `weddingId` from the querystring is never read. The handler then 400s on every delete-selection call.
- [x] **[Severity: High]** `wed-backend/src/services/tvPairService.ts:34,85` — comment says "TV hasn't sent a heartbeat in 90s", code threshold is `8` seconds. Heartbeat is documented as ~20 s, so paired TVs flap to `DISCONNECTED` almost immediately. Match the threshold to the heartbeat cadence (e.g. 60-90 s).
- [ ] **[Severity: Med]** `wed-backend/src/utils/otp.ts:14,37-58` — `otpStore` is a per-process `Record`. With more than one app instance (or a restart), OTPs are lost / inconsistent and rate-limit windows reset per-pod. Move to Redis or a TTL Mongo collection.
- [x] **[Severity: Med]** `wed-backend/src/utils/otp.ts:1` — `Math.floor(1000 + Math.random()*9000)` for OTPs. `Math.random()` is not cryptographically secure; use `crypto.randomInt(1000, 10000)`.
- [ ] **[Severity: Med]** `wed-backend/src/routes/user.ts:54` — `console.log(\`OTP for ${contactNumber}: ${otp}\`)` writes every OTP to stdout. Anyone with log access can authenticate as anyone.
- [ ] **[Severity: Med]** `wed-backend/src/routes/user.ts:57` — leftover `console.log("Helloo")`.
- [ ] **[Severity: Med]** `wed-backend/src/routes/shareLink.ts:101-115` — passcode rate limiter is in-process (`Map`). Multi-instance deploys disable brute-force protection effectively.
- [ ] **[Severity: Med]** `wed-backend/src/routes/shareLink.ts:355-380` — passcode rate-limit increment runs only after a successful `(slug, tokenHash)` match. Attackers can't spam wrong passcodes for a *random* slug, but a leaked URL can be brute-forced 10 attempts / 2 min indefinitely (no global cap). Consider per-IP throttling and incrementing on missing-slug too.
- [ ] **[Severity: Med]** `wed-backend/src/routes/shareLink.ts:497-511` — `Photo.find().skip(skip).limit(limit)` for the public guest path. With even moderately sized albums, deep pagination is O(skip). Mirror the cursor pagination already used for `GET /api/photos`.
- [x] **[Severity: Med]** `wed-backend/src/index.ts:32` — `multer({ dest: '/tmp/uploads/' })` has no `limits.fileSize`, no `fileFilter`, and the uploaded file is never deleted (`face.ts:18` reads it via `fs.readFileSync` and walks away). Disk fills up; arbitrary content types are accepted.
- [x] **[Severity: Med]** `wed-backend/src/routes/face.ts:18` — synchronous `fs.readFileSync` on the request thread, plus the temp file leaks (no `unlink`).
- [x] **[Severity: Med]** `wed-backend/src/models/TvPairSession.ts`, `models/ShareLink.ts` — both have `expiresAt: Date` but no TTL index, so cancelled/expired rows accumulate forever. Add `expiresAt: { type: Date, expires: 0 }` (or a sweeper) once you're sure expired rows aren't needed for audit.
- [ ] **[Severity: Med]** `wed-backend/src/services/tvPairService.ts:46-54` — fallback short-code path scans **every** `WAITING` session and matches by last 6 chars of UUID. With many concurrent waiting sessions the scan grows linearly and last-6 collisions are realistic (≈1 in 16 million per pair, but birthday bounds appear far earlier). Prefer storing the short code as a separate indexed column.
- [ ] **[Severity: Med]** `wed-backend/src/routes/photo.ts:284,302-303` — `Photo.countDocuments(filter)` runs on every paginated request and `Promise.all` signs every URL. On a 10k-photo album every page hits the heavier query. Either drop the count, cache it, or compute it lazily.
- [ ] **[Severity: Med]** `wed-backend/src/routes/album.ts:24-42`, `routes/shareLink.ts:160-180`, `services/tvMediaService.ts:13-30` — N+1: per album, two extra round-trips (`Photo.findOne` for cover, `Photo.countDocuments`). Aggregate with `$lookup`/`$group` instead.
- [x] **[Severity: Med]** `wed-backend/src/config/s3.ts:6` — read URLs valid for 7 days. After permission revocation (e.g. share-link expired) any cached signed URL still works for up to a week. Shorten or stream through the API.
- [ ] **[Severity: Low]** `wed-backend/src/config/rekognition.ts:13,18` — `Math.random()` for the random suffix on the collection name. Not crypto, but collisions only matter if two creates race for the same wedding before the DB write — low risk.
- [ ] **[Severity: Low]** `wed-backend/src/routes/photo.ts:51-93` — `POST /api/photos` accepts the photo without an `albumId`, despite every consumer passing one. Tighten validation.
- [ ] **[Severity: Low]** `wed-backend/src/index.ts:35-58` — share-link sub-routes are mounted by hand-rewriting `req.url` instead of using `app.use(...)` with router-level paths. Works, but error-prone (e.g. `req.query` is rebuilt by `URLSearchParams(req.query as any).toString()` which loses array params).
- [ ] **[Severity: Low]** `wed-backend/src/routes/tvPair.ts:97-99` — `import` declaration in the middle of the file. Move to the top.
- [ ] **[Severity: Low]** `wed-backend/src/routes/photo.ts:101` — `TOTAL_STORAGE_BYTES = 300 * 1024 * 1024 * 1024` is hardcoded inline. Move to env / per-plan.
- [ ] **[Severity: Low]** `wed-backend/src/utils/helpers.ts:62-67` — `randAZ` uses `Math.random()`; fine for the 3-letter slug suffix but worth flagging given other random-source issues above.
- [ ] **[Severity: Low]** `wed-backend/src/routes/user.ts:46-50` — auto-creates a `User` row on `send-otp`, populating `email = user_${phone}@otp.com`. Allows phone-number enumeration (different responses if a number already has a wedding) and clutters the User collection.

### Code quality / design

- [ ] **[Severity: Med]** Two AWS S3 SDKs are imported (`aws-sdk` v2 and `@aws-sdk/client-s3` v3 + presigner). Pick one — v2 is in maintenance mode through 2025 and bloats the bundle.
- [ ] **[Severity: Low]** `wed-backend/src/routes/photo.ts`, `routes/album.ts`, etc. — handlers mix validation, DB access, S3 calls, and signing in one function. Extracting a thin service layer (like `services/tvPairService.ts`) would simplify testing.
- [ ] **[Severity: Low]** `wed-backend/src/models/Cluster.ts`, `models/Recognition.ts` — declared but referenced nowhere. Delete or wire up.
- [ ] **[Severity: Low]** `wed-backend/src/routes/shareLink.ts` — single 600+ line file; the HTML render, slug helpers, and DB-helper closures could split out cleanly.
- [ ] **[Severity: Low]** `wed-backend/src/utils/helpers.ts:10-22` — `toAlbumId`/`toUserId` cast ids to `Number`, but the schema uses `ObjectId`. Stale helpers from the Strapi-numeric-id era. Remove.
