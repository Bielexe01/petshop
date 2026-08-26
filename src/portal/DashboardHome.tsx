import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { CLINIC } from '@/lib/clinic'
import { formatDateFull } from '@/lib/clinic'
import { PageHeader, Card, Badge } from '@/portal/ui'
import { PetAvatar } from '@/components/ui/PetAvatar'
import { ChevronRightIcon, CalendarIcon, ClockIcon } from '@/portal/icons'

interface Pet {
  id: number
  name: string
  species: string
  breed: string | null
  sex: string
  birth_date: string | null
  weight_kg: number | null
  photo_url: string | null
  consultas: number
}

interface Appointment {
  id: number
  pet_name: string
  type: string
  status: string
  scheduled_at: string | null
}

export default function DashboardHome() {
  const { user } = useSession()
  const [pets, setPets] = useState<Pet[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([api.get<{ pets: Pet[] }>('/api/pets/mine'), api.get<{ appointments: Appointment[] }>('/api/appointments/mine')])
      .then(([p, a]) => {
        if (cancelled) return
        setPets(p.pets)
        // próximas consultas: agendadas com data futura, e depois todas as agendadas
        const future = a.appointments
          .filter((ap) => ap.status === 'agendada')
          .sort((x, y) => String(x.scheduled_at ?? '').localeCompare(String(y.scheduled_at ?? '')))
        setAppointments(future.slice(0, 3))
      })
      .catch(() => {
        /* já logado; fallback vazio */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div>
      <PageHeader
        title={`Olá, ${firstName}!`}
        subtitle="Aqui você acompanha tudo sobre o cuidado do seu pet."
      />

      {/* CTA de agendamento rápido */}
      <Card className="mb-8 flex flex-col items-start justify-between gap-4 bg-gradient-to-br from-turquesa-claro to-cream sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-lg font-black text-dark">Precisa de uma consulta?</p>
          <p className="mt-0.5 text-sm text-dark/60">Agende agora e a clínica confirma pelo WhatsApp.</p>
        </div>
        <Link
          to="/dashboard/agendamentos"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-turquesa px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul"
        >
          Agendar consulta <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </Card>

      {/* Pets */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-dark/60">Meus pets</h2>
          <Link to="/dashboard/pets" className="text-xs font-semibold text-turquesa hover:text-azul">
            Ver todos
          </Link>
        </div>
        {loading ? (
          <PetSkeleton />
        ) : pets.length === 0 ? (
          <Card className="text-sm text-dark/60">
            Você ainda não cadastrou um pet. Fale com a clínica para vincular seu primeiro pet à conta.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                to={`/dashboard/pets/${pet.id}`}
                className="group rounded-2xl border border-dark/8 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-magenta/40 hover:shadow-glow"
              >
                <div className="flex items-center gap-3">
                  <PetAvatar petId={pet.id} photoUrl={pet.photo_url} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-black text-dark">{pet.name}</p>
                    <p className="truncate text-xs text-dark/55">
                      {pet.breed ?? pet.species} · {pet.sex === 'macho' ? 'macho' : pet.sex === 'femea' ? 'fêmea' : '—'}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-dark/30 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-dark/8 pt-3 text-xs text-dark/55">
                  <span>{pet.consultas} consulta{pet.consultas === 1 ? '' : 's'}</span>
                  <span className="font-semibold text-magenta">Ver histórico</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Próximas consultas */}
      <div>
        <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-dark/60">
          Próximas consultas
        </h2>
        {loading ? (
          <div className="h-28 animate-pulse rounded-2xl bg-dark/5" />
        ) : appointments.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-dark/60">
            <CalendarIcon className="h-5 w-5 text-magenta/50" />
            Nenhuma consulta agendada no momento.
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((ap) => (
              <Card key={ap.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-azul-claro text-azul">
                    <CalendarIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-dark">{ap.pet_name}</p>
                    <p className="text-xs capitalize text-dark/55">{ap.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-dark/55">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="h-4 w-4" />
                    {ap.scheduled_at ? formatDateFull(ap.scheduled_at) : 'A confirmar'}
                  </span>
                  <Badge tone="blue">Agendada</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Emergência */}
      <Card className="mt-8 flex flex-col items-center justify-between gap-4 border-magenta/20 bg-magenta/5 text-center sm:flex-row sm:text-left">
        <div>
          <p className="font-display text-lg font-black text-dark">Emergência? Estamos 24h por aqui.</p>
          <p className="mt-0.5 text-sm text-dark/60">{CLINIC.phone} · atendimento todos os dias</p>
        </div>
        <a
          href={CLINIC.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-magenta px-7 font-display text-xs font-black uppercase tracking-wider text-white shadow-glow transition-transform hover:-translate-y-0.5"
        >
          Chamar agora
        </a>
      </Card>
    </div>
  )
}

function PetSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-dark/5" />
      ))}
    </div>
  )
}
