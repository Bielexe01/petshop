import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDateFull, formatVetName } from '@/lib/clinic'
import { PageHeader, Card, EmptyState, Badge, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { StethoscopeIcon, XIcon } from '@/portal/icons'

interface Appointment {
  id: number
  pet_name: string
  vet_name: string | null
  type: string
  scheduled_at: string | null
  status: string
  summary: string | null
  diagnosis: string | null
  notes: string | null
}

const statusTone: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  agendada: 'blue',
  realizada: 'green',
  cancelada: 'red',
}

const typeLabel: Record<string, string> = {
  consulta: 'Consulta',
  urgencia: 'Urgência',
  cirurgia: 'Cirurgia',
  retorno: 'Retorno',
  vacina: 'Vacinação',
  outros: 'Outros',
}

export default function Consultas() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const { query, setQuery, filtered: filteredAppointments } = useSearchFilter(appointments, (ap) => [
    ap.pet_name,
    ap.vet_name ?? '',
    typeLabel[ap.type] ?? ap.type,
    statusToneLabel(ap.status),
    ap.summary ?? '',
    ap.diagnosis ?? '',
    ap.notes ?? '',
  ])

  useEffect(() => {
    api
      .get<{ appointments: Appointment[] }>('/api/appointments/mine')
      .then((r) => setAppointments(r.appointments))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Consultas" subtitle="Histórico completo de consultas e atendimentos do seu pet." />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<StethoscopeIcon className="h-10 w-10" />}
          title="Nenhuma consulta registrada"
          description="Quando seu pet passar por uma consulta, ela aparecerá aqui com todos os detalhes."
        />
      ) : (
        <div>
          <div className="mb-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por pet, veterinária, tipo ou status…" />
          </div>

          {filteredAppointments.length === 0 ? (
            <EmptyState title="Nenhuma consulta encontrada" description="Ajuste a busca." />
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((ap) => (
                <Card key={ap.id} className="group">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-magenta/10 text-magenta">
                        <StethoscopeIcon className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-base font-black text-dark">{ap.pet_name}</p>
                          <Badge tone={statusTone[ap.status] ?? 'gray'}>{statusToneLabel(ap.status)}</Badge>
                        </div>
                        <p className="text-sm text-dark/55">
                          {typeLabel[ap.type] ?? ap.type}
                          {ap.vet_name ? ` · ${formatVetName(ap.vet_name)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:shrink-0">
                      <span className="whitespace-nowrap text-xs text-dark/55">{ap.scheduled_at ? formatDateFull(ap.scheduled_at) : 'Data a confirmar'}</span>
                      <button
                        onClick={() => setSelected(ap)}
                        className="w-full rounded-full bg-dark px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-ink sm:w-auto sm:shrink-0 sm:py-2"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de detalhes */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-dark/50" onClick={() => setSelected(null)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-soft sm:rounded-3xl lg:p-8">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-black text-dark">{selected.pet_name}</h2>
                  <Badge tone={statusTone[selected.status] ?? 'gray'}>{statusToneLabel(selected.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-dark/55">
                  {typeLabel[selected.type] ?? selected.type}
                  {selected.vet_name ? ` · ${formatVetName(selected.vet_name)}` : ''}
                </p>
                <p className="mt-1 text-xs text-dark/45">{selected.scheduled_at ? formatDateFull(selected.scheduled_at) : 'Data a confirmar'}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Fechar detalhes"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dark/5 text-dark hover:bg-dark/10"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <DetailBlock title="Motivo / Resumo" body={selected.summary} />
              <DetailBlock title="Diagnóstico" body={selected.diagnosis} />
              <DetailBlock title="Observações" body={selected.notes} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailBlock({ title, body }: { title: string; body: string | null }) {
  return (
    <div>
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-dark/45">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-dark/75">{body || '—'}</p>
    </div>
  )
}

function statusToneLabel(status: string): string {
  const map: Record<string, string> = { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada' }
  return map[status] ?? status
}
