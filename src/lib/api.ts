/**
 * Cliente de API leve sobre fetch, com credenciais (cookie de sessão),
 * suporte a JSON e download de arquivos autenticados.
 */

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, signal } = opts

  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!res.ok) {
    let message = 'Algo deu errado. Tente novamente.'
    let details: unknown
    try {
      const data = await res.json()
      if (data?.message) message = data.message
      details = data?.details
    } catch {
      /* corpo não-JSON */
    }
    throw new ApiError(message, res.status, details)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, opts?: Omit<ApiOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<ApiOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<ApiOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<ApiOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T>(path: string, opts?: Omit<ApiOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}

/**
 * Baixa um arquivo autenticado (ex.: PDF de receita) e dispara download
 * do navegador com o nome de arquivo do Content-Disposition.
 */
export async function downloadFile(path: string, fallbackName = 'documento.pdf'): Promise<void> {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) {
    let message = 'Não foi possível baixar o arquivo.'
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status)
  }

  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/.exec(cd)
  const name = match?.[1] ? decodeURIComponent(match[1]) : fallbackName

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Abre um arquivo autenticado em nova aba (para visualização). */
export async function openFile(path: string): Promise<void> {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) {
    let message = 'Não foi possível abrir o arquivo.'
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
