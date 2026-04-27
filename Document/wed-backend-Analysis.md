# wed-backend — Analysis

The Express + MongoDB API that powers `wed-app`, `tv-app` and `wedding-website`.

## 1. Tech stack

- **Runtime / framework:** Node.js >= 18, Express 5, TypeScript 6 (strict).
- **Dev:** `ts-node-dev` for live reload (`npm run dev`); `tsc` build → `node dist/index.js` for prod.
- **Database / ODM:** MongoDB via Mongoose 9.
- **AWS SDKs:** Mixed — `aws-sdk` v2 (S3 presign + delete, Rekognition) and `@aws-sdk/client-s3` v3 + `@aws-sdk/s3-request-presigner` (TV media listing) + `@aws-sdk/client-ses` (contact form mail).
- **Auth:** JWT (`jsonwebtoken`) with three different "kinds" of tokens — user JWT, photographer/share-access JWT, TV pairing JWT.
- **Other libs:** `bcryptjs` (passcode hashing), `multer` (selfie upload to `/tmp/uploads/`), `axios` (calls MSG91 OTP API), `cors`, `dotenv`.
- **Deploy:** `bitbucket-pipelines.yml` is checked in (but it is a leftover Laravel/PHP pipeline — see issues.md).

## 2. Architecture overview

A single Express app exposes a REST API under `/api`. Mongoose models back every domain entity. AWS S3 is the photo store; signed URLs are generated on every read. AWS Rekognition holds per-wedding face collections used by the AI guest-photo search. SES sends contact-form mail. MSG91 sends OTP SMS to Indian (+91) numbers.

The server is a single process (`main()` in `src/index.ts`): connects to Mongo, mounts routes, listens on `PORT` (default 1337). State that should be in a shared store (OTP records, passcode rate limiter) currently lives in process memory, so the service is **not horizontally scalable as written**.

```
Client  ──HTTPS──▶  Express (src/index.ts)  ──Mongoose──▶  MongoDB
                          │
                          ├── aws-sdk v2  ──▶  S3 (photos), Rekognition (faces)
                          ├── @aws-sdk v3 ──▶  S3 (TV listing), SES (mail)
                          └── axios       ──▶  MSG91 (SMS OTP)
```

## 3. Folder structure (`src/`)

```
src/
├── index.ts            Express bootstrap + route mounting + signal handlers
├── config/
│   ├── env.ts          Typed env loader (envStr/envInt with defaults)
│   ├── database.ts     mongoose.connect / disconnect helpers
│   ├── s3.ts           Two S3 clients (v2 + v3); buildSignedReadUrl, buildSignedPutUrl, deleteS3Object, presignV3
│   └── rekognition.ts  ensureWeddingCollection, indexPhotoIntoCollection, searchFaceInWeddingCollection
├── middleware/
│   ├── auth.ts         authRequired — verifies JWT_SECRET token, loads User, sets req.user
│   ├── tvAuth.ts       tvAuthMiddleware — verifies TV JWT, looks up TvPairSession status
│   └── errorHandler.ts Catches thrown errors and returns { error: { status, message } }
├── models/             Mongoose schemas
│   ├── User.ts         { username, email, contact_no, confirmed, blocked, password }
│   ├── Wedding.ts      { brideName, groomName, weddingDate, phone (unique), weddingSlug,
│   │                     collection_name, profilePhoto, deletedDefaultAlbums, tvSelectedPhotoIds }
│   ├── Album.ts        { title, weddingId, systemKey, hidden, isDefault, deletedByUser, userId, ... }
│   ├── Photo.ts        { image_url (S3 key), albumId, uploadedById, size_bytes, file_name, checksum,
│   │                     duplicate_group, media_type, mime_type, face_indexed, face_external_id, rek_collection }
│   ├── ShareLink.ts    { slug, tokenHash (sha256), role, weddingId, albumId, requiresPasscode,
│   │                     passcodeHash (bcrypt), phonePrefix, albumName, expiresAt, shareUrl }
│   ├── TvPairSession.ts{ pairingId, status: WAITING|PAIRED|EXPIRED|CANCELLED, expiresAt, pairedAt,
│   │                     weddingId, pairedByUserId, tvToken, shareType, tvLastSeenAt }
│   ├── Cluster.ts      Face cluster id (unused beyond declaration)
│   └── Recognition.ts  Per-face recognition record (currently unused at the route level)
├── routes/
│   ├── user.ts         /api/send-otp, /api/verify-otp, /api/create-wedding
│   ├── photo.ts        /api/photos/* — presign, save, list, get, delete, dup detection,
│   │                     storage-summary, sync-sizes, profile-photo presign/get
│   ├── face.ts         /api/face/search — Rekognition selfie matcher
│   ├── album.ts        /api/albums — list, create, ensure-defaults, rename, delete
│   ├── shareLink.ts    /api/share-links/generate|resolve, /api/s/:slug, /api/share/photos,
│   │                     /api/r (photographer redirect), /api/share-links (list)
│   ├── tvPair.ts       /api/tv/pair/{start, status, active, confirm, heartbeat, disconnect, cancel}
│   ├── tvMedia.ts      /api/tv/{wedding, albums, albums/:event/images, selections}
│   ├── wedding.ts      /api/weddings, /api/weddings/context (read/patch by weddingId or phone)
│   └── contact.ts      /api/contact — SES email send
├── services/
│   ├── tvPairService.ts   start/confirm/getStatus/heartbeat/cancel + 6-char short-code fallback
│   └── tvMediaService.ts  listAlbums (with cover thumbnail) + listImages (paginated)
└── utils/
    ├── helpers.ts      slugify, normalizePhone, mixNames, makeWeddingSlug, safeExtFromName,
    │                     generateS3Key, escapeHtml, formatUploadedLabel, toBytes
    └── otp.ts          generateOtp + in-memory store + verifyOtp/canRequestNewOtp
```

