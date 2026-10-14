import api from '../api'

/* The variants the backend makes of every photo and their file types (backend/variants.js). */
const EXTENSIONS = { thumb: 'webp', medium: 'webp', large: 'jpg', small: 'jpg' }

/**
 * The URL of a variant of a photo, from the ref the API gives for it (a
 * random id, never the photo's path): 'thumb' (covers 480x320), 'medium'
 * (covers 960x640) or 'large' (fits in 2048x2048). Vector images are served
 * as they are; their ref ends in .svg.
 */
export function getPhotoUrl(ref, variant = 'thumb') {
  if (!ref) return ''
  if (ref.toLowerCase().endsWith('.svg')) return `/media/${variant}/${ref}`
  return `/media/${variant}/${ref}.${EXTENSIONS[variant]}`
}

/* The sizes a photo can be downloaded in. */
export const DOWNLOAD_SIZES = [
  { size: 'original', label: 'Original' },
  { size: '2048', label: '2048 px' },
  { size: '1024', label: '1024 px' }
]

/**
 * Download a photo. It goes through the API so the admin token or share
 * link is sent along; the file name comes from the backend.
 */
export async function downloadPhoto(ref, size = 'original') {
  const response = await api.get(`/photos/${ref}/download`, {
    params: { size },
    responseType: 'blob'
  })
  const disposition = response.headers['content-disposition'] || ''
  const match =
    disposition.match(/filename\*=UTF-8''([^;]+)/i) ||
    disposition.match(/filename="?([^";]+)"?/i)
  const name = match ? decodeURIComponent(match[1]) : `${ref}.jpg`

  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
