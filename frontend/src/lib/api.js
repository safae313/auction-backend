export const API_BASE_URL = (
  import.meta.env.VITE_API_URL?.trim() || 'http://localhost:4400'
).replace(/\/+$/, '')

async function request(path, signal, options = {}) {
  const url = `${API_BASE_URL}${path}`
  let response

  try {
    response = await fetch(url, {
      ...options,
      signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (error instanceof TypeError) {
      throw new Error(`API inaccessible à ${url}. Vérifiez que le backend fonctionne et que CORS autorise cette origine.`)
    }
    throw error
  }

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message = typeof body === 'object' && body !== null
      ? body.message || body.error || `Erreur HTTP ${response.status}`
      : body || `Erreur HTTP ${response.status}`
    throw new Error(String(message))
  }

  if (!contentType.includes('application/json')) {
    throw new Error(`L’API ${path} n’a pas renvoyé de réponse JSON.`)
  }

  return body
}

export function getAuctions(signal) {
  return request('/api/auctions', signal)
}

export function getAuction(id, signal) {
  return request(`/api/auctions/${encodeURIComponent(id)}`, signal)
}

export function getBids(id, signal) {
  return request(`/api/auctions/${encodeURIComponent(id)}/bids`, signal)
}

export function placeBid(id, payload) {
  return request(`/api/auctions/${encodeURIComponent(id)}/bid`, undefined, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
