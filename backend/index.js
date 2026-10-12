/**
 * Backend for WolfProductions.Photos
 * ------------------------------------------------
 * @author: WolfProductions
 * @version: 1.0
 * @license: MIT
 */

/* Get the environment variables and refuse to start on an unsafe configuration. */
const config = require('./config')
try {
  config.check()
} catch (err) {
  console.error(err.message)
  process.exit(1)
}

/* Get the mongoose library and the models. */
const mongoose = require('mongoose')
const { Organisation, Album, Photo } = require('./models')

/* Get the photo library (the originals) and the variants made from it. */
const library = require('./library')
const variants = require('./variants')
const { HttpError } = library

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

/* Get the express module. */
const express = require('express')
const cors = require('cors')
const app = express()
const bodyParser = require('body-parser')

/* Enable CORS. */
app.use(
  cors({
    origin: ['https://wolfproductions.photos', 'http://localhost:3000']
  })
)

/* Enable body parsing. An album with a few thousand photos is larger than the default limit. */
app.use(bodyParser.json({ limit: '2mb' }))
app.use(bodyParser.urlencoded({ extended: true }))

/* Pass the errors of an async route on to the error handler instead of crashing the process. */
const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next)

/* Only let requests through that carry the admin token. */
function requireAdmin(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const hash = (value) => crypto.createHash('sha256').update(value).digest()

  if (!crypto.timingSafeEqual(hash(token), hash(config.ADMIN_TOKEN)))
    return next(new HttpError(401, 'unauthorized'))
  next()
}

function objectId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'not-found')
  return id
}

/* The fields of an album from a request, with every key validated. */
function albumFields(body) {
  const invalid = []
  const clean = (key) => {
    try {
      return library.parseKey(key)
    } catch (err) {
      invalid.push(key)
    }
  }

  const fields = {
    title: body.title,
    date: body.date,
    cover: body.cover ? clean(body.cover) : '',
    sections: (Array.isArray(body.sections) ? body.sections : []).map(
      (section) => ({
        ...(section._id && { _id: section._id }),
        title: section.title,
        photos: [
          ...new Set(
            (Array.isArray(section.photos) ? section.photos : []).map(clean)
          )
        ]
      })
    )
  }

  if (invalid.length) throw new HttpError(400, 'invalid-key', { keys: invalid })
  return fields
}

/* Every key of an album once, the cover first. */
function albumKeys(album) {
  const photos = album.sections.flatMap((section) => section.photos)
  return [...new Set([album.cover, ...photos].filter(Boolean))]
}

/* An album as it is sent to the client: with the status and dimensions of its photos. */
async function albumResponse(album) {
  return {
    ...album.toObject(),
    ...(await variants.photoMeta(albumKeys(album)))
  }
}

/**
 * The routes for the backend.
 */
app.get(
  '/api/organisations',
  wrap(async (req, res) => {
    const organisations = await Organisation.find()
    res.send(organisations)
  })
)

app.get(
  '/api/organisations/:organisation_id',
  wrap(async (req, res) => {
    const organisation_id = objectId(req.params.organisation_id)
    const organisation = await Organisation.findById(organisation_id)
    if (!organisation) throw new HttpError(404, 'not-found')

    res.send(organisation)
  })
)

app.post(
  '/api/organisations/:organisation_id/albums',
  requireAdmin,
  wrap(async (req, res) => {
    const organisation_id = objectId(req.params.organisation_id)
    const album = new Album({
      ...albumFields(req.body),
      organisation: organisation_id
    })
    await album.save()

    /* The variants are made in the background; the response does not wait for them. */
    await variants.registerKeys(albumKeys(album), album.cover)
    res.send(await albumResponse(album))
  })
)

app.get(
  '/api/organisations/:organisation_id/albums',
  wrap(async (req, res) => {
    const organisation_id = objectId(req.params.organisation_id)
    const albums = await Album.find({ organisation: organisation_id })
    res.send(albums)
  })
)

app.get(
  '/api/album/:album_id',
  wrap(async (req, res) => {
    const album = await Album.findById(objectId(req.params.album_id))
    if (!album) throw new HttpError(404, 'not-found')

    res.send(await albumResponse(album))
  })
)

app.put(
  '/api/album/:album_id',
  requireAdmin,
  wrap(async (req, res) => {
    const album = await Album.findById(objectId(req.params.album_id))
    if (!album) throw new HttpError(404, 'not-found')

    const previousKeys = albumKeys(album)
    Object.assign(album, albumFields(req.body))
    if (mongoose.isValidObjectId(req.body.organisation))
      album.organisation = req.body.organisation
    await album.save()

    const keys = albumKeys(album)
    await variants.registerKeys(keys, album.cover)
    /* Photos that were taken out of the album go offline, unless something else still uses them. */
    await variants.pruneUnreferenced(
      previousKeys.filter((key) => !keys.includes(key))
    )
    res.send(await albumResponse(album))
  })
)

/* Browse the originals, to pick the photos of an album. */
app.get(
  '/api/library',
  requireAdmin,
  wrap(async (req, res) => {
    const folder = req.query.path === undefined ? '' : req.query.path
    if (typeof folder != 'string') throw new HttpError(400, 'invalid-key')

    res.send(await library.listFolder(folder))
  })
)

/* Download the original of a photo. Only photos that are in an album or organisation have a record. */
app.get(
  '/api/photos/original',
  wrap(async (req, res, next) => {
    const key = library.parseKey(req.query.key)
    const photo = await Photo.findOne({ key, status: 'ready' })
    if (!photo) throw new HttpError(404, 'not-found')
    if (!(await library.statSource(key)))
      throw new HttpError(503, 'original-unavailable')

    res.download(
      key,
      path.posix.basename(key),
      { root: await library.libraryRoot() },
      (err) => err && !res.headersSent && next(err)
    )
  })
)

/* Serve the variants. Nothing else is ever written to this directory. */
app.use(
  '/media',
  express.static(config.VARIANTS_ROOT, {
    maxAge: '1d',
    index: false,
    redirect: false,
    fallthrough: false
  })
)

/* Serve the built frontend when there is one, so the whole site is one process. */
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(
    '/assets',
    express.static(path.join(dist, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: false
    })
  )
  app.use(express.static(dist, { index: false }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile('index.html', { root: dist })
  })
}

/* Everything that did not match, and every error, ends up here. */
app.use((req, res, next) => next(new HttpError(404, 'not-found')))
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)

  /* Only our own errors carry a code that is safe to send; other messages may hold paths. */
  if (err instanceof HttpError)
    return res.status(err.status).send({ error: err.code, ...err.details })

  const status = err.status || err.statusCode || 500
  if (status >= 500) console.error(err)
  res.status(status).send({ error: status == 404 ? 'not-found' : 'error' })
})

/* Connect to the database and start listening on the port. */
async function main() {
  await mongoose.connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  console.log(`Database: ${mongoose.connection.name}`)

  app.listen(config.PORT, () => console.log(`Listening on port ${config.PORT}`))

  /* Make the variants that are missing, for example after an organisation was edited in the database. */
  variants
    .syncAll()
    .catch((err) => console.error(`Sync failed: ${err.message}`))
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
