# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A photo gallery (live at wolfproductions.photos) that groups albums in a tree of folders; each album is split into titled sections of photos. Organisations were replaced by folders; old organisation links redirect to the top-level folder with the same id. The repo holds two independent npm packages: a Vue 3 SPA at the root and an Express/MongoDB API in `backend/`. The photos are self-hosted: the originals are read from a folder (a mounted NAS share) and resized variants are generated once and served from disk.

## Commands

Frontend (repo root):

- `npm run dev` — Vite dev server on port 3000, exposed on the LAN (`--host`). It proxies `/api` and `/media` to the backend on `localhost:3002`, so start that too.
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/`
- `npx prettier --write src` — format (there is no npm script for it)

Backend (`backend/` has its own `package.json`, lockfile and `node_modules`; needs Node 20.9+ for `sharp`):

- `cd backend && npm start` — runs `node index.js` on `PORT` (default 3002). When a built `dist/` exists next to `backend/`, the same process also serves the frontend, so in production the whole site is this one process.
- `npm run variants` — bring the variants on disk in line with the database, then exit. `npm run variants -- --prune` also removes variants of photos nothing refers to any more. The backend does the same (without pruning) at every start. The first run after variants were renamed to publicIds moves the old files instead of remaking them, deletes what is left of the old layout, and only makes the missing `small` variant.
- `node scripts/import-organisations.js <url of an /api/organisations endpoint>` — copy organisations (same ids) into the configured database.
- `node scripts/migrate-folders.js [--apply]` — turn every organisation into a private top-level folder with the same id and put each album in it (albums without one go into a private `Ongesorteerd`). Without `--apply` it only prints the plan; running it again changes nothing. Try it on a copy of the database first.

The migration, the folder screens and sharing go live together: deploying them without running the migration leaves the site without folders.

Configuration is `backend/.env` (gitignored; see `backend/.env.example`): the `MONGODB_*` variables, `PHOTOS_ROOT`, `VARIANTS_ROOT` and `ADMIN_TOKEN`. `backend/.env.local` (also gitignored) is loaded first and wins; use it on a development machine to point at a separate database (`MONGODB_DATABASE=..._dev`) and local folders. The backend prints the database name at startup and refuses to start without an `ADMIN_TOKEN` of 16+ characters or when the two roots overlap.

There are no tests and no linter in either package.

## Things that will bite you

- **`backend/.env` holds the production database credentials.** Without a `.env.local` that overrides `MONGODB_DATABASE`, a locally started backend reads and writes live data.
- **Admin routes need the token.** `GET /api/library` (and its previews), `GET /api/folders` and every POST/PUT/DELETE require `Authorization: Bearer <ADMIN_TOKEN>`. The frontend keeps it in `localStorage` (`adminToken`) and sends it on every request; it is entered with the log-in icon in the top bar, or asked for with a `window.prompt` on a 401. The `new` and `edit` pages themselves are reachable by anyone; they just cannot browse or save.
- **Visitors only see what is public, or what a share link points at.** Read routes check `tree.canView`: without the token or a covering share link, a private folder or album answers 404 and is left out of lists. After `migrate-folders.js` everything is private, so the site looks empty to visitors until folders are made public or shared. `/media` checks nothing: it is protected only by the random publicIds, so a variant URL someone already has keeps working after their link is revoked.
- **Read routes never return keys.** Images in responses are refs (`publicId`, plus `.svg` for vector images), `photoMeta` is keyed by ref, and the forms read keys from the admin-only `/source` routes. Never PUT a read response back; it would store refs as keys.
- **Dependencies are 2022-era majors** (Vite 2, Vue 3.2, Tailwind 3.1, Heroicons v1, Headless UI 1.6, Mongoose 6). Write against those APIs: Heroicons uses the v1 import paths and names (`@heroicons/vue/solid`, `MenuAlt2Icon`). `sharp` is current and is the reason for the Node version.
- **`sharp` needs a CPU with SSE4.2 (or ARM64).** It does not run on the NAS itself (Synology DS412+, Atom D2700); the NAS only stores the originals. `variants.js` requires `sharp` lazily, so the API and `/media` keep working on a machine without it.
- **Stop `npm run dev` before `npm run build` on Windows.** The dev server watches `dist/`, and the build then fails with `EPERM ... mkdir dist\assets`.
- **The variant definitions exist twice**: names, sizes and formats in `backend/variants.js` (`VARIANTS`), names and file extensions in `src/utils/photos.js` (`small` is only for downloads). Changing a size does not regenerate existing files; empty `VARIANTS_ROOT` and restart (or run `npm run variants`) to rebuild.

## Architecture

### Data model and API

Mongoose schemas live in `backend/models/` (registered in `models/index.js`), all routes in `backend/index.js`.

- `Folder { title, description, parent, ancestors: [id], cover, logo, photos: [key], order, sort, visibility }` — `parent` is null at the top level; `ancestors` lists every folder above, top level first, so a subtree is one query (`{ ancestors: id }`). `photos` are loose photos next to the subfolders and albums.
- `Album { title, date, cover, sections: [{ title, photos: [key] }], folder, ancestors, order, visibility, organisation }` — `ancestors` ends with `folder`; `organisation` is left over from before folders and no longer read.
- `visibility` is `inherit` (default), `private` or `public`; `inherit` takes the nearest folder above that has a setting, and nothing set means private (`tree.visibilityOf`). A folder's logo is inherited the same way (`tree.logoOf`); a folder without a cover shows the newest album cover below it that the viewer may see (`tree.folderCard`).
- `Settings { homepage: 'folders' | 'portfolio', portfolio: { title, intro, hero, photos: [key], featured: [{ kind, id }] } }` — one document. Only public folders and albums can be featured (`PUT /api/settings` refuses others with `featured-not-public`, and `GET /api/settings` drops what has become private since). Its keys count as referenced.
- `Organisation { title, logo, cover }` — kept until the migration is cleaned up; its keys still count as referenced.
- `Photo { key, publicId, status: 'pending' | 'ready' | 'error', width, height, sourceMtimeMs, sourceSize, error }` — one record per key that a folder, album or organisation refers to; `width`/`height` are those of the `large` variant. `publicId` is 22 random characters, made once; the variants are named after it.
- `Share { token, label, target: { kind: 'folder' | 'album', id }, passwordHash, expiresAt, allowDownload }` — a share link `/s/<token>`. A folder link covers everything below the folder (`shares.covers`). Deleting a link, or the folder or album, revokes it.

Every image field (`logo`, `cover`, `photos[]`) is a **key**: a path relative to `PHOTOS_ROOT` with forward slashes, e.g. `WolfProductions/2022-05-21 - Bandjes Oerknal/blue_king-044.jpg`. The app never uploads photos; they are copied onto the NAS out of band and the album form only references existing files. `library.parseKey()` is the single validator every key passes before it touches the disk (no `..`, no backslashes, no segments starting with `.`, `@` or `#`).

