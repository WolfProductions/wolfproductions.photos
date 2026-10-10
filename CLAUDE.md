# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A photo gallery (live at wolfproductions.photos) that groups albums under organisations; each album is split into titled sections of photos. The repo holds two independent npm packages: a Vue 3 SPA at the root and an Express/MongoDB API in `backend/`.

## Commands

Frontend (repo root):

- `npm run dev` — Vite dev server on port 3000, exposed on the LAN (`--host`)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/`
- `npx prettier --write src` — format (there is no npm script for it)

Backend (`backend/` has its own `package.json`, lockfile and `node_modules`):

- `cd backend && node index.js` — there is no start script; the port is hard-coded to 3002 (the port nginx proxies `/api/` to in production). Run it from `backend/` because dotenv reads `.env` from the cwd. `backend/.env` is gitignored and must provide `MONGODB_URI` (the existing one builds it from `MONGODB_USER` / `MONGODB_PASS` / `MONGODB_CLUSTER` / `MONGODB_DATABASE` via dotenv-expand).

There are no tests and no linter in either package.

## Things that will bite you

- **The dev frontend talks to production.** Every axios call hard-codes `https://wolfproductions.photos/api/...`; there is no env var or Vite proxy. `npm run dev` reads and writes live data, and a locally running backend is not used unless you change those URLs. (The backend's CORS allowlist is the production origin plus `http://localhost:3000`.)
- **There is no authentication.** The `/create` and `/edit` routes and the POST/PUT endpoints are open; the edit entry points are merely hidden in the UI (commented-out links, and a pencil icon in `GalleryMenu.vue` that is `md:hidden`).
- **Dependencies are 2022-era majors** (Vite 2, Vue 3.2, Tailwind 3.1, Heroicons v1, Headless UI 1.6, Mongoose 6). Write against those APIs: Heroicons uses the v1 import paths and names (`@heroicons/vue/solid`, `MenuAlt2Icon`), and `backend/index.js` uses a Mongoose callback (`Album.findById(id, cb)`) that Mongoose 7+ removed.
- `AlbumForm.vue` imports `@aws-sdk/credential-provider-cognito-identity`, which is not in the root `package.json` — it only resolves as a transitive dependency of `@aws-sdk/credential-providers`.

## Architecture

### Data model and API

Mongoose schemas live in `backend/models/`, all routes in `backend/index.js`.

- `Organisation { title, logo, cover }`
- `Album { title, date, cover, sections: [{ title, photos: [key] }], organisation }`

Every image field (`logo`, `cover`, `photos[]`) is an **S3 object key**, not a URL. The app never uploads photos; they are put in the bucket out of band and the album form only references existing keys.

API quirks: there is no endpoint to create organisations (they are inserted into MongoDB directly) and no delete endpoints. `PUT /api/album/:album_id` looks the album up by `req.body._id` and ignores the URL param. Deployment / reverse-proxy config is not in this repo.

### Images

- Photos live in the S3 bucket `wolfproductions.photos` (eu-west-1) and are displayed through a CloudFront image-resizing endpoint whose URL is the base64 of a JSON request: `${CloudFrontUrl}/${btoa(JSON.stringify({ bucket, key, edits: { resize: { width } } }))}`.
- That logic is a `getPhotoUrl(key, width)` method **copy-pasted into every component that shows an image**, each with a different default width (32–800). There is no shared helper, so a bucket/CDN change must be made in every copy. `views/Albums.vue` is the odd one out: it builds a direct S3 URL for the logo.
- `components/albums/AlbumForm.vue` browses the bucket straight from the browser: an `S3Client` with unauthenticated Cognito Identity Pool credentials (pool in eu-central-1, bucket in eu-west-1) runs `ListObjectsV2` with `Delimiter: '/'`, and a watcher on `prefix` reloads the listing for folder navigation. For every file it then downloads a 32px rendition and parses EXIF `CreateDate` so the picker sorts chronologically; `created: 1000` is the sentinel for folders and files without EXIF.

### Frontend flow

Routes (`src/router/index.js`) mirror the hierarchy, with Mongo ObjectIds as params: `/` organisations → `/:organisation_id` albums → `/:organisation_id/:album_id` gallery, plus `/:organisation_id/create` and `/:organisation_id/:album_id/edit`. Views are thin page shells; the logic is in `src/components/`. `AlbumForm` serves both create and edit, switching on `$route.params.album_id`.

Gallery state (`src/components/gallery/`):

- `Gallery.vue` fetches the album and hands the same object to `GalleryHeader`, `GalleryMenu` and `GalleryPhotos`. It adds a client-only `active` flag to each section (first one active). `GalleryMenu` switches sections by mutating that prop directly, and `GalleryPhotos` deep-watches `album` to rebuild its photo list.
- `Gallery.vue` overwrites `album.date` with a relative string (`fromNow()`) and keeps the real value in `album.originalDate`; anything that PUTs the album back must send `originalDate`.
- The section title `'Highlights'` is a magic string: it is the default first section in `AlbumForm` and the section `switchFavorite` adds photos to / removes them from (the heart UI that triggers it is currently commented out in `GalleryPhotos.vue`).
- Gallery photo order is the stored order of keys in `section.photos`. The `created` sort in `GalleryPhotos.getPhotos()` is a no-op because `created` is never set there.
- PhotoSwipe needs image dimensions up front. Photos start with a 1920×1000 placeholder and `setDimensions` corrects `data-pswp-width/height` on the parent `<a>` from the thumbnail's aspect ratio when it loads.

## Conventions

- Vue SFCs use the Options API (`data` / `mounted` / `methods`), not `<script setup>`.
- Styling is Tailwind utility classes only (plugins: typography, forms, line-clamp, aspect-ratio), with Headless UI for interactive primitives. The accent colour is red/rose.
- Prettier: no semicolons, single quotes, no trailing commas; `prettier-plugin-tailwindcss` sorts class names.
- The page shells in `src/views/` started as Tailwind UI templates. `Organisations.vue` still carries the template's placeholder sidebar data (`navigation`, `projects`, `activity`) and non-functional Search/Create controls, and `/home` is a leftover test page.
