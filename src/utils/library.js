import api from '../api'

/**
 * A folder of the photo library: its subfolders, and its photos sorted on
 * the date they were taken.
 */
export async function loadLibrary(prefix) {
  const { folders, files } = (
    await api.get('/library', { params: { path: prefix } })
  ).data

  return {
    folders: folders.map((folder) => ({ key: folder.path, name: folder.name })),
    photos: files.map((file) => ({
      key: file.key,
      name: file.name,
      takenAt: file.takenAt
    }))
  }
}

/* When the photos of the given keys were taken: { [key]: 'YYYY-MM-DDTHH:mm:ss' or null }. */
export async function loadDates(keys) {
  return (await api.post('/library/dates', { keys })).data.dates
}

/* Keys in the order the library shows them: on when they were taken, then on name. */
export function sortByTaken(keys, dates) {
  const name = (key) => key.split('/').pop()
  return [...keys].sort(
    (a, b) =>
      (dates[a] || '').localeCompare(dates[b] || '') ||
      name(a).localeCompare(name(b), undefined, { numeric: true })
  )
}

/* Where the last album was started from, so the next one opens next to it. */
const START_KEY = 'albumStartFolder'

export function lastStartFolder() {
  try {
    return localStorage.getItem(START_KEY) || ''
  } catch (e) {
    return ''
  }
}

export function rememberStartFolder(folder) {
  try {
    localStorage.setItem(START_KEY, folder)
  } catch (e) {
    /* Without storage the next album starts at the top. */
  }
}

export function libraryError(e) {
  return e.response?.status == 401
    ? 'The admin token is needed to browse the photos.'
    : 'The photo library is not available.'
}

/**
 * Previews of the originals, as object URLs. An <img> cannot send the admin
 * token, so they are fetched through the API, a few at a time, in the order
 * they are asked for.
 */
const MAX_LOADING = 6
const MAX_PREVIEWS = 1500

/* By key, least recently asked for first: { promise, url, users, started }. */
const previews = new Map()
const queue = []
let loading = 0

function forget() {
  for (const [key, entry] of previews) {
    if (previews.size <= MAX_PREVIEWS) break
    if (!entry.url || entry.users) continue
    URL.revokeObjectURL(entry.url)
    previews.delete(key)
  }
}

async function fetchPreview(key, entry) {
  entry.started = true
  loading++
  try {
    const response = await api.get('/library/preview', {
      params: { key },
      responseType: 'blob',
      /* The token is asked for by the folder listing, not once per photo. */
      retried: true
    })
    entry.url = URL.createObjectURL(response.data)
    entry.resolve(entry.url)
    forget()
  } catch (e) {
    previews.delete(key)
    entry.reject(e)
  } finally {
    loading--
    next()
  }
}

function next() {
  while (loading < MAX_LOADING && queue.length) {
    const key = queue.shift()
    fetchPreview(key, previews.get(key))
  }
}

/* The preview of a key; call releasePreview() with it once it is off screen. */
export function loadPreview(key) {
  let entry = previews.get(key)
  if (entry) previews.delete(key)
  else {
    entry = { users: 0, started: false }
    entry.promise = new Promise((resolve, reject) =>
      Object.assign(entry, { resolve, reject })
    )
    queue.push(key)
  }
  previews.set(key, entry)
  entry.users++
  next()
  return entry.promise
}

/* A preview nobody waits for any more is not fetched; one that was can be forgotten later. */
export function releasePreview(key) {
  const entry = previews.get(key)
  if (!entry) return
  entry.users--
  if (entry.users > 0 || entry.started) return
  const index = queue.indexOf(key)
  if (index > -1) queue.splice(index, 1)
  previews.delete(key)
}
