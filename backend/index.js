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
const { Folder, Album, Photo } = require('./models')

/* Get the photo library (the originals) and the variants made from it. */
const library = require('./library')
const variants = require('./variants')
const tree = require('./tree')
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

/* Whether a request carries the admin token. */
function isAdmin(req) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const hash = (value) => crypto.createHash('sha256').update(value).digest()

  return crypto.timingSafeEqual(hash(token), hash(config.ADMIN_TOKEN))
}

/* Only let requests through that carry the admin token. */
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return next(new HttpError(401, 'unauthorized'))
  next()
}

/* Who is asking: the admin sees everything, a visitor what is public. */
function viewerOf(req) {
  return { admin: isAdmin(req) }
}

function objectId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'not-found')
  return id
}

const VISIBILITIES = ['inherit', 'private', 'public']

/* A key from a request, validated; collects the invalid ones in `invalid`. */
function cleanKey(key, invalid) {
  try {
    return library.parseKey(key)
  } catch (err) {
    invalid.push(key)
  }
}

/* The fields of an album from a request, with every key validated. */
function albumFields(body) {
  const invalid = []
  const clean = (key) => cleanKey(key, invalid)

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
  if (body.order !== undefined)
    fields.order = body.order === null ? undefined : Number(body.order)
  if (body.visibility !== undefined) {
    if (!VISIBILITIES.includes(body.visibility))
      throw new HttpError(400, 'invalid-visibility')
    fields.visibility = body.visibility
  }

  if (invalid.length) throw new HttpError(400, 'invalid-key', { keys: invalid })
  return fields
}

/* Every key of an album once, the cover first. */
function albumKeys(album) {
  const photos = album.sections.flatMap((section) => section.photos)
  return [...new Set([album.cover, ...photos].filter(Boolean))]
}

/* The fields of a folder from a request, with every key validated. Only the fields that are sent. */
function folderFields(body) {
  const invalid = []
  const fields = {}

  if (body.title !== undefined) fields.title = String(body.title)
  if (body.description !== undefined)
    fields.description = String(body.description)
  for (const field of ['cover', 'logo'])
    if (body[field] !== undefined)
      fields[field] = body[field] ? cleanKey(body[field], invalid) : ''
  if (body.photos !== undefined)
    fields.photos = [
      ...new Set(
        (Array.isArray(body.photos) ? body.photos : []).map((key) =>
          cleanKey(key, invalid)
        )
      )
    ]
  if (body.order !== undefined)
    fields.order = body.order === null ? undefined : Number(body.order)
  if (body.sort !== undefined) {
    if (!['manual', 'date-desc', 'title'].includes(body.sort))
      throw new HttpError(400, 'invalid-sort')
    fields.sort = body.sort
  }
  if (body.visibility !== undefined) {
    if (!VISIBILITIES.includes(body.visibility))
      throw new HttpError(400, 'invalid-visibility')
    fields.visibility = body.visibility
  }

  if (invalid.length) throw new HttpError(400, 'invalid-key', { keys: invalid })
  return fields
}

/* The parent folder id from a request: null for the top level. */
function parentId(value) {
  if (value === null || value === '' || value === undefined) return null
  return objectId(value)
}

/* A folder as it is sent to the client: its own fields, the path to it, what is inside and the status of its loose photos. */
async function folderResponse(folder, folders, viewer) {
  const card = await tree.folderCard(folder, folders, viewer)
  const photos = folder.photos || []
  return {
    ...card,
    parent: folder.parent,
    sort: folder.sort,
    ...(viewer.admin && {
      ownCover: folder.cover || '',
      ownLogo: folder.logo || ''
    }),
    breadcrumb: tree.breadcrumb(folder, folders, viewer),
    ...(await tree.children(folder._id, folders, viewer, folder.sort)),
    photos,
    ...(await variants.photoMeta(photos))
  }
}

/* An album as it is sent to the client: with the status and dimensions of its photos and the path to it. */
async function albumResponse(album, folders, viewer) {
  folders = folders || (await tree.loadFolders())
  return {
    ...album.toObject(),
    logo: tree.logoOf(album, folders),
    breadcrumb: tree.breadcrumb(album, folders, viewer),
    ...(viewer.admin && {
      effectiveVisibility: tree.visibilityOf(album, folders)
    }),
    ...(await variants.photoMeta(albumKeys(album)))
  }
}

