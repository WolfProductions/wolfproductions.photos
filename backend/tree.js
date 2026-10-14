/**
 * The folder tree: who may see a folder or album, the path to it, and what a
 * folder shows. The whole tree is loaded at once; it holds dozens of folders,
 * not thousands.
 */
const { Folder, Album } = require('./models')

/* Every folder, by id. */
async function loadFolders() {
  const folders = await Folder.find().lean()
  return new Map(folders.map((folder) => [String(folder._id), folder]))
}

/* The ancestors of a new child of `parent` (a folder, or null for the top level). */
function ancestorsUnder(parent) {
  return parent ? [...parent.ancestors, parent._id] : []
}

/**
 * Whether a folder or album is public or private: its own setting, else that
 * of the nearest folder above it with one. Nothing set means private.
 */
function visibilityOf(node, folders) {
  if (node.visibility && node.visibility != 'inherit') return node.visibility
  for (const id of [...(node.ancestors || [])].reverse()) {
    const folder = folders.get(String(id))
    if (folder && folder.visibility && folder.visibility != 'inherit')
      return folder.visibility
  }
  return 'private'
}

/* Share links come in a later phase; until then a visitor sees what is public. */
function canView(node, folders, viewer) {
  return viewer.admin || visibilityOf(node, folders) == 'public'
}

/**
 * The folders above a node, top level first. A visitor only gets the part
 * they may open: the path stops at the lowest folder they cannot see.
 */
function breadcrumb(node, folders, viewer) {
  const path = (node.ancestors || [])
    .map((id) => folders.get(String(id)))
    .filter(Boolean)
  let start = 0
  if (!viewer.admin)
    for (let i = path.length - 1; i >= 0; i--)
      if (!canView(path[i], folders, viewer)) {
        start = i + 1
        break
      }
  return path.slice(start).map(({ _id, title }) => ({ _id, title }))
}

/* The logo of a node: its own (folders only), else that of the nearest folder above. */
function logoOf(node, folders) {
  if (node.logo) return node.logo
  for (const id of [...(node.ancestors || [])].reverse()) {
    const folder = folders.get(String(id))
    if (folder && folder.logo) return folder.logo
  }
  return ''
}

/* Every key a folder refers to. */
function folderKeys(folder) {
  return [
    ...new Set([folder.cover, folder.logo, ...(folder.photos || [])])
  ].filter(Boolean)
}

/* The order of the folders and albums inside a folder. */
function sortChildren(items, sort) {
  const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '', 'nl')
  const byOrder = (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
  const byDate = (a, b) => new Date(b.date || 0) - new Date(a.date || 0)

  if (sort == 'title') return items.sort(byTitle)
  if (sort == 'manual')
    return items.sort((a, b) => byOrder(a, b) || byTitle(a, b))
  /* date-desc: albums newest first; folders have no date and keep their title order. */
  return items.sort((a, b) => byDate(a, b) || byTitle(a, b))
}

/**
 * A folder as a card in a list. Without a cover of its own it takes the
 * cover of the newest album below it that the viewer may see, so a private
 * album never shows up on a public card.
 */
async function folderCard(folder, folders, viewer) {
  let cover = folder.cover
  if (!cover) {
    const albums = await Album.find({ ancestors: folder._id })
      .select('cover date visibility ancestors')
      .sort({ date: -1 })
      .lean()
    const album = albums.find(
      (album) => album.cover && canView(album, folders, viewer)
    )
    cover = album ? album.cover : ''
  }

  return {
    _id: folder._id,
    title: folder.title,
    description: folder.description,
    cover,
    logo: logoOf(folder, folders),
    order: folder.order,
    ...(viewer.admin && {
      visibility: folder.visibility,
      effectiveVisibility: visibilityOf(folder, folders)
    })
  }
}

/* An album as a card in a list. */
function albumCard(album, folders, viewer) {
  return {
    _id: album._id,
    title: album.title,
    date: album.date,
    cover: album.cover,
    order: album.order,
    ...(viewer.admin && {
      visibility: album.visibility,
      effectiveVisibility: visibilityOf(album, folders)
    })
  }
}

/* The subfolders and albums directly inside a folder (or at the top level) that the viewer may see. */
async function children(parentId, folders, viewer, sort) {
  const subfolders = [...folders.values()].filter(
    (folder) =>
      String(folder.parent || '') == String(parentId || '') &&
      canView(folder, folders, viewer)
  )
  const albums = parentId
    ? (
        await Album.find({ folder: parentId }).select('-sections').lean()
      ).filter((album) => canView(album, folders, viewer))
    : []

  return {
    folders: sortChildren(
      await Promise.all(
        subfolders.map((folder) => folderCard(folder, folders, viewer))
      ),
      sort == 'manual' ? 'manual' : 'title'
    ),
    albums: sortChildren(
      albums.map((album) => albumCard(album, folders, viewer)),
      sort
    )
  }
}

/**
 * Whether `parentId` may become the parent of `folder`: it must exist and
 * must not be the folder itself or lie below it.
 */
function isValidParent(folder, parentId, folders) {
  if (!parentId) return true
  const parent = folders.get(String(parentId))
  if (!parent) return false
  if (!folder) return true
  return (
    String(parent._id) != String(folder._id) &&
    !parent.ancestors.some((id) => String(id) == String(folder._id))
  )
}

/**
 * Give a folder new ancestors and rewrite those of everything below it: the
 * part above the folder changes, the part below stays.
 */
async function moveSubtree(folderId, newAncestors) {
  const rewrite = (ancestors) => {
    const index = ancestors.findIndex((id) => String(id) == String(folderId))
    return [...newAncestors, folderId, ...ancestors.slice(index + 1)]
  }

  await Folder.updateOne(
    { _id: folderId },
    { $set: { ancestors: newAncestors } }
  )
  for (const Model of [Folder, Album]) {
    const below = await Model.find({ ancestors: folderId })
      .select('ancestors')
      .lean()
    if (!below.length) continue
    await Model.bulkWrite(
      below.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { ancestors: rewrite(doc.ancestors) } }
        }
      }))
    )
  }
}

module.exports = {
  loadFolders,
  ancestorsUnder,
  visibilityOf,
  canView,
  breadcrumb,
  logoOf,
  folderKeys,
  folderCard,
  albumCard,
  children,
  isValidParent,
  moveSubtree
}
