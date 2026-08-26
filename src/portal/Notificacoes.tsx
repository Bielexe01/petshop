import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDateFull } from '@/lib/clinic'
import { PageHeader, EmptyState, Badge, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { BellIcon } from '@/portal/icons'

interface Notification {
  id: number
  title: string
  body: string | null
  type: string
  is_read: number
  created_at: string
}

const typeMeta: Record<string, { label: string; color: 'magenta' | 'turquesa' | 'azul' | 'verde' }> = {
  agendamento: { label: 'Agendamento', color: 'turquesa' },
  documento: { label: 'Documento', color: 'azul' },
  consulta: { label: 'Consulta', color: 'magenta' },
  vacina: { label: 'Vacina', color: 'verde' },
  info: { label: 'Informação', color: 'turquesa' },
}

export default function Notificacoes() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const { query, setQuery, filtered: filteredNotifications } = useSearchFilter(notifications, (n) => [
    n.title,
    n.body ?? '',
    typeMeta[n.type]?.label ?? '',
  ])

  const load = () => {
    api
      .get<{ notifications: Notification[]; unread: number }>('/api/notifications/mine')
      .then((r) => {
        setNotifications(r.notifications)
        setUnread(r.unread)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: number) => {
    await api.post(`/api/notifications/${id}/read`).catch(() => {})
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)))
    setUnread((u) => Math.max(0, u - 1))
  }

  const markAll = async () => {
    await api.post('/api/notifications/read-all').catch(() => {})
    setNotifications((list) => list.map((n) => ({ ...n, is_read: 1 })))
    setUnread(0)
  }

  return (
    <div>
      <PageHeader
        title="Notificações"
        subtitle={
          unread > 0
            ? unread === 1
              ? 'Você tem 1 notificação não lida.'
              : `Você tem ${unread} notificações não lidas.`
            : 'Tudo em dia por aqui.'
        }
        action={
          unread > 0 ? (
            <button
              onClick={() => void markAll()}
              className="inline-flex h-10 items-center rounded-full border border-dark/15 px-5 font-display text-[11px] font-bold uppercase tracking-wider text-dark/70 transition-colors hover:border-turquesa hover:text-turquesa"
            >
              Marcar todas como lidas
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="h-10 w-10" />}
          title="Nenhuma notificação"
          description="Avisos sobre agendamentos, documentos e vacinas aparecerão aqui."
        />
      ) : (
        <div>
          <div className="mb-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar notificações…" />
          </div>

          {filteredNotifications.length === 0 ? (
            <EmptyState title="Nenhuma notificação encontrada" description="Ajuste a busca." />
          ) : (
            <div className="space-y-2">
          {filteredNotifications.map((n) => {
            const meta = typeMeta[n.type] ?? typeMeta.info
            return (
              <button
                key={n.id}
                onClick={() => (n.is_read ? undefined : void markRead(n.id))}
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-soft transition-colors hover:border-turquesa/40 ${
                  n.is_read ? 'border-dark/6 opacity-70' : 'border-turquesa/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-magenta" />}
                      <p className={`font-display text-sm font-bold ${n.is_read ? 'text-dark/70' : 'text-dark'}`}>{n.title}</p>
                      <Badge tone={meta.color}>{meta.label}</Badge>
                    </div>
                    {n.body && <p className="mt-1.5 text-sm leading-relaxed text-dark/60">{n.body}</p>}
                    <p className="mt-2 text-[11px] text-dark/40">{formatDateFull(n.created_at)}</p>
                  </div>
                </div>
              </button>
            )
          })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
