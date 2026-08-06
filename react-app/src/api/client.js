const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'patato_token'

let unauthorizedHandler = null

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  })

  const esRutaAuth = path.startsWith('/auth/login') || path.startsWith('/auth/register')

  if (response.status === 401 && !esRutaAuth && unauthorizedHandler) {
    unauthorizedHandler()
  }

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message || 'Ocurrió un error al comunicarse con el servidor'
    throw new Error(message)
  }

  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
}
