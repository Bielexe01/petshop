import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDateFull } from '@/lib/clinic'
import { PageHeader, Card, Badge } from '@/admin/ui'
import { auditActionLabel } from '@/lib/audit'

interface Overview {
  clients: number
  pets: number
  appointments: number
  documents: number
  upcoming: Array<Record<string, unknown>>
  recentClients: Array<Record<string, unknown>>
  recentAudit: Array<Record<string, unknown>>
}

type IconProps = { className?: string }

function UsersIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function PawIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="9" cy="10" r="2.2" />
      <circle cx="12.5" cy="7.3" r="2.2" />
      <circle cx="16" cy="10" r="2.2" />
      <path d="M12 13.2c-3 0-5.4 1.9-5.4 3.9 0 1 .9 1.6 2.1 1.6 1.7 0 1.9-.6 3.3-.6s1.6.6 3.3.6c1.2 0 2.1-.6 2.1-1.6 0-2-2.4-3.9-5.4-3.9Z" />
    </svg>
  )
}

function CalendarIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function DocumentIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  )
}

/** Data/hora compacta (dd/mm, hh:mm) — para itens de lista. */
function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
}

/** Iniciais do nome para o avatar do cliente. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const result = parts.map((w) => w[0]?.toUpperCase() ?? '').join('')
  return result || '?'
}

const APPOINTMENT_DOT: Record<string, string> = {
  consulta: 'bg-turquesa',
  retorno: 'bg-azul',
  vacina: 'bg-verde',
  exame: 'bg-magenta',
}

function appointmentDot(type: string): string {
  return APPOINTMENT_DOT[type] ?? 'bg-dark/35'
}

function auditDot(action: string): string {
  if (action.startsWith('remover')) return 'bg-magenta'
  if (action.startsWith('criar')) return 'bg-verde'
  if (action.startsWith('editar')) return 'bg-azul'
  if (action.startsWith('visualizar')) return 'bg-turquesa'
  return 'bg-dark/35'
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ overview: Overview }>('/api/admin/overview')
      .then((r) => setOverview(r.overview))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-8 h-8 w-40 animate-pulse rounded bg-dark/10" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: 'Clientes',
      value: overview?.clients ?? 0,
      chip: 'from-magenta/15 to-rosa/8 text-magenta',
      icon: <UsersIcon />,
    },
    {
      label: 'Pets',
      value: overview?.pets ?? 0,
      chip: 'from-turquesa/15 to-azul/8 text-turquesa',
      icon: <PawIcon />,
    },
    {
      label: 'Consultas',
      value: overview?.appointments ?? 0,
      chip: 'from-azul/15 to-azul-claro/8 text-azul',
      icon: <CalendarIcon />,
    },
    {
      label: 'Documentos',
      value: overview?.documents ?? 0,
      chip: 'from-verde/15 to-verde-claro/8 text-verde',
      icon: <DocumentIcon />,
    },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da clínica." />

      {/* Cartões de estatísticas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group rounded-2xl border border-dark/8 bg-white p-4 shadow-soft transition-colors hover:border-dark/20"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-2xl font-black leading-none tabular-nums text-dark sm:text-3xl">{s.value}</p>
                <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-wider text-dark/45">{s.label}</p>
              </div>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-105 ${s.chip}`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Próximas consultas */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-black text-dark">Próximas consultas</h2>
            {overview?.upcoming?.length ? <Badge tone="turquesa">{overview.upcoming.length}</Badge> : null}
          </div>
          {!overview?.upcoming?.length ? (
            <p className="text-sm text-dark/55">Nenhuma consulta agendada.</p>
          ) : (
            <ul className="divide-y divide-dark/5">
              {overview.upcoming.map((a) => (
                <li key={String(a.id)} className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cream">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${appointmentDot(String(a.type))}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-dark">{String(a.pet_name)}</p>
                    <p className="truncate text-xs text-dark/50">
                      {String(a.client_name ?? '—')} · {String(a.type)}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-[11px] font-semibold text-dark/50">
                    {a.scheduled_at ? formatWhen(String(a.scheduled_at)) : 'A confirmar'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Atividade recente */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-black text-dark">Atividade recente</h2>
            {overview?.recentAudit?.length ? <Badge tone="azul">{overview.recentAudit.length}</Badge> : null}
          </div>
          {!overview?.recentAudit?.length ? (
            <p className="text-sm text-dark/55">Sem atividades registradas.</p>
          ) : (
            <ul className="divide-y divide-dark/5">
              {overview.recentAudit.map((log) => (
                <li key={String(log.id)} className="group -mx-3 flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cream">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${auditDot(String(log.action))}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-dark/80">
                      <span className="font-bold">{String(log.admin_name ?? '—')}</span>
                      <span className="mx-1 text-dark/30">·</span>
                      <span className="font-medium">{auditActionLabel(String(log.action))}</span>
                    </p>
                    {log.details ? <p className="truncate text-xs text-dark/45">{String(log.details)}</p> : null}
                  </div>
                  <time className="shrink-0 text-right text-[11px] text-dark/40" dateTime={String(log.created_at)}>
                    {formatDateFull(String(log.created_at))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Novos clientes */}
      <Card className="mt-4 lg:mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-black text-dark">Novos clientes</h2>
          {overview?.recentClients?.length ? <Badge tone="verde">{overview.recentClients.length}</Badge> : null}
        </div>
        {!overview?.recentClients?.length ? (
          <p className="text-sm text-dark/55">Nenhum cliente ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {overview.recentClients.map((c) => (
              <div
                key={String(c.id)}
                className="group rounded-xl border border-dark/8 bg-white p-3 transition-colors hover:border-magenta/25 hover:bg-cream"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-magenta/15 to-rosa/10 font-display text-xs font-black text-magenta">
                    {initials(String(c.full_name ?? 'Sem nome'))}
                  </span>
                  <p className="truncate text-sm font-bold text-dark">{String(c.full_name ?? 'Sem nome')}</p>
                </div>
                <p className="mt-1 truncate text-xs text-dark/50">{String(c.email)}</p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-dark/40">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-verde" aria-hidden="true" />
                  {formatWhen(String(c.created_at))}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6">
        <Badge tone="gray">Ações que você pode executar: criar cliente, pet, consulta, receita, exame, vacina e documento.</Badge>
      </div>
    </div>
  )
}
