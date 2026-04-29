# Issues Not Implemented Correctly

Verification of `Document/issues.md` against the current codebase. Items below are either not fixed at all (`NOT FIXED`), only partially addressed (`PARTIAL`), or fixed in a way that introduces a new bug. Items already passing verification are NOT listed here.

Severity guide matches `issues.md`: **High** = exploitable / data loss / app crash, **Med** = real bug or strong code-smell, **Low** = polish / hygiene.

## Web-app

### Bugs (logic / runtime)

- [x] **[Severity: Med] [PARTIAL]** `wed-app/context/ImagesContext.js:164-177` — `useEffect` was debounced (400 ms) but `pushSelectionsToBackend()` is still called from multiple sites (around lines 600 and 677). The duplicate-PUT root cause is mitigated, not eliminated. Consolidate to a single explicit call site.

- [x] **[Severity: Med] [NOT FIXED]** `wed-app/app/verify.js:244` — JWT is still persisted via `AsyncStorage.setItem(AUTH_TOKEN_KEY, json.jwt)` in plain storage. `expo-secure-store` was never adopted. Tokens remain readable on rooted/jailbroken devices and via Android backups.

- [x] **[Severity: Low] [PARTIAL]** `wed-app/app/create-album.js:233, 695, 724, 827, 833` — unguarded `console.log` of `API_BASE` and full delete-album request URLs / responses survive in production builds. The original `share-link.js` logs were cleaned up, but the same class of leak migrated into `create-album.js`. Wrap in `__DEV__` or remove.

### Code quality / design

- [x] **[Severity: Med] [NOT FIXED]** `wed-app/app/create-album.js` (1565 LOC), `DynamicGallery.js` (1896 LOC), `DynamicImagePreview.js` (1704 LOC), `face-result.js` (1371 LOC) — all four files still exceed 1300 lines with networking, animation, sizing tokens and styling inlined. No new component/hook extractions landed under `wed-app/components/` or `wed-app/hooks/` to address this.

## Backend

### Bugs / security (auth & access control)

- [x] **[Severity: High] [BROKEN AT RUNTIME]** `wed-backend/src/routes/face.ts:79` — handler calls `await fsp.readFile(...)` but `fsp` is never imported (only `import fs from 'fs'` at line 2). The `/api/face/search` endpoint will throw `ReferenceError: fsp is not defined` on every selfie upload. Add `import { promises as fsp } from 'fs'` (or use the already-imported `fs.promises`).

- [x] **[Severity: Med] [PARTIAL — DEAD CODE w/ UNDEFINED REFERENCE]** `wed-backend/src/routes/shareLink.ts:147-156` — a second `checkPasscodeRateLimit()` was added that calls an undefined `bumpAttempts()` helper. The function is unreachable today (call sites at lines 365 and 474 use the working async version at line 120), but it indicates an incomplete refactor and the per-IP throttling promised by the original cleanup never runs. Either delete the dead block or finish the per-IP implementation.

- [x] **[Severity: Med] [PARTIAL]** `wed-backend/src/middleware/errorHandler.ts:19` — production-only generic message is only applied to non-4xx errors; raw `err.message` is still echoed for any 4xx (including `403 Forbidden` / `404 Not Found`). Internal Mongoose / AWS error messages can still leak under those status codes. Tighten the sanitizer to only echo messages that opt-in via `err.expose === true`.

- [x] **[Severity: Med] [PARTIAL]** `wed-backend/src/routes/face.ts` & `wed-backend/src/index.ts:28-40` — multer now has `limits.fileSize` and an image `fileFilter`, but `fs.unlink` only runs in the `finally` block. Combined with the `fsp` runtime crash above, the temp file is still leaked on the success path (handler throws before `finally` is reached because of the missing import).

- [x] **[Severity: Med] [PARTIAL]** `wed-backend/src/routes/photo.ts:353-356` — cursor pagination was added, but `Photo.countDocuments(filter)` still runs on every first-page request (no cursor). On 10k-photo albums each first page still pays the heavy count. Drop the count, cache it, or compute it lazily.

- [x] **[Severity: Med] [PARTIAL]** `wed-backend/src/routes/shareLink.ts:160-238` — album list now uses one `$lookup` aggregation for cover thumbnails, but `buildSignedReadUrl()` is still called in a per-album loop (~line 228). Per-album signing is the remaining N+1 cost; consider batching or returning unsigned keys plus a single signing helper.

### Code quality / design

- [x] **[Severity: Med] [PARTIAL]** `wed-backend/package.json` and `wed-backend/src/config/rekognition.ts:7` — `aws-sdk` v2 was removed from `package.json` (good), but `rekognition.ts` still has `import AWS from 'aws-sdk'`. With the dependency gone the import will fail at build time on a clean install. Delete the stale import.

- [x] **[Severity: Low] [PARTIAL]** `wed-backend/src/services/` — TV routes were extracted to `tvPairService.ts` / `tvMediaService.ts`, but `photo.ts` and `album.ts` still mix validation, DB access and S3 calls inline. The promised `photoService.ts` / `albumService.ts` were not created.

- [x] **[Severity: Low] [PARTIAL]** `wed-backend/src/routes/shareLink.ts` — `shareLinkPage.ts` was split out for HTML render, but `shareLink.ts` is still 659 lines. Slug / token helpers (`twoLetters`, `buildSlug`, `hashToken`, URL builders, JWT helpers) remain inline. Move them to a dedicated helper module.

- [x] **[Severity: Low] [PARTIAL]** `wed-backend/src/config/env.ts:56` and `wed-backend/src/routes/photo.ts:159` — `STORAGE_CAP_GIB` was added to `env.ts`, but `photo.ts:159` still hardcodes `300 * 1024 * 1024 * 1024`. Wire the route to read from `env.STORAGE_CAP_GIB`.

- [x] **[Severity: Low] [NOT FIXED]** `wed-backend/src/utils/helpers.ts:16-28` — `toAlbumId` and `toUserId` (Strapi-era `Number(...)` casters) are still exported despite zero usages. Remove them.

---

## Status legend
- **NOT FIXED** — issue still exists in the cited code.
- **PARTIAL** — addressed but incomplete or with a new defect.
- **BROKEN AT RUNTIME** — fix introduces a guaranteed runtime error that will fire on first invocation.