Folder routes: `GET /api/folders/root`, `GET /api/folders/:id` (the folder with `breadcrumb`, `folders`, `albums`, `photos` + `photoMeta`, `canDownload`), `GET /api/folders` (admin: every folder as a flat list with its `path`, for the pickers), `GET /api/folders/:id/source` (admin: the folder with keys), `POST /api/folders`, `PUT /api/folders/:id` (a changed `parent` moves the whole subtree, `tree.moveSubtree`; a parent below the folder is refused), `DELETE /api/folders/:id` (only when empty, else 409), `PUT /api/folders/:id/cover { ref }` (admin: one of its loose photos becomes the cover). Album routes: `GET/PUT/DELETE /api/albums/:id`, `GET /api/albums/:id/source` (admin), `POST /api/albums` with `folder`, `PUT /api/albums/:id/cover { ref }` (admin: one of its photos becomes the cover; the star button in the lightbox, also on loose photos in a folder). `GET /api/albums/:id` returns the album with refs, its inherited `logo`, its `breadcrumb`, `canDownload`, `photoMeta: { [ref]: { status, width, height } }` and `photoStats: { total, ready, pending, error }`. `GET /api/session` answers `{ admin, shared }` (cards of what the request's share links point at). Tree logic (visibility, breadcrumb, cards, moving) is in `backend/tree.js`, which loads all folders at once. Async handlers are wrapped (`wrap()`) and errors end in one handler that only exposes `HttpError` codes.

Settings routes: `GET /api/settings` (everyone: the homepage choice and the portfolio with refs, `featured` cards and `photoMeta`), `GET /api/settings/source` (admin: with keys, plus `candidates`, the public folders and albums that can be featured), `PUT /api/settings` (admin).

Sharing (`backend/shares.js`): admin routes `GET /api/shares?target=`, `POST /api/shares`, `PUT /api/shares/:id` (label, `password` (null removes it), `expiresAt` (a date means the end of that day), `allowDownload`), `DELETE /api/shares/:id`. `GET /api/s/:token` says where a link points; for a link with a password `POST /api/s/:token { password }` returns the access string `<token>.<hmac>` (403 on a wrong password, never 401, which would make the frontend ask for the admin token; 429 after ten wrong ones). The visitor sends their links as `X-Share-Token` (comma separated, ten at most); `viewerOf(req)` turns that into `{ admin, shares }`. The HMAC is keyed on `ADMIN_TOKEN` and the password hash, so changing either ends existing access.

### Images

- `backend/library.js` reads the originals: `listFolder()` backs the picker (`GET /api/library?path=`, image extensions only, sorted on EXIF date read with `exifr`; `POST /api/library/dates { keys }` gives the same dates for any keys), `statSource()` resolves a key and returns null for anything missing or resolving elsewhere (symlinks, wrong case).
- `backend/previews.js` makes what the picker shows before a photo is in anything: `GET /api/library/preview?key=` (admin) answers a WebP of at most 320 px. It comes from the preview cameras store in the EXIF data (only the start of the file is read, which is quick over the NAS share), cropped to the photo's shape and turned upright with `autoOrient`, or else from the whole original. Previews are kept in memory only (64 MB), never under `VARIANTS_ROOT`, where `/media` would serve them, and answer 304 while the file is unchanged. Without `sharp` the EXIF preview is sent as it is stored.
- `backend/variants.js` makes four variants per photo with `sharp`: `thumb` (covers 480×320, WebP), `medium` (covers 960×640, WebP), `large` (fits in 2048×2048, JPEG) and `small` (fits in 1024×1024, JPEG, only for downloads). EXIF orientation is applied, nothing is enlarged, metadata is stripped. SVG files are copied unchanged. Files are written to `<VARIANTS_ROOT>/<variant>/<publicId>.<ext>` via a temporary dot name and served by `express.static` as `/media/<variant>/<ref>.<ext>`.
- Variants are only made for keys that are registered: saving an album registers its keys (`registerKeys`, cover first) and returns without waiting; `syncAll()` at startup registers everything the database refers to and queues what is new, changed (source mtime/size) or missing on disk. There is no on-demand generation of variants, and the only routes into `PHOTOS_ROOT` besides the admin's previews are the library listing and `GET /api/photos/:ref/download?size=original|2048|1024`, which needs the admin token or a share link with `allowDownload` that covers an album or folder the photo is in (`tree.canDownload`); 2048 and 1024 come from the `large` and `small` variants, so they work while the NAS is off. Taking a photo out of an album prunes its variants unless something else still refers to it.
- The queue is in-process and sequential. A photo that is online stays online when its original disappears, is replaced by something unreadable, or the library is unreachable; a file modified less than a minute ago is retried later (it may still be copying).
- The frontend builds URLs with `getPhotoUrl(ref, variant)` and downloads with `downloadPhoto(ref, size)` (through axios, so the token and share links are sent) from `src/utils/photos.js`; components expose `getPhotoUrl` through `methods`.

### Frontend flow

Routes (`src/router/index.js`), with Mongo ObjectIds as params: `/` the homepage (`Home.vue` shows `Portfolio.vue` or `Folders.vue`, as `GET /api/settings` says), `/folders` the top-level folders, `/portfolio/edit` the homepage form, `/f/:folder_id` a folder (subfolders, albums, loose photos), `/a/:album_id` the gallery, plus `/f/new?parent=`, `/f/:id/edit`, `/a/new?folder=` and `/a/:id/edit`. The old links (`/:organisation_id`, `/:organisation_id/:album_id`, …) redirect to these. Views are thin page shells with `TopBar` (logo, breadcrumb, admin buttons in its slot); the logic is in `src/components/`. All API calls go through the axios instance in `src/api.js` (relative `/api`).

- `src/session.js` holds `session.admin` and `session.shared`, checked against `GET /api/session` at startup, on log in/out (the icon in `TopBar`) and after opening a share link. Admin buttons, the visibility badges and the Share buttons only show for the admin; the pages reload when it changes.
- Share links: `/s/:token` (`ShareLink.vue`) asks for the password if there is one, stores the access string in `localStorage` (`shareLinks`, via `src/shareLinks.js`) and opens the target. `src/api.js` sends every stored link as `X-Share-Token`. Home lists them under Shared with you. `ShareDialog` (from the folder page and the gallery menu) makes, changes and deletes the links of one folder or album.
- `AlbumForm` and `FolderForm` serve both create and edit, switching on the route param. Every photo field in them and in `PortfolioForm` is an `ImageField` (`src/components/library/`): a preview of the choice, and a `PhotoPickerDialog` with a `LibraryBrowser`, which loads a library folder into `LibraryPicker` (a grid or list, remembered in `localStorage` as `libraryView`; one key, or several in click order with shift-click and select-all; `readonly` only browses). The dialog only passes the choice on with Done. Each form keeps one `prefix` (the library folder being browsed) shared by its fields; when editing, the library opens at the folder of the first photo, and a field with one photo opens at that photo's folder.
- A new album starts with `AlbumStart`: browse to the NAS folder of the album, and a name like `2022-05-21 - Bandjes Oerknal` fills in the title and date (otherwise the name is the title and the date that of the first photo), its photos go in the first section, and the next new album opens next to it (`localStorage` `albumStartFolder`). "Start empty" skips it. The sections are cards with their photos in gallery order (`SectionPhotos`: drag or use the arrows to move one, the star makes it the cover, `+N more` opens up a long section); one `PhotoPickerDialog` serves them all and labels photos that are already in another section. "Sort by date taken" asks `POST /api/library/dates`, because a section can hold photos from several folders. `AlbumEdit` asks before leaving with changes that were not saved (`mayLeave()`, and `beforeunload`); Enter in a field does not save.
- `LibraryPreview` shows one preview by key. An `<img>` cannot send the admin token, so `loadPreview`/`releasePreview` (`src/utils/library.js`) fetch them through axios as object URLs, six at a time and only while on screen, and keep up to 1500.
- Loose photos in a folder reuse `GalleryPhotos` with a one-section stand-in album.

Gallery state (`src/components/gallery/`):

- `Gallery.vue` fetches the album and hands the same object to `GalleryHeader`, `GalleryMenu` and `GalleryPhotos`. It adds a client-only `active` flag to each section (first one active). `GalleryMenu` switches sections by mutating that prop directly, and `GalleryPhotos` deep-watches `album` to rebuild its photo list.
- While `photoStats.pending` is non-zero, `Gallery.vue` shows a progress line and polls the album every few seconds, replacing only `photoMeta` and `photoStats` so the active section is kept. `GalleryPhotos` only renders photos whose status is `ready`.
- `Gallery.vue` overwrites `album.date` with a relative string (`fromNow()`) and keeps the real value in `album.originalDate`; anything that PUTs the album back must send `originalDate`.
- The section title `'Highlights'` is the default first section in `AlbumForm`. (The old favourite heart that wrote to it is gone: the gallery only has refs, so it cannot save the album.)
- Gallery photo order is the stored order of keys in `section.photos`; the response keeps it.
- PhotoSwipe reads `data-pswp-width/height` from each `<a>`; they come from `photoMeta`. `data-cropped` is set because the thumbnails are CSS-cropped to 3:2. `data-ref` holds the ref. When `album.canDownload`, a custom toolbar button opens a menu with Original / 2048 px / 1024 px for the current slide.

### Deployment

Production runs this version at home: one Node process in a Proxmox LXC container with the NAS share mounted read-only as `PHOTOS_ROOT` and the variants on the container's own disk, so galleries keep working while the NAS is off (only browsing and downloading originals need it).

## Conventions

- Vue SFCs use the Options API (`data` / `mounted` / `methods`), not `<script setup>`.
- Styling is Tailwind utility classes only (plugins: typography, forms, line-clamp, aspect-ratio), with Headless UI for interactive primitives. The accent colour is red/rose.
- Prettier: no semicolons, single quotes, no trailing commas; `prettier-plugin-tailwindcss` sorts class names.
