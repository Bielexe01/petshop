import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/api'

export interface SessionUser {
  id: number
  email: string
  role: 'client' | 'admin'
  name: string
  /** Apenas UI-gating (mostrar/esconder telas). Autorização real é no backend. */
  isSuperAdmin?: boolean
}

interface SessionContextValue {
  user: SessionUser | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<SessionUser>
  register: (data: {
    fullName: string
    cpf?: string
    phone?: string
    email: string
    password: string
    confirmPassword: string
  }) => Promise<SessionUser>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser | null }>('/api/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: SessionUser }>('/api/auth/login', { email, password })
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (form: {
    fullName: string
    cpf?: string
    phone?: string
    email: string
    password: string
    confirmPassword: string
  }) => {
    const data = await api.post<{ user: SessionUser }>('/api/auth/register', form)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      /* mesmo sem resposta, limpa localmente */
    }
    setUser(null)
  }, [])

  return (
    <SessionContext.Provider value={{ user, loading, refresh, login, register, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession deve ser usado dentro de <SessionProvider>')
  return ctx
}