## 4. Key modules

### Auth surfaces

The backend has **three** independent auth mechanisms wired through different middleware/secrets.

| Token kind             | Secret                       | Issued at                      | Used by                                      |
|------------------------|------------------------------|--------------------------------|----------------------------------------------|
| User JWT (`{ id }`)    | `JWT_SECRET`                 | `POST /api/verify-otp`         | `authRequired` (mobile app)                  |
| Share access JWT       | `PHOTOGRAPHER_JWT_SECRET`    | `POST /api/share-links/resolve`| `verifyPhotoJwt` for `/api/share/photos`     |
| TV pairing JWT         | `JWT_SECRET` (same as user)  | `POST /api/tv/pair/confirm`    | `tvAuthMiddleware` for `/api/tv/...`         |

Note: TV tokens are signed with the user secret but distinguished by a `typ:'tv'` claim — see `tvAuth.ts` and `tvPairService.confirmPairing`.

### Share links

`ShareLink` stores a SHA-256 hash of the raw token (raw token never persisted), plus an optional bcrypt passcode hash. A 4-byte slug like `9876XY-guest` is generated by retry loop. `/api/s/:slug` is the universal entry point: photographer → `PHOTOGRAPHER_WEB_APP`, guest → `GUEST_WEB_URL`, couple → renders an HTML page that deep-links into `usforever://share/...` (with an Android intent fallback). `/resolve/:slug` returns wedding/album metadata plus a `share-access` JWT so the client doesn't need to re-send the passcode on every photo fetch.

A **per-process** sliding window (`passcodeAttempts` map, 10 attempts / 2 min per slug) rate-limits passcode brute-force.

### TV pairing flow

1. TV calls `POST /api/tv/pair/start` (public) → server creates a `TvPairSession` (status `WAITING`, TTL `TV_PAIR_TTL_MINUTES`, default 5 min) and returns a `qrPayload` like `usforever://tv/pair?pairingId=<uuid>`.
2. Mobile app scans QR (or types the last-6-char short code) → `POST /api/tv/pair/confirm` (auth required) signs a TV JWT with `typ:'tv'`, marks session `PAIRED`, cancels other sessions for that wedding.
3. TV polls `GET /api/tv/pair/status` to discover the new `tvToken`, then heartbeat-loops `POST /api/tv/pair/heartbeat` (TV auth) every ~20s.
4. TV calls `GET /api/tv/wedding`, `/api/tv/albums`, `/api/tv/albums/:event/images`, `/api/tv/selections` — all guarded by `tvAuthMiddleware`.

### Face recognition

Each wedding maps to one Rekognition collection (`{phone}_{weddingId}_{6char}`), created lazily by `ensureWeddingCollection` and persisted to `Wedding.collection_name`. On photo create, `indexPhotoIntoCollection` indexes faces with `ExternalImageId = photo_<photoId>`. `/api/face/search` accepts a multipart selfie upload, calls `searchFacesByImage` with threshold 70/85, parses `photo_<id>` back out, and returns the best similarity per photo with signed URLs.

### S3 layout

Generated by `generateS3Key` and `buildCoupleFolder`:

```
<coupleSlug>_<phoneDigits>/<albumSlug>/<ISO_TS>_<8hex>.<ext>
<coupleSlug>_<phoneDigits>/userInformation/<ISO_TS>_<8hex>.<ext>     (profile photo)
```

## 5. How wed-app and the backend communicate

The mobile app holds a hardcoded base URL in `wed-app/utils/api.ts` (currently an ngrok dev tunnel — see issues). Every screen + context calls that URL via `fetch` / `axios`.

**Auth path (couple)**

```
SignIn ─POST /api/send-otp─▶  Verify ─POST /api/verify-otp─▶  { jwt, weddingId, albums, ... }
                                          │
                                          ▼
                                AsyncStorage["USFOREVER_AUTH_TOKEN_V1"]
                                          │
                                          ▼
                                 Authorization: Bearer <jwt>
```

The JWT is sent only on endpoints that require it: `/api/share-links/generate` (and `GET /api/share-links`), `/api/tv/pair/{active,confirm,cancel}`, `/api/tv/selections`. Most photo/album endpoints are called **without** the bearer token — see issues.md.

**Share-link path (guest / photographer)**

```
deep link  usforever://share/<slug>?t=<token>
   │
   ▼
ShareGate ─POST /api/share-links/resolve/:slug?t=<token>─▶ {
   weddingId, albumId, role, accessToken, ...,
   requiresPasscode? -> redirect to /passwordscreen
}
   │
   ▼
create-album  ─GET /api/share/photos?albumId=<X>─▶ photo list
              (Authorization: Bearer <accessToken>)
```

**TV path (TV app — separate repo)** — see "TV pairing flow" above.

**Other recurring shapes**

- Photo upload: app calls `POST /api/photos/presign` to get an S3 PUT URL, uploads bytes directly to S3, then `POST /api/photos` with the resulting key to persist the row + index faces.
- Storage meter: `GET /api/photos/storage-summary?weddingId=...` (300 GiB hardcoded cap).
- TV mirror gallery: `PUT /api/tv/selections` from mobile, `GET /api/tv/selections` from TV.

## 6. External dependencies and services

- **MongoDB** — primary persistence (Atlas or self-hosted; defaults to `mongodb://127.0.0.1:27017/usforever`).
- **AWS S3** — photo and selfie storage (`AWS_BUCKET`); 7-day signed read URLs.
- **AWS Rekognition** — face indexing + similarity search; one collection per wedding.
- **AWS SES** — contact form email (sender = `AWS_VERIFIED_EMAIL`, reply-to = sender's typed email).
- **MSG91** — OTP SMS (Indian numbers, `+91` hardcoded in `routes/user.ts:61`).
- **No queue / cache / CDN** — all heavy work happens inline on the request thread.

## 7. Notable patterns and design choices

- **Tokens are hashed before storage.** Share-link tokens are SHA-256 hashed (`tokenHash`); passcodes are bcrypt-hashed. Raw values never hit Mongo.
- **Two sets of S3 SDKs in the same process.** `aws-sdk` v2 for presign/delete; `@aws-sdk` v3 for the TV listing path. Doubles bundle size and adds two patching surfaces.
- **Cursor pagination on the main photo list** (`GET /api/photos`) — uses `(createdAt, _id)` as a tiebreaker via a compound index. Share/photos and TV media still use skip/limit.
- **In-memory ephemeral state.** `otpStore` and `passcodeAttempts` are plain Maps in the process, so a restart drops every pending OTP and rate-limit window. Multi-instance deploys would be incoherent.
- **Multer scope.** `app.use('/api/face', upload.single('image'), faceRoutes)` mounts multer at the route prefix, not on individual handlers.
- **Manual route rewriting in `index.ts`.** `/api/share-links/generate`, `/api/s/:slug`, `/api/r`, etc. are wired by hand-tweaking `req.url` instead of using nested `Router.use`. Works, but error-prone.
- **Mongoose lean reads + Promise.all signing loops.** Hot read paths (`GET /api/photos`, `GET /api/albums`, share + TV listings) `Promise.all` over each row to call `getSignedUrlPromise`. Simple, but signs every URL on every request.
- **Auto-create on OTP.** `POST /api/send-otp` creates a `User` row and `POST /api/verify-otp` creates a `Wedding` row if missing — passwordless onboarding.
- **Soft delete for default albums, hard delete for everything else.** Default albums (`isDefault` or `systemKey`) only flip `hidden`/`deletedByUser`; custom albums delete photos + remove the album row (but the underlying S3 objects are not deleted).
