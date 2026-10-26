/**
 * The photo library: the originals under PHOTOS_ROOT.
 *
 * A photo key is a path relative to PHOTOS_ROOT with forward slashes, for
 * example 'WolfProductions/2022-05-21 - Bandjes Oerknal/blue_king-044.jpg'.
 */
const fs = require('fs')
const path = require('path')
const exifr = require('exifr')
const { PHOTOS_ROOT } = require('./config')

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tif',
  '.tiff',
  '.avif'
]

/* An error that is sent to the client as { error: code } with this status. */
class HttpError extends Error {
  constructor(status, code, details) {
    super(code)
    this.status = status
    this.code = code
    this.details = details
  }
}

/* Whether a key or file name is one of the photos the picker shows. */
const isImage = (name) =>
  IMAGE_EXTENSIONS.includes(path.posix.extname(name).toLowerCase())

/* Dotfiles, Synology's @eaDir and #recycle. */
const isHidden = (name) => /^[.@#]/.test(name)

function isValidSegment(name) {
  if (!name || name == '.' || name == '..') return false
  if (/[\\\x00-\x1f\x7f]/.test(name)) return false
  if (process.platform == 'win32' && name.includes(':')) return false
  return !isHidden(name)
}

/**
 * Validate a key. Every path that comes from a request or from the database
 * goes through here before it touches the disk.
 */
function parseKey(key) {
  if (typeof key != 'string' || !key.split('/').every(isValidSegment))
    throw new HttpError(400, 'invalid-key', { keys: [key] })
  return key
}

/* The real location of the library. Fails when the share is not mounted. */
async function libraryRoot() {
  try {
    return await fs.promises.realpath(PHOTOS_ROOT)
  } catch (err) {
    throw new HttpError(503, 'library-unavailable')
  }
}

/* An empty root is what a mount point looks like while the NAS is off. */
async function isAvailable() {
  try {
    const root = await libraryRoot()
    return (await fs.promises.readdir(root)).length > 0
  } catch (err) {
    return false
  }
}

/**
 * Look up the original of a key. Returns null when it is missing, is not a
 * file, or resolves to somewhere else (a symlink, or different casing on a
 * case-insensitive file system).
 */
async function statSource(key) {
  try {
    const root = await libraryRoot()
    const abs = path.join(root, ...parseKey(key).split('/'))
    const stat = await fs.promises.stat(abs)
    if (!stat.isFile()) return null
    if ((await fs.promises.realpath(abs)) != abs) return null
    return { abs, mtimeMs: Math.round(stat.mtimeMs), size: stat.size }
  } catch (err) {
    return null
  }
}

/* Run an async function over a list with a limit on how many run at once. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

/* The date a photo was taken, per file and modification time. */
const takenAtCache = new Map()

/**
 * Read when a photo was taken as 'YYYY-MM-DDTHH:mm:ss'. EXIF dates carry no
 * time zone, so the camera's wall clock time is passed on as it is.
 */
async function readTakenAt(abs) {
  try {
    const stat = await fs.promises.stat(abs)
    const version = `${Math.round(stat.mtimeMs)}:${stat.size}`
    const cached = takenAtCache.get(abs)
    if (cached && cached.version == version) return cached.takenAt

    let takenAt = null
    try {
      const tags = await exifr.parse(abs, {
        pick: ['DateTimeOriginal', 'CreateDate'],
        reviveValues: false
      })
      const date = tags && (tags.DateTimeOriginal || tags.CreateDate)
      const match =
        typeof date == 'string' &&
        date.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
      if (match)
        takenAt = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
    } catch (err) {
      /* Not every format has EXIF data. */
    }

    if (takenAtCache.size > 50000) takenAtCache.clear()
    takenAtCache.set(abs, { version, takenAt })
    return takenAt
  } catch (err) {
    return null
  }
}

/* List the subfolders and photos of one folder of the library. */
async function listFolder(folder) {
  const segments = folder == '' ? [] : parseKey(folder).split('/')
  const root = await libraryRoot()
  const abs = path.join(root, ...segments)

  let entries
  try {
    entries = await fs.promises.readdir(abs, { withFileTypes: true })
  } catch (err) {
    if (err.code == 'ENOENT' || err.code == 'ENOTDIR')
      throw new HttpError(404, 'not-found')
    throw new HttpError(503, 'library-unavailable')
  }
  entries = entries.filter((entry) => isValidSegment(entry.name))

  const compareNames = (a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })

  /* Symlinks are neither a file nor a directory here, so they are left out. */
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: [...segments, entry.name].join('/')
    }))
    .sort(compareNames)

  const images = entries.filter(
    (entry) => entry.isFile() && isImage(entry.name)
  )
  const files = await mapLimit(images, 8, async (entry) => ({
    name: entry.name,
    key: [...segments, entry.name].join('/'),
    takenAt: await readTakenAt(path.join(abs, entry.name))
  }))
  files.sort(
    (a, b) =>
      (a.takenAt || '').localeCompare(b.takenAt || '') || compareNames(a, b)
  )

  return {
    path: segments.join('/'),
    parent: segments.length ? segments.slice(0, -1).join('/') : null,
    folders,
    files
  }
}

module.exports = {
  HttpError,
  parseKey,
  isImage,
  libraryRoot,
  isAvailable,
  statSource,
  listFolder,
  mapLimit
}
