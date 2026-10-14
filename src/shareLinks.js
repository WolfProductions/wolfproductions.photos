/* The share links this browser opened: token -> what to send for it (backend/shares.js). */
const KEY = 'shareLinks'

/* Kept here too, for a browser that does not store anything. */
const memory = {}

export function getShareLinks() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch (e) {
    return {}
  }
}

export function saveShareLink(token, access) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...getShareLinks(), [token]: access })
    )
  } catch (e) {
    /* Without storage the link works until the page is reloaded. */
  }
  memory[token] = access
}

/* The header value: the newest links first, as the backend reads at most ten. */
export function shareHeader() {
  const links = { ...getShareLinks(), ...memory }
  return Object.values(links).reverse().slice(0, 10).join(',')
}
