# Wedding Photos Platform — Project Overview

## What the product does

A platform that gives couples a seamless way to store, organize, and share their wedding photos. Couples buy a subscription, photographers upload the photos, and wedding guests view them — all tied together by access links and an AI facial recognition feature so each guest can instantly find photos of themselves.

---

## User roles

There are three types of users in the system:

### 1. Couple (primary / paying user)
- Purchases a subscription (via the app or the website).
- Generates two kinds of access links:
  - One for the **photographer** so they can upload photos.
  - One for **wedding guests** so they can view photos.
- Uses a **swipe-to-select** feature on photos:
  - When the couple swipes up on a photo inside a folder (e.g. "Wedding"), a "Selected" subfolder is auto-created for that folder.
  - Every swiped photo is added there. Example: swipe 20 photos in the Wedding folder → a "Wedding / Selected" folder is created with those 20 photos. The couple shares this with the photographer to indicate which photos go into the wedding album.

### 2. Photographer
- Receives an access link from the couple.
- Uploads wedding photos into the folders set up by the couple.
- Bulk upload is supported (primarily through the website).

### 3. Wedding Guest
- Receives a view-only access link from the couple.
- Browses the couple's wedding photos.
- Can use **AI facial recognition**: takes a selfie or uploads a photo of themselves, and the system filters and shows only the photos in which that guest appears.

---

## Repos

The product is split across four repos.

### `wed-app`
The main **mobile app** used by couples and guests.
- Subscription purchase flow for couples.
- Folder creation, photo browsing, and the swipe-to-select feature.
- Guest view via access link.
- Facial recognition entry point for guests (capture/upload selfie → filtered gallery).

### `wed-backend`
The **backend / API layer** powering everything.
- Auth, subscriptions, and access link generation/validation.
- Folder and photo storage, including the auto-created "Selected" subfolders driven by swipe events.
- AI facial recognition service (face embedding + matching against the wedding's photo set).
- Session management for the TV pairing flow (QR-based handoff).
- Serves data for `wed-app`, `tv-app`, and `wedding-website`.

### `wedding-website`
The **web property** for the platform.
- Marketing + subscription purchase (alternative to in-app purchase).
- Photographers land here via the couple's access link to **bulk upload** photos to the assigned folders.
- Guests can also be redirected here via the couple's access link to view photos.

### `tv-app`
A **TV application** so couples and guests can view photos on a big screen.
- Installed on the TV.
- Displays a QR code on launch.
- The user scans the QR code from the mobile app → the session is fetched from `wed-backend` → the photos load on the TV.

---

## Key feature flows (cross-repo)

**Swipe-to-select album curation**
`wed-app` (swipe gesture) → `wed-backend` (creates/updates the `<folder>/Selected` subfolder and moves the photo reference into it) → photographer sees the selection list.

**AI facial recognition for guests**
`wed-app` (guest captures/uploads selfie) → `wed-backend` (face embedding + match against the wedding's photo set) → filtered gallery returned to the guest.

**TV viewing via QR**
`tv-app` shows a QR code → `wed-app` scans it → `wed-backend` pairs the session → `tv-app` fetches and displays the photos.

**Photographer bulk upload**
`wedding-website` (photographer enters via access link) → `wed-backend` (validates link, accepts bulk upload, places photos in the correct folders) → couple sees them in `wed-app`.

**Subscription + access links**
Couple subscribes via `wed-app` or `wedding-website` → `wed-backend` issues subscription + generates two access links (photographer link and guest link) → couple shares them.