/**
 * The variants: resized copies of the photos that albums, folders and
 * organisations refer to. They are made once, stored under VARIANTS_ROOT as
 * <variant>/<key>.<extension> and served from there as /media.
 */
const fs = require('fs')
const path = require('path')
const config = require('./config')
const library = require('./library')
const { Organisation, Folder, Album, Photo } = require('./models')

/**
 * The frontend builds its URLs from the same names and extensions
 * (src/utils/photos.js). The small ones are shown cropped in 3:2 tiles, so
 * they cover at least their box; the large one fits inside it.
 */
const VARIANTS = {
  thumb: {
    width: 480,
    height: 320,
    fit: 'outside',
    format: 'webp',
    quality: 75
  },
  medium: {
    width: 960,
    height: 640,
    fit: 'outside',
    format: 'webp',
    quality: 78
  },
  large: {
    width: 2048,
    height: 2048,
    fit: 'inside',
    format: 'jpeg',
    quality: 85
  }
}
const EXTENSIONS = { webp: 'webp', jpeg: 'jpg' }

/* A file that changed this recently may still be copying to the NAS. */
const SETTLE_MS = 60 * 1000
const RETRY_MS = 20 * 1000
const MAX_RETRIES = 10

const isSvg = (key) => key.toLowerCase().endsWith('.svg')

function variantPath(key, variant) {
  const extension = isSvg(key) ? 'svg' : EXTENSIONS[VARIANTS[variant].format]
  return (
    path.join(config.VARIANTS_ROOT, variant, ...key.split('/')) +
    '.' +
    extension
  )
}

