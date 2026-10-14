import { reactive } from 'vue'
import api, { clearToken, getToken, setToken } from './api'

/* Whether this browser holds a valid admin token; the admin controls only show when it does. */
export const session = reactive({ admin: false })

export async function checkSession() {
  if (!getToken()) return (session.admin = false)
  try {
    session.admin = (await api.get('/session')).data.admin
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
}
