import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { formatDateFull } from '@/lib/clinic'
import { PageHeader, Card, EmptyState, Badge, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { CalendarIcon, ClockIcon, CheckIcon } from '@/portal/icons'

interface Appointment {
  id: number
  pet_name: string
  type: string
  status: string
  scheduled_at: string | null
  summary: string | null
}

interface Pet {
  id: number
  name: string
}

const typeLabel: Record<string, string> = {
  consulta: 'Consulta',
  urgencia: 'Urgência',
  retorno: 'Retorno',
  vacina: 'Vacinação',
  outros: 'Outros',
}

export default function Agendamentos() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const history = useMemo(
    () => appointments.filter((a) => a.status !== 'agendada'),
    [appointments],
  )
  const { query, setQuery, filtered: filteredHistory } = useSearchFilter(history, (a) => [
    a.pet_name,
    typeLabel[a.type] ?? a.type,
    a.summary ?? '',
    a.status === 'cancelada' ? 'cancelada' : 'realizada',
  ])
  const [petId, setPetId] = useState('')
  const [type, setType] = useState('consulta')
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const load = () => {
    void Promise.all([
      api.get<{ appointments: Appointment[] }>('/api/appointments/mine'),
      api.get<{ pets: Pet[] }>('/api/pets/mine'),
    ])
      .then(([a, p]) => {
        setAppointments(a.appointments)
        setPets(p.pets)
        if (p.pets.length > 0 && !petId) setPetId(String(p.pets[0].id))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nextAppointment = appointments
    .filter((a) => a.status === 'agendada')
    .sort((x, y) => String(x.scheduled_at ?? '').localeCompare(String(y.scheduled_at ?? '')))[0]

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/appointments/request', {
        petId: Number(petId),
        type,
        preferredDate,
        notes: notes || null,
      })
      setSent(true)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        subtitle="Solicite uma nova consulta. A clínica confirma o horário pelo WhatsApp."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            <CalendarIcon className="h-4 w-4" /> Agendar nova consulta
          </button>
        }
      />

      {sent && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-verde/30 bg-verde-claro px-5 py-4 text-sm font-medium text-verde">
          <CheckIcon className="h-5 w-5 shrink-0" />
          Pedido enviado! A clínica entrará em contato para confirmar o horário.
        </div>
      )}

      {showForm && (
        <Card className="mb-8">
          <p className="mb-4 font-display text-base font-black text-dark">Solicitar nova consulta</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pet" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Pet</label>
              <select id="pet" value={petId} onChange={(e) => setPetId(e.target.value)} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                {pets.length === 0 && <option value="">Nenhum pet cadastrado</option>}
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {pets.length === 0 && (
                <p className="text-xs text-dark/45">Cadastre um pet para poder agendar.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="type" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Tipo</label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
                <option value="vacina">Vacinação</option>
                <option value="urgencia">Urgência</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Data preferencial</label>
              <input
                id="date"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="notes" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Observações</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conte brevemente o motivo da consulta…"
                className="w-full rounded-xl border border-dark/15 bg-white px-4 py-3 text-[15px] text-dark outline-none focus:border-turquesa"
              />
            </div>
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || pets.length === 0}
                className="h-12 w-full rounded-full bg-turquesa font-display text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-azul disabled:opacity-60 sm:w-auto sm:px-10"
              >
                {saving ? 'Enviando…' : 'Enviar pedido'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : (
        <>
          {/* Próxima consulta */}
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-dark/60">Próxima consulta</h2>
          {nextAppointment ? (
            <Card className="mb-8 flex flex-col gap-4 border-turquesa/40 bg-gradient-to-br from-turquesa-claro to-cream sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-turquesa shadow-soft">
                  <CalendarIcon className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-black text-dark">{nextAppointment.pet_name}</p>
                    <Badge tone="blue">{typeLabel[nextAppointment.type] ?? nextAppointment.type}</Badge>
                  </div>
                  <p className="text-sm text-dark/60">
                    {nextAppointment.scheduled_at ? formatDateFull(nextAppointment.scheduled_at) : 'Horário a confirmar'}
                  </p>
                </div>
              </div>
              {nextAppointment.summary && <p className="max-w-xs text-sm text-dark/55">{nextAppointment.summary}</p>}
            </Card>
          ) : (
            <Card className="mb-8 flex items-center gap-3 text-sm text-dark/60">
              <CalendarIcon className="h-5 w-5 text-magenta/50" />
              Você não tem consultas agendadas no momento.
            </Card>
          )}

          {/* Histórico */}
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-dark/60">Histórico de atendimentos</h2>
          {history.length === 0 ? (
            <EmptyState title="Nenhum atendimento registrado" description="Seus atendimentos anteriores aparecerão aqui." />
          ) : (
            <div>
              <div className="mb-4">
                <SearchInput value={query} onChange={setQuery} placeholder="Buscar no histórico…" />
              </div>
              {filteredHistory.length === 0 ? (
                <EmptyState title="Nenhum atendimento encontrado" description="Ajuste a busca." />
              ) : (
            <div className="space-y-3">
              {filteredHistory.map((a) => (
                <Card key={a.id} className="flex items-center gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dark/5 text-dark/60">
                    <ClockIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-dark">{a.pet_name} · {typeLabel[a.type] ?? a.type}</p>
                    <p className="text-xs text-dark/55">{a.scheduled_at ? formatDateFull(a.scheduled_at) : '—'}</p>
                  </div>
                  <Badge tone={a.status === 'cancelada' ? 'red' : 'gray'}>{a.status === 'cancelada' ? 'Cancelada' : 'Realizada'}</Badge>
                </Card>
              ))}
            </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