/* Write under a temporary dot name first, so a half-written file is never served. */
async function writeAtomic(file, data) {
  const dir = path.dirname(file)
  const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.tmp`)
  await fs.promises.mkdir(dir, { recursive: true })
  try {
    await fs.promises.writeFile(temp, data)
    await fs.promises.rename(temp, file)
  } catch (err) {
    await fs.promises.rm(temp, { force: true })
    throw err
  }
}

/* Make all variants of one photo. Returns the dimensions of the large one. */
async function generate(key, source) {
  /* Vector images are served as they are. */
  if (isSvg(key)) {
    const data = await fs.promises.readFile(source.abs)
    for (const variant of Object.keys(VARIANTS))
      await writeAtomic(variantPath(key, variant), data)
    return {}
  }

  /* Loaded here, so the API and /media also run on a machine where sharp cannot. */
  const sharp = require('sharp')
  let dimensions = {}

  for (const [variant, options] of Object.entries(VARIANTS)) {
    const image = sharp(source.abs, { failOn: 'error' }).autoOrient().resize({
      width: options.width,
      height: options.height,
      fit: options.fit,
      withoutEnlargement: true
    })
    if (options.format == 'jpeg')
      image
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: options.quality, mozjpeg: true })
    else image.webp({ quality: options.quality })

    const { data, info } = await image.toBuffer({ resolveWithObject: true })
    await writeAtomic(variantPath(key, variant), data)
    if (variant == 'large')
      dimensions = { width: info.width, height: info.height }
  }

  return dimensions
}

async function variantsExist(key) {
  try {
    for (const variant of Object.keys(VARIANTS))
      await fs.promises.access(variantPath(key, variant))
    return true
  } catch (err) {
    return false
  }
}

async function removeVariants(key) {
  for (const variant of Object.keys(VARIANTS)) {
    const file = variantPath(key, variant)
    await fs.promises.rm(file, { force: true })

    /* Remove the folders this leaves empty. */
    const top = path.join(config.VARIANTS_ROOT, variant)
    let dir = path.dirname(file)
    while (dir.startsWith(top + path.sep)) {
      try {
        await fs.promises.rmdir(dir)
      } catch (err) {
        break
      }
      dir = path.dirname(dir)
    }
  }
}

/* Whether there is nothing left to do for a photo, given its original. */
async function isDone(photo, source) {
  if (photo.sourceMtimeMs != source.mtimeMs || photo.sourceSize != source.size)
    return false
  if (photo.status == 'ready') return variantsExist(photo.key)
  return photo.status == 'error' && photo.error == 'unreadable'
}

/**
 * The queue. Photos are processed one at a time, inside this process.
 */
const queue = []
const queued = new Set()
const retries = new Map()
let running = false
let waiting = 0
let idleCallbacks = []

function enqueue(keys, front) {
  const fresh = keys.filter((key) => !queued.has(key))
  fresh.forEach((key) => queued.add(key))
  if (front) queue.unshift(...fresh)
  else queue.push(...fresh)
  run()
}

async function run() {
  if (running) return
  running = true
  while (queue.length) {
    const key = queue.shift()
    queued.delete(key)
    try {
      await processKey(key)
    } catch (err) {
      console.error(`Variants of ${key} failed: ${err.message}`)
    }
  }
  running = false
  settle()
}

function retryLater(key) {
  retries.set(key, (retries.get(key) || 0) + 1)
  waiting++
  setTimeout(() => {
    waiting--
    enqueue([key])
    settle()
  }, RETRY_MS)
}

function settle() {
  if (running || queue.length || waiting) return
  idleCallbacks.forEach((callback) => callback())
  idleCallbacks = []
}

/* Resolves when the queue has nothing left to do. */
function idle() {
  return new Promise((resolve) => {
    idleCallbacks.push(resolve)
    settle()
  })
}

async function processKey(key) {
  const photo = await Photo.findOne({ key }).lean()
  if (!photo) return

  const source = await library.statSource(key)
  if (!source) {
    /* A photo that is online stays online, and while the library is away nothing can be concluded. */
    if (photo.status != 'ready' && (await library.isAvailable()))
      await Photo.updateOne(
        { key },
        { status: 'error', error: 'source-missing' }
      )
    return
  }

  const age = Math.abs(Date.now() - source.mtimeMs)
  if (age < SETTLE_MS && (retries.get(key) || 0) < MAX_RETRIES)
    return retryLater(key)
  retries.delete(key)

  if (await isDone(photo, source)) return

  const version = { sourceMtimeMs: source.mtimeMs, sourceSize: source.size }
  try {
    const dimensions = await generate(key, source)

    /* The original changed while it was being read. */
    const after = await library.statSource(key)
    if (!after || after.mtimeMs != source.mtimeMs || after.size != source.size)
      return retryLater(key)

    await Photo.updateOne(
      { key },
      {
        $set: { status: 'ready', ...dimensions, ...version },
        $unset: { error: '' }
      }
    )
  } catch (err) {
    console.error(`Variants of ${key} failed: ${err.message}`)
    /* Errors of the file system are worth another try; a file sharp cannot read is not, until it changes. */
    const error = err.code ? 'failed' : 'unreadable'
    if (photo.status == 'ready') {
      /* The variants of the previous original stay online. */
      if (error == 'unreadable')
        await Photo.updateOne({ key }, { $set: version })
    } else {
      await Photo.updateOne(
        { key },
        { $set: { status: 'error', error, ...version } }
      )
    }
  }
}

/* Make sure there is a record for every key and put the keys in the queue. */
async function registerKeys(keys, first) {
  keys = [...new Set(keys)]
  if (!keys.length) return

  try {
    await Photo.bulkWrite(
      keys.map((key) => ({
        updateOne: {
          filter: { key },
          /* Only on insert: a second reference must not take a photo offline. */
          update: { $setOnInsert: { status: 'pending' } },
          upsert: true
        }
      })),
      { ordered: false }
    )
  } catch (err) {
    /* Two saves inserting the same key at the same moment. */
    if (err.code != 11000) throw err
  }

  if (first) enqueue([first], true)
  enqueue(keys)
}

/* Every key a folder, album or organisation refers to. */
async function referencedKeys() {
  const keys = new Set()
  const add = (key) => {
    if (!key) return
    try {
      keys.add(library.parseKey(key))
    } catch (err) {
      console.warn(`Ignoring invalid key ${JSON.stringify(key)}`)
    }
  }

  /* Organisations stay until the migration to folders is cleaned up. */
  for (const organisation of await Organisation.find().lean()) {
    add(organisation.logo)
    add(organisation.cover)
  }
  for (const folder of await Folder.find().select('cover logo photos').lean()) {
    add(folder.logo)
    add(folder.cover)
    ;(folder.photos || []).forEach(add)
  }
  for (const album of await Album.find().select('cover sections').lean()) {
    add(album.cover)
    for (const section of album.sections || [])
      (section.photos || []).forEach(add)
  }

  return keys
}

/**
 * Bring the variants in line with the database: queue what is new, changed
 * or missing on disk. This is also how the logo and cover of an organisation
 * get their variants.
 */
async function syncAll({ prune } = {}) {
  const keys = await referencedKeys()
  const photos = await Photo.find().lean()
  const byKey = new Map(photos.map((photo) => [photo.key, photo]))

  const todo = await library.mapLimit([...keys], 8, async (key) => {
    const photo = byKey.get(key)
    if (!photo) return key
    const source = await library.statSource(key)
    if (!source) return photo.status == 'ready' ? null : key
    return (await isDone(photo, source)) ? null : key
  })
  await registerKeys(todo.filter(Boolean))

  if (prune)
    await pruneKeys(
      photos.map((photo) => photo.key).filter((key) => !keys.has(key))
    )
}

/* Take photos offline: remove their variants and their record. */
async function pruneKeys(keys) {
  if (!keys.length) return
  for (const key of keys) await removeVariants(key)
  await Photo.deleteMany({ key: { $in: keys } })
}

/* Prune the given keys that nothing refers to any more. */
async function pruneUnreferenced(candidates) {
  if (!candidates.length) return
  const keys = await referencedKeys()
  await pruneKeys(candidates.filter((key) => !keys.has(key)))
}

/* The status and dimensions of the given keys, as sent along with an album. */
async function photoMeta(keys) {
  const photos = await Photo.find({ key: { $in: keys } }).lean()
  const byKey = new Map(photos.map((photo) => [photo.key, photo]))
  const photoStats = { total: keys.length, ready: 0, pending: 0, error: 0 }

  const photoMeta = Object.fromEntries(
    keys.map((key) => {
      const photo = byKey.get(key) || { status: 'pending' }
      photoStats[photo.status]++
      return [
        key,
        { status: photo.status, width: photo.width, height: photo.height }
      ]
    })
  )

  return { photoMeta, photoStats }
}

module.exports = {
  VARIANTS,
  registerKeys,
  syncAll,
  pruneUnreferenced,
  photoMeta,
  idle
}

/* Run as a script: npm run variants [-- --prune] */
async function main() {
  const mongoose = require('mongoose')
  config.check()
  await mongoose.connect(config.MONGODB_URI)
  console.log(`Database: ${mongoose.connection.name}`)

  await syncAll({ prune: process.argv.includes('--prune') })
  await idle()

  const counts = await Photo.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ])
  console.log(
    counts.map((status) => `${status._id}: ${status.count}`).join(', ') ||
      'No photos'
  )
  await mongoose.disconnect()
}

if (require.main === module)
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
