/* The variants the backend makes of every photo and their file types (backend/variants.js). */
const EXTENSIONS = { thumb: 'webp', medium: 'webp', large: 'jpg' }

/**
 * The URL of a variant of a photo: 'thumb' (covers 480x320), 'medium'
 * (covers 960x640) or 'large' (fits in 2048x2048). Vector images are served
 * as they are.
 */
export function getPhotoUrl(key, variant = 'thumb') {
  if (!key) return ''

  const path = key.split('/').map(encodeURIComponent).join('/')
  const extension = key.toLowerCase().endsWith('.svg')
    ? 'svg'
    : EXTENSIONS[variant]

  return `/media/${variant}/${path}.${extension}`
}

/* The URL that downloads the original file of a photo. */
export function getOriginalUrl(key) {
  return `/api/photos/original?key=${encodeURIComponent(key)}`
}
