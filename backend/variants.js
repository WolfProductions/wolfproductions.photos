/**
 * The variants: resized copies of the photos that albums, folders and
 * organisations refer to. They are made once, stored under VARIANTS_ROOT as
 * <variant>/<publicId>.<extension> and served from there as /media. The
 * publicId is random, so a photo's URL cannot be guessed from its key.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const config = require('./config')
const library = require('./library')
const { Organisation, Folder, Album, Photo, Settings } = require('./models')

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
  },
  /* Only for downloading. */
  small: {
    width: 1024,
    height: 1024,
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

const extensionOf = (key, variant) =>
  isSvg(key) ? 'svg' : EXTENSIONS[VARIANTS[variant].format]

/* 22 random characters, safe in a URL and a file name. */
const newPublicId = () => crypto.randomBytes(16).toString('base64url')

function variantPath(photo, variant) {
  return path.join(
    config.VARIANTS_ROOT,
    variant,
    `${photo.publicId}.${extensionOf(photo.key, variant)}`
  )
}

/* Where variants were stored before they were named after the publicId. */
function legacyPath(key, variant) {
  return (
    path.join(config.VARIANTS_ROOT, variant, ...key.split('/')) +
    '.' +
    extensionOf(key, variant)
  )
}

/* What the frontend gets instead of a key; vector images keep their extension so they are served as SVG. */
function refOf(photo) {
  return photo.publicId + (isSvg(photo.key) ? '.svg' : '')
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

/* Make the given variants of one photo. Returns the dimensions of the large one, if it was made. */
async function generate(photo, source, variants = Object.keys(VARIANTS)) {
  /* Vector images are served as they are. */
  if (isSvg(photo.key)) {
    const data = await fs.promises.readFile(source.abs)
    for (const variant of variants)
      await writeAtomic(variantPath(photo, variant), data)
    return {}
  }

  /* Loaded here, so the API and /media also run on a machine where sharp cannot. */
  const sharp = require('sharp')
  let dimensions = {}

  for (const variant of variants) {
    const options = VARIANTS[variant]
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
    await writeAtomic(variantPath(photo, variant), data)
    if (variant == 'large')
      dimensions = { width: info.width, height: info.height }
  }

  return dimensions
}

const exists = (file) =>
  fs.promises.access(file).then(
    () => true,
    () => false
  )

/* The variants of a photo that are not on disk. */
async function missingVariants(photo) {
  const missing = []
  for (const variant of Object.keys(VARIANTS))
    if (!(await exists(variantPath(photo, variant)))) missing.push(variant)
  return missing
}

async function removeVariants(photo) {
  if (!photo.publicId) return
  for (const variant of Object.keys(VARIANTS))
    await fs.promises.rm(variantPath(photo, variant), { force: true })
}

/* Whether the original is the one the variants were made from. */
const unchanged = (photo, source) =>
  photo.sourceMtimeMs == source.mtimeMs && photo.sourceSize == source.size

/* Whether there is nothing left to do for a photo, given its original. */
async function isDone(photo, source) {
  if (!unchanged(photo, source)) return false
  if (photo.status == 'ready') return !(await missingVariants(photo)).length
  return photo.status == 'error' && photo.error == 'unreadable'
}

/* Give every photo record that has none a publicId. */
async function assignPublicIds() {
  const photos = await Photo.find({ publicId: { $exists: false } })
    .select('_id')
    .lean()
  if (!photos.length) return
  await Photo.bulkWrite(
    photos.map((photo) => ({
      updateOne: {
        filter: { _id: photo._id, publicId: { $exists: false } },
        update: { $set: { publicId: newPublicId() } }
      }
    }))
  )
}

/**
 * Move variants from the old layout (<variant>/<key>.<ext>) to their
 * publicId, so they need not be made again. What is left in the old layout
 * afterwards belongs to no photo, and is removed: its URLs are guessable.
 */
async function adoptLegacyVariants(photos) {
  await library.mapLimit(photos, 8, async (photo) => {
    for (const variant of Object.keys(VARIANTS)) {
      const target = variantPath(photo, variant)
      const legacy = legacyPath(photo.key, variant)
      if ((await exists(target)) || !(await exists(legacy))) continue
      await fs.promises.rename(legacy, target)
    }
  })

  /* The new layout is flat, so every folder in it is from the old one. */
  for (const variant of Object.keys(VARIANTS)) {
    const top = path.join(config.VARIANTS_ROOT, variant)
    let entries = []
    try {
      entries = await fs.promises.readdir(top, { withFileTypes: true })
    } catch (err) {
      continue
    }
    for (const entry of entries)
      if (entry.isDirectory())
        await fs.promises.rm(path.join(top, entry.name), {
          recursive: true,
          force: true
        })
  }
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
  if (!photo.publicId) {
    await Photo.updateOne(
      { _id: photo._id, publicId: { $exists: false } },
      { $set: { publicId: newPublicId() } }
    )
    photo.publicId = (await Photo.findById(photo._id).lean()).publicId
  }

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

  /* Variants added later (or deleted from disk) are made without redoing the others. */
  const variants =
    photo.status == 'ready' && unchanged(photo, source)
      ? await missingVariants(photo)
      : Object.keys(VARIANTS)

  const version = { sourceMtimeMs: source.mtimeMs, sourceSize: source.size }
  try {
    const dimensions = await generate(photo, source, variants)

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
          update: {
            $setOnInsert: { status: 'pending', publicId: newPublicId() }
          },
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

/* Every key a folder, album, organisation or the portfolio refers to. */
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
  for (const settings of await Settings.find().lean()) {
    add(settings.portfolio?.hero)
    ;(settings.portfolio?.photos || []).forEach(add)
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
  await assignPublicIds()
  const photos = await Photo.find().lean()
  await adoptLegacyVariants(photos)
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
  const photos = await Photo.find({ key: { $in: keys } }).lean()
  for (const photo of photos) await removeVariants(photo)
  await Photo.deleteMany({ key: { $in: keys } })
}

/* Prune the given keys that nothing refers to any more. */
async function pruneUnreferenced(candidates) {
  if (!candidates.length) return
  const keys = await referencedKeys()
  await pruneKeys(candidates.filter((key) => !keys.has(key)))
}

/* The photo records of the given keys, by key. */
async function lookup(keys) {
  const photos = await Photo.find({ key: { $in: [...new Set(keys)] } }).lean()
  return new Map(photos.map((photo) => [photo.key, photo]))
}

module.exports = {
  VARIANTS,
  registerKeys,
  syncAll,
  pruneUnreferenced,
  lookup,
  refOf,
  variantPath,
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
