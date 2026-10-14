import axios from 'axios'

const TOKEN_KEY = 'adminToken'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (e) {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (e) {
    /* Without storage the token is asked for again next time. */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (e) {
    /* Nothing stored, nothing to remove. */
  }
}

/* The API lives on the same origin; in development Vite proxies it to the local backend. */
const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* Browsing the library and saving albums need the admin token: ask for it once and try again. */
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status != 401 || error.config.retried)
    return Promise.reject(error)

  const token = window.prompt('Admin token')
  if (!token) return Promise.reject(error)

  setToken(token.trim())
  return api.request({ ...error.config, retried: true })
})

export default api
