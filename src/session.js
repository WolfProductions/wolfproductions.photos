import { reactive } from 'vue'
import api, { clearToken, setToken } from './api'

/**
 * Whether this browser holds a valid admin token (the admin controls only
 * show when it does), and what the share links it opened point at.
 */
export const session = reactive({ admin: false, shared: [] })

export async function checkSession() {
  try {
    const { admin, shared } = (await api.get('/session')).data
    session.admin = admin
    session.shared = shared
  } catch (e) {
    session.admin = false
  }
}

export async function login() {
  const token = window.prompt('Admin token')
  if (!token) return
  setToken(token.trim())
  await checkSession()
  if (!session.admin) {
    clearToken()
    window.alert('That token is not valid.')
  }
}

export function logout() {
  clearToken()
  session.admin = false
  checkSession()
}