/* The folder and its ancestors an album goes into; 400 when the folder does not exist. */
function albumPlacement(folderId, folders) {
  const folder = folders.get(String(folderId))
  if (!folder) throw new HttpError(400, 'invalid-folder')
  return { folder: folder._id, ancestors: tree.ancestorsUnder(folder) }
}

/* Load a folder or album the viewer may see, else 404 (a private one does not exist for a visitor). */
async function viewable(Model, id, folders, viewer) {
  const doc = await Model.findById(objectId(id))
  if (!doc || !tree.canView(doc, folders, viewer))
    throw new HttpError(404, 'not-found')
  return doc
}

/**
 * The routes for the backend.
 */

/* Folders. */
app.get(
  '/api/folders/root',
  wrap(async (req, res) => {
    const viewer = viewerOf(req)
    const folders = await tree.loadFolders()
    res.send((await tree.children(null, folders, viewer, 'manual')).folders)
  })
)

app.get(
  '/api/folders/:folder_id',
  wrap(async (req, res) => {
    const viewer = viewerOf(req)
    const folders = await tree.loadFolders()
    const folder = await viewable(Folder, req.params.folder_id, folders, viewer)
    res.send(await folderResponse(folder.toObject(), folders, viewer))
  })
)

app.post(
  '/api/folders',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const parent = parentId(req.body.parent)
    if (!tree.isValidParent(null, parent, folders))
      throw new HttpError(400, 'invalid-parent')

    const folder = new Folder({
      ...folderFields(req.body),
      parent,
      ancestors: tree.ancestorsUnder(parent && folders.get(String(parent)))
    })
    await folder.save()

    await variants.registerKeys(tree.folderKeys(folder), folder.cover)
    folders.set(String(folder._id), folder.toObject())
    res.send(await folderResponse(folder.toObject(), folders, viewerOf(req)))
  })
)

app.put(
  '/api/folders/:folder_id',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const folder = await Folder.findById(objectId(req.params.folder_id))
    if (!folder) throw new HttpError(404, 'not-found')

    const previousKeys = tree.folderKeys(folder)
    Object.assign(folder, folderFields(req.body))

    /* Moving a folder takes everything below it along. */
    if (req.body.parent !== undefined) {
      const parent = parentId(req.body.parent)
      if (!tree.isValidParent(folder, parent, folders))
        throw new HttpError(400, 'invalid-parent')
      if (String(parent || '') != String(folder.parent || '')) {
        folder.parent = parent
        const ancestors = tree.ancestorsUnder(
          parent && folders.get(String(parent))
        )
        await tree.moveSubtree(folder._id, ancestors)
        folder.ancestors = ancestors
      }
    }
    await folder.save()

    const keys = tree.folderKeys(folder)
    await variants.registerKeys(keys, folder.cover)
    await variants.pruneUnreferenced(
      previousKeys.filter((key) => !keys.includes(key))
    )
    res.send(
      await folderResponse(
        folder.toObject(),
        await tree.loadFolders(),
        viewerOf(req)
      )
    )
  })
)

/* Only an empty folder can be deleted, so nothing disappears by accident. */
app.delete(
  '/api/folders/:folder_id',
  requireAdmin,
  wrap(async (req, res) => {
    const folder = await Folder.findById(objectId(req.params.folder_id))
    if (!folder) throw new HttpError(404, 'not-found')

    const [subfolders, albums] = await Promise.all([
      Folder.countDocuments({ parent: folder._id }),
      Album.countDocuments({ folder: folder._id })
    ])
    if (subfolders || albums)
      throw new HttpError(409, 'folder-not-empty', { subfolders, albums })

    await folder.deleteOne()
    await variants.pruneUnreferenced(tree.folderKeys(folder))
    res.send({ deleted: folder._id })
  })
)

/* Albums. */
app.get(
  '/api/albums/:album_id',
  wrap(async (req, res) => {
    const viewer = viewerOf(req)
    const folders = await tree.loadFolders()
    const album = await viewable(Album, req.params.album_id, folders, viewer)
    res.send(await albumResponse(album, folders, viewer))
  })
)

