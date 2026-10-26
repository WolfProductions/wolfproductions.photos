/**
 * Previews of the originals, for the photo picker of the forms. They are
 * made on request for the admin and kept in memory only, so nothing ends up
 * under VARIANTS_ROOT, where /media would serve it.
 *
 * Most cameras store a small preview in the EXIF data. Reading it takes only
 * the start of the file, which is quick over the NAS share; a photo without
 * one is read whole and resized.
 */
const fs = require('fs')
const exifr = require('exifr')
const { HttpError } = require('./library')

/* The longest side of a preview. */
const SIZE = 320
const CACHE_BYTES = 64 * 1024 * 1024

/* Loaded here, so the API keeps running on a machine where sharp cannot. */
let sharpModule
function loadSharp() {
  if (sharpModule === undefined) {
    try {
      sharpModule = require('sharp')
    } catch (err) {
      sharpModule = null
    }
  }
  return sharpModule
}

/* Previews by file and version, least recently used first. */
const cache = new Map()
let cacheBytes = 0
const pending = new Map()

function remember(id, preview) {
  cache.set(id, preview)
  cacheBytes += preview.data.length
  for (const [oldId, old] of cache) {
    if (cacheBytes <= CACHE_BYTES) break
    cache.delete(oldId)
    cacheBytes -= old.data.length
  }
}

/* The part of the EXIF preview that shows the photo, without the black bars some cameras add. */
function cropTo(preview, photo) {
  const ratio = photo.width / photo.height
  const box = { left: 0, top: 0, width: preview.width, height: preview.height }
  if (preview.width / preview.height > ratio * 1.02) {
    box.width = Math.round(preview.height * ratio)
    box.left = Math.floor((preview.width - box.width) / 2)
  } else if (preview.width / preview.height < ratio / 1.02) {
    box.height = Math.round(preview.width / ratio)
    box.top = Math.floor((preview.height - box.height) / 2)
  }
  return box
}

const resize = (image) =>
  image
    .resize({
      width: SIZE,
      height: SIZE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 70 })
    .toBuffer()

async function embeddedPreview(source) {
  let data
  try {
    data = await exifr.thumbnail(source.abs)
  } catch (err) {
    /* Not every format has EXIF data. */
  }
  if (!data) return null

  const sharp = loadSharp()
  /* Without sharp it is sent as it is stored, possibly on its side. */
  if (!sharp) return { data: Buffer.from(data), type: 'image/jpeg' }

  const photo = await sharp(source.abs).metadata()
  const stored = await sharp(data).metadata()
  if (!photo.width || !photo.height) return null

  /* The preview is stored the way the photo is: crop it, then let sharp turn it upright, as it does the variants. */
  const cropped = await sharp(data, { failOn: 'error' })
    .extract(cropTo(stored, photo))
    .withMetadata({ orientation: photo.orientation || 1 })
    .jpeg({ quality: 95 })
    .toBuffer()
  return { data: await resize(sharp(cropped).autoOrient()), type: 'image/webp' }
}

async function resizedPreview(source) {
  const sharp = loadSharp()
  if (!sharp) throw new HttpError(404, 'no-preview')
  const image = sharp(source.abs, { failOn: 'error' }).autoOrient()
  return { data: await resize(image), type: 'image/webp' }
}

async function make(source) {
  /* A vector image is its own preview; it is only ever shown with <img>, where it runs no scripts. */
  if (source.abs.toLowerCase().endsWith('.svg'))
    return {
      data: await fs.promises.readFile(source.abs),
      type: 'image/svg+xml'
    }
  try {
    /* A damaged EXIF preview is no reason to give up on the photo. */
    const embedded = await embeddedPreview(source).catch(() => null)
    return embedded || (await resizedPreview(source))
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(
      err.code ? 503 : 422,
      err.code ? 'failed' : 'unreadable'
    )
  }
}

/**
 * The preview of an original, as found by library.statSource(): { data, type }.
 * A changed file gets a new preview.
 */
async function previewOf(source) {
  const id = `${source.abs}:${source.mtimeMs}:${source.size}`
  const cached = cache.get(id)
  if (cached) {
    cache.delete(id)
    cache.set(id, cached)
    return cached
  }

  /* The picker may ask for the same photo twice at once. */
  if (!pending.has(id))
    pending.set(
      id,
      make(source)
        .then((preview) => {
          remember(id, preview)
          return preview
        })
        .finally(() => pending.delete(id))
    )
  return pending.get(id)
}

module.exports = { previewOf }
