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
const { Folder, Album, Photo, Share, Settings } = require('./models')

/* Get the photo library (the originals) and the variants made from it. */
const library = require('./library')
const variants = require('./variants')
const tree = require('./tree')
const shares = require('./shares')
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

/* Who is asking: the admin sees everything, a visitor what is public and what their share links point at. */
async function viewerOf(req) {
  const admin = isAdmin(req)
  return { admin, shares: admin ? [] : await shares.sharesOf(req) }
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

/**
 * Nobody gets the keys of photos (their paths on the NAS) from the read
 * routes, only refs: the random publicId the variants are named after. The
 * admin forms read the keys from the /source routes.
 */
async function refsOf(keys) {
  const photos = await variants.lookup(keys.filter(Boolean))
  return (key) => {
    const photo = key && photos.get(key)
    return photo && photo.publicId ? variants.refOf(photo) : ''
  }
}

/* The status and dimensions of photos, by ref, and how many are ready. */
async function photoMeta(keys) {
  const photos = await variants.lookup(keys)
  const photoStats = { total: keys.length, ready: 0, pending: 0, error: 0 }
  const photoMeta = {}
  for (const key of keys) {
    const photo = photos.get(key) || { status: 'pending' }
    photoStats[photo.status]++
    if (photo.publicId)
      photoMeta[variants.refOf(photo)] = {
        status: photo.status,
        width: photo.width,
        height: photo.height
      }
  }
  return { photoMeta, photoStats }
}

/* Cards with refs instead of keys. */
async function cardsWithRefs(cards) {
  const ref = await refsOf(cards.flatMap((card) => [card.cover, card.logo]))
  return cards.map((card) => ({
    ...card,
    cover: ref(card.cover),
    ...(card.logo !== undefined && { logo: ref(card.logo) })
  }))
}

/* A folder as it is sent to the client: its own fields, the path to it, what is inside and the status of its loose photos. */
async function folderResponse(folder, folders, viewer) {
  const [card] = await cardsWithRefs([
    await tree.folderCard(folder, folders, viewer)
  ])
  const children = await tree.children(folder._id, folders, viewer, folder.sort)
  const keys = folder.photos || []
  const ref = await refsOf(keys)
  return {
    ...card,
    parent: folder.parent,
    sort: folder.sort,
    breadcrumb: tree.breadcrumb(folder, folders, viewer),
    folders: await cardsWithRefs(children.folders),
    albums: await cardsWithRefs(children.albums),
    photos: keys.map(ref).filter(Boolean),
    canDownload: tree.canDownload(folder, viewer),
    ...(await photoMeta(keys))
  }
}

/* An album as it is sent to the client: with the status and dimensions of its photos and the path to it. */
async function albumResponse(album, folders, viewer) {
  folders = folders || (await tree.loadFolders())
  const logo = tree.logoOf(album, folders)
  const keys = albumKeys(album)
  const ref = await refsOf([...keys, logo])
  return {
    _id: album._id,
    title: album.title,
    date: album.date,
    folder: album.folder,
    cover: ref(album.cover),
    logo: ref(logo),
    sections: album.sections.map((section) => ({
      _id: section._id,
      title: section.title,
      photos: section.photos.map(ref).filter(Boolean)
    })),
    breadcrumb: tree.breadcrumb(album, folders, viewer),
    ...(viewer.admin && {
      visibility: album.visibility,
      effectiveVisibility: tree.visibilityOf(album, folders)
    }),
    canDownload: tree.canDownload(album, viewer),
    ...(await photoMeta(keys))
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

/**
 * Whether the request carries the admin token, so the frontend knows to show
 * the admin controls, and what the visitor's share links point at.
 */
app.get(
  '/api/session',
  wrap(async (req, res) => {
    const viewer = await viewerOf(req)
    const folders = await tree.loadFolders()
    const cards = []
    for (const share of viewer.shares) {
      if (share.target.kind == 'folder') {
        const folder = folders.get(String(share.target.id))
        if (folder)
          cards.push({
            kind: 'folder',
            ...(await tree.folderCard(folder, folders, viewer))
          })
      } else {
        const album = await Album.findById(share.target.id)
          .select('-sections')
          .lean()
        if (album)
          cards.push({
            kind: 'album',
            ...tree.albumCard(album, folders, viewer)
          })
      }
    }
    res.send({ admin: viewer.admin, shared: await cardsWithRefs(cards) })
  })
)

/* Folders. */

/* Every folder in one flat list, top level first, for the folder pickers of the admin forms. */
app.get(
  '/api/folders',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const pathOf = (folder) =>
      [...folder.ancestors, folder._id]
        .map((id) => folders.get(String(id))?.title || '')
        .join(' / ')
    res.send(
      [...folders.values()]
        .map((folder) => ({
          _id: folder._id,
          title: folder.title,
          parent: folder.parent,
          ancestors: folder.ancestors,
          visibility: folder.visibility,
          path: pathOf(folder)
        }))
        .sort((a, b) => a.path.localeCompare(b.path, 'nl'))
    )
  })
)

app.get(
  '/api/folders/root',
  wrap(async (req, res) => {
    const viewer = await viewerOf(req)
    const folders = await tree.loadFolders()
    res.send(
      await cardsWithRefs(
        (
          await tree.children(null, folders, viewer, 'manual')
        ).folders
      )
    )
  })
)

/* What the admin forms edit: the folder's own fields, with keys. */
app.get(
  '/api/folders/:folder_id/source',
  requireAdmin,
  wrap(async (req, res) => {
    const folder = await Folder.findById(objectId(req.params.folder_id)).lean()
    if (!folder) throw new HttpError(404, 'not-found')
    res.send(folder)
  })
)

app.get(
  '/api/folders/:folder_id',
  wrap(async (req, res) => {
    const viewer = await viewerOf(req)
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
    res.send(
      await folderResponse(folder.toObject(), folders, await viewerOf(req))
    )
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
        await viewerOf(req)
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
    await Share.deleteMany({ 'target.id': folder._id })
    await variants.pruneUnreferenced(tree.folderKeys(folder))
    res.send({ deleted: folder._id })
  })
)

/* Albums. */
app.get(
  '/api/albums/:album_id',
  wrap(async (req, res) => {
    const viewer = await viewerOf(req)
    const folders = await tree.loadFolders()
    const album = await viewable(Album, req.params.album_id, folders, viewer)
    res.send(await albumResponse(album, folders, viewer))
  })
)

/* What the album form edits: the album with keys. */
app.get(
  '/api/albums/:album_id/source',
  requireAdmin,
  wrap(async (req, res) => {
    const album = await Album.findById(objectId(req.params.album_id)).lean()
    if (!album) throw new HttpError(404, 'not-found')
    res.send(album)
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
    res.send(await albumResponse(album, folders, await viewerOf(req)))
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
    res.send(await albumResponse(album, folders, await viewerOf(req)))
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
    await Share.deleteMany({ 'target.id': album._id })
    await variants.pruneUnreferenced(albumKeys(album))
    res.send({ deleted: album._id })
  })
)

/**
 * The settings: what / shows, and the portfolio. Only public folders and
 * albums can be featured, so the portfolio never shows anything private.
 */
async function loadSettings() {
  return (await Settings.findOne()) || new Settings()
}

const PUBLIC = { admin: false, shares: [] }

/* The featured items that exist and are public, as cards. */
async function featuredCards(featured, folders) {
  const cards = []
  for (const { kind, id } of featured || []) {
    if (kind == 'folder') {
      const folder = folders.get(String(id))
      if (folder && tree.canView(folder, folders, PUBLIC))
        cards.push({
          kind,
          ...(await tree.folderCard(folder, folders, PUBLIC))
        })
    } else {
      const album = await Album.findById(id).select('-sections').lean()
      if (album && tree.canView(album, folders, PUBLIC))
        cards.push({ kind, ...tree.albumCard(album, folders, PUBLIC) })
    }
  }
  return cardsWithRefs(cards)
}

app.get(
  '/api/settings',
  wrap(async (req, res) => {
    const settings = (await loadSettings()).toObject()
    const portfolio = settings.portfolio || {}
    const keys = portfolio.photos || []
    const ref = await refsOf([portfolio.hero, ...keys])
    res.send({
      homepage: settings.homepage,
      portfolio: {
        title: portfolio.title || '',
        intro: portfolio.intro || '',
        hero: ref(portfolio.hero),
        photos: keys.map(ref).filter(Boolean),
        featured: await featuredCards(
          portfolio.featured,
          await tree.loadFolders()
        ),
        ...(await photoMeta(keys))
      }
    })
  })
)

/* What the portfolio form edits, with keys, and the public folders and albums it can feature. */
app.get(
  '/api/settings/source',
  requireAdmin,
  wrap(async (req, res) => {
    const folders = await tree.loadFolders()
    const pathOf = (node) =>
      [
        ...node.ancestors.map((id) => folders.get(String(id))?.title),
        node.title
      ]
        .filter(Boolean)
        .join(' / ')
    const isPublic = (node) => tree.visibilityOf(node, folders) == 'public'
    const albums = await Album.find()
      .select('title ancestors visibility')
      .lean()

    res.send({
      ...(await loadSettings()).toObject(),
      candidates: [
        ...[...folders.values()].filter(isPublic).map((folder) => ({
          kind: 'folder',
          id: folder._id,
          path: pathOf(folder)
        })),
        ...albums.filter(isPublic).map((album) => ({
          kind: 'album',
          id: album._id,
          path: pathOf(album)
        }))
      ].sort((a, b) => a.path.localeCompare(b.path, 'nl'))
    })
  })
)

app.put(
  '/api/settings',
  requireAdmin,
  wrap(async (req, res) => {
    const settings = await loadSettings()
    const previous = settings.toObject().portfolio || {}
    const body = req.body
    const invalid = []

    if (body.homepage !== undefined) {
      if (!['folders', 'portfolio'].includes(body.homepage))
        throw new HttpError(400, 'invalid-homepage')
      settings.homepage = body.homepage
    }

    const portfolio = body.portfolio || {}
    const next = { ...previous }
    if (portfolio.title !== undefined) next.title = String(portfolio.title)
    if (portfolio.intro !== undefined) next.intro = String(portfolio.intro)
    if (portfolio.hero !== undefined)
      next.hero = portfolio.hero ? cleanKey(portfolio.hero, invalid) : ''
    if (portfolio.photos !== undefined)
      next.photos = [
        ...new Set(
          (Array.isArray(portfolio.photos) ? portfolio.photos : []).map((key) =>
            cleanKey(key, invalid)
          )
        )
      ]
    if (invalid.length)
      throw new HttpError(400, 'invalid-key', { keys: invalid })

    /* Featuring something private would show it to everyone. */
    if (portfolio.featured !== undefined) {
      const folders = await tree.loadFolders()
      const featured = []
      for (const item of Array.isArray(portfolio.featured)
        ? portfolio.featured
        : []) {
        const node =
          item.kind == 'folder'
            ? folders.get(String(item.id))
            : item.kind == 'album' && mongoose.isValidObjectId(item.id)
            ? await Album.findById(item.id)
                .select('ancestors visibility')
                .lean()
            : null
        if (!node) throw new HttpError(400, 'invalid-featured')
        if (tree.visibilityOf(node, folders) != 'public')
          throw new HttpError(400, 'featured-not-public')
        featured.push({ kind: item.kind, id: node._id })
      }
      next.featured = featured
    }

    settings.portfolio = next
    await settings.save()

    const keys = [next.hero, ...(next.photos || [])].filter(Boolean)
    await variants.registerKeys(keys, next.hero)
    await variants.pruneUnreferenced(
      [previous.hero, ...(previous.photos || [])].filter(
        (key) => key && !keys.includes(key)
      )
    )
    res.send({ saved: true })
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

/**
 * Share links.
 */

/* A share link as the admin sees it. */
function shareResponse(share) {
  return {
    _id: share._id,
    token: share.token,
    label: share.label || '',
    target: share.target,
    hasPassword: Boolean(share.passwordHash),
    expiresAt: share.expiresAt || null,
    expired: Boolean(shares.isExpired(share)),
    allowDownload: share.allowDownload,
    createdAt: share.createdAt
  }
}

/* The fields of a share link from a request; a date without a time means the end of that day. */
async function shareFields(body) {
  const fields = {}
  if (body.label !== undefined) fields.label = String(body.label || '')
  if (body.allowDownload !== undefined)
    fields.allowDownload = Boolean(body.allowDownload)
  if (body.expiresAt !== undefined) {
    if (!body.expiresAt) fields.expiresAt = null
    else {
      const value = /^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt)
        ? `${body.expiresAt}T23:59:59.999`
        : body.expiresAt
      const date = new Date(value)
      if (isNaN(date)) throw new HttpError(400, 'invalid-date')
      fields.expiresAt = date
    }
  }
  /* A password is only replaced when one is sent; null removes it. */
  if (body.password === null) fields.passwordHash = ''
  else if (body.password)
    fields.passwordHash = await shares.hashPassword(body.password)
  return fields
}

app.get(
  '/api/shares',
  requireAdmin,
  wrap(async (req, res) => {
    const filter = req.query.target
      ? { 'target.id': objectId(req.query.target) }
      : {}
    const list = await Share.find(filter).sort({ createdAt: -1 }).lean()
    res.send(list.map(shareResponse))
  })
)

app.post(
  '/api/shares',
  requireAdmin,
  wrap(async (req, res) => {
    const { kind, id } = req.body.target || {}
    const Model = { folder: Folder, album: Album }[kind]
    if (!Model || !(await Model.exists({ _id: objectId(id) })))
      throw new HttpError(400, 'invalid-target')

    const share = await Share.create({
      ...(await shareFields(req.body)),
      token: shares.newToken(),
      target: { kind, id }
    })
    res.send(shareResponse(share))
  })
)

app.put(
  '/api/shares/:share_id',
  requireAdmin,
  wrap(async (req, res) => {
    const share = await Share.findById(objectId(req.params.share_id))
    if (!share) throw new HttpError(404, 'not-found')
    Object.assign(share, await shareFields(req.body))
    await share.save()
    res.send(shareResponse(share))
  })
)

/* Revoking a link deletes it; whoever had it loses access at once. */
app.delete(
  '/api/shares/:share_id',
  requireAdmin,
  wrap(async (req, res) => {
    const share = await Share.findByIdAndDelete(objectId(req.params.share_id))
    if (!share) throw new HttpError(404, 'not-found')
    res.send({ deleted: share._id })
  })
)

/* Where a link points, for /s/<token>. A link that does not exist, or no longer, is a 404. */
async function openShare(token) {
  const share = await Share.findOne({ token: String(token) }).lean()
  if (!share || shares.isExpired(share)) throw new HttpError(404, 'not-found')

  const Model = share.target.kind == 'folder' ? Folder : Album
  const target = await Model.findById(share.target.id).select('title').lean()
  if (!target) throw new HttpError(404, 'not-found')
  return { share, target }
}

app.get(
  '/api/s/:token',
  wrap(async (req, res) => {
    const { share, target } = await openShare(req.params.token)
    res.send({
      kind: share.target.kind,
      id: share.target.id,
      title: target.title,
      needsPassword: Boolean(share.passwordHash),
      ...(!share.passwordHash && { access: shares.accessFor(share) })
    })
  })
)

/* Entering the password gives the access string the visitor sends from then on. */
app.post(
  '/api/s/:token',
  wrap(async (req, res) => {
    const { share } = await openShare(req.params.token)
    if (shares.tooManyFailures(share.token))
      throw new HttpError(429, 'too-many-attempts')
    if (
      share.passwordHash &&
      !(await shares.checkPassword(req.body.password || '', share.passwordHash))
    ) {
      shares.recordFailure(share.token)
      /* Not 401: that is the frontend's cue to ask for the admin token. */
      throw new HttpError(403, 'wrong-password')
    }
    res.send({ access: shares.accessFor(share) })
  })
)

/**
 * Downloading a photo: the original from the NAS, or the 2048 or 1024
 * variant from disk. Allowed with the admin token, or with a share link
 * that allows downloads and gives access to an album or folder the photo
 * is in.
 */
const DOWNLOADS = {
  original: null,
  2048: { variant: 'large', suffix: '-2048' },
  1024: { variant: 'small', suffix: '-1024' }
}

app.get(
  '/api/photos/:ref/download',
  wrap(async (req, res, next) => {
    const size = req.query.size || 'original'
    if (!(size in DOWNLOADS)) throw new HttpError(400, 'invalid-size')

    const publicId = String(req.params.ref).replace(/\.svg$/, '')
    const photo = await Photo.findOne({ publicId, status: 'ready' }).lean()
    if (!photo) throw new HttpError(404, 'not-found')

    const viewer = await viewerOf(req)
    if (!viewer.admin) {
      const [albums, folders] = await Promise.all([
        Album.find({ 'sections.photos': photo.key }).select('ancestors').lean(),
        Folder.find({ photos: photo.key }).select('ancestors').lean()
      ])
      if (
        ![...albums, ...folders].some((node) => tree.canDownload(node, viewer))
      )
        throw new HttpError(404, 'not-found')
    }

    const name = path.posix.basename(photo.key)
    const download = DOWNLOADS[size]
    /* Vector images have one size. */
    if (!download || photo.key.toLowerCase().endsWith('.svg')) {
      if (!(await library.statSource(photo.key)))
        throw new HttpError(503, 'original-unavailable')
      return res.download(
        photo.key,
        name,
        { root: await library.libraryRoot() },
        (err) => err && !res.headersSent && next(err)
      )
    }

    const base = name.replace(/\.[^.]*$/, '')
    res.download(
      variants.variantPath(photo, download.variant),
      `${base}${download.suffix}.jpg`,
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