app.post(
  '/api/albums',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const album = new Album({
      ...albumFields(req.body),
      ...albumPlacement(req.body.folder, folders)
    })
    await album.save()

    /* The variants are made in the background; the response does not wait for them. */
    await variants.registerKeys(albumKeys(album), album.cover)
    res.send(await albumResponse(album, folders, viewerOf(req)))
  })
)

app.put(
  '/api/albums/:album_id',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const album = await Album.findById(objectId(req.params.album_id))
    if (!album) throw new HttpError(404, 'not-found')

    const previousKeys = albumKeys(album)
    Object.assign(album, albumFields(req.body))
    /* Moving an album to another folder. */
    if (req.body.folder !== undefined)
      Object.assign(album, albumPlacement(req.body.folder, folders))
    await album.save()

    const keys = albumKeys(album)
    await variants.registerKeys(keys, album.cover)
    /* Photos that were taken out of the album go offline, unless something else still uses them. */
    await variants.pruneUnreferenced(
      previousKeys.filter((key) => !keys.includes(key))
    )
    res.send(await albumResponse(album, folders, viewerOf(req)))
  })
)

/* Deleting an album takes its variants offline; the originals on the NAS are never touched. */
app.delete(
  '/api/albums/:album_id',
  requireAdmin,
  wrap(async (req, res) => {
    const album = await Album.findById(objectId(req.params.album_id))
    if (!album) throw new HttpError(404, 'not-found')

    await album.deleteOne()
    await variants.pruneUnreferenced(albumKeys(album))
    res.send({ deleted: album._id })
  })
)

/**
 * The routes of the frontend from before folders. A top-level folder keeps
 * the id of the organisation it was migrated from, so these answer from the
 * folders. They go once the frontend uses the routes above.
 */
app.get(
  '/api/organisations',
  wrap(async (req, res) => {
    const viewer = viewerOf(req)
    const folders = await tree.loadFolders()
    res.send((await tree.children(null, folders, viewer, 'manual')).folders)
  })
)

app.get(
  '/api/organisations/:organisation_id',
  wrap(async (req, res) => {
    const viewer = viewerOf(req)
    const folders = await tree.loadFolders()
    const folder = await viewable(
      Folder,
      req.params.organisation_id,
      folders,
      viewer
    )
    res.send(await tree.folderCard(folder.toObject(), folders, viewer))
  })
)

app.get(
  '/api/organisations/:organisation_id/albums',
  wrap(async (req, res) => {
    const viewer = viewerOf(req)
    const folders = await tree.loadFolders()
    const folder = await viewable(
      Folder,
      req.params.organisation_id,
      folders,
      viewer
    )
    const albums = await Album.find({ folder: folder._id })
    res.send(albums.filter((album) => tree.canView(album, folders, viewer)))
  })
)

app.post(
  '/api/organisations/:organisation_id/albums',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const album = new Album({
      ...albumFields(req.body),
      ...albumPlacement(objectId(req.params.organisation_id), folders)
    })
    await album.save()

    await variants.registerKeys(albumKeys(album), album.cover)
    res.send(await albumResponse(album, folders, viewerOf(req)))
  })
)

app.get(
  '/api/album/:album_id',
  wrap(async (req, res) => {
    const viewer = viewerOf(req)
    const folders = await tree.loadFolders()
    const album = await viewable(Album, req.params.album_id, folders, viewer)
    res.send(await albumResponse(album, folders, viewer))
  })
)

/* The old edit form sends the album's organisation; that is ignored, so saving never moves an album. */
app.put(
  '/api/album/:album_id',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const album = await Album.findById(objectId(req.params.album_id))
    if (!album) throw new HttpError(404, 'not-found')

    const previousKeys = albumKeys(album)
    Object.assign(album, albumFields(req.body))
    await album.save()

    const keys = albumKeys(album)
    await variants.registerKeys(keys, album.cover)
    await variants.pruneUnreferenced(
      previousKeys.filter((key) => !keys.includes(key))
    )
    res.send(await albumResponse(album, folders, viewerOf(req)))
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
