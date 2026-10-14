import api from '../api'

/**
 * The entries of a folder of the photo library: '..' (except at the top),
 * the subfolders, then the photos sorted on the date they were taken.
 */
export async function loadLibrary(prefix) {
  const { parent, folders, files } = (
    await api.get('/library', { params: { path: prefix } })
  ).data

  return [
    ...(parent === null ? [] : [{ key: parent, name: '..', type: 'folder' }]),
    ...folders.map((folder) => ({
      key: folder.path,
      name: folder.name,
      type: 'folder'
    })),
    ...files.map((file) => ({
      key: file.key,
      name: file.name,
      type: 'file',
      created: file.takenAt
    }))
  ]
}

export function libraryError(e) {
  return e.response?.status == 401
    ? 'The admin token is needed to browse the photos.'
    : 'The photo library is not available.'
}
