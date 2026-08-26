import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDate, formatVetName } from '@/lib/clinic'
import { PageHeader, Card, EmptyState, Badge, vaccineStatus, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'

interface Vaccination {
  id: number
  pet_name: string
  name: string
  applied_at: string | null
  next_dose_at: string | null
  lot: string | null
  clinic_name: string | null
  vet_name: string | null
}

const typeTone = (t: 'green' | 'yellow' | 'red') => t

export default function Vacinas() {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [loading, setLoading] = useState(true)
  const { query, setQuery, filtered: filteredVaccinations } = useSearchFilter(vaccinations, (v) => [
    v.name,
    v.pet_name,
    v.lot ?? '',
    v.clinic_name ?? '',
    v.vet_name ?? '',
    vaccineStatus(v.next_dose_at).label,
  ])

  useEffect(() => {
    api
      .get<{ vaccinations: Vaccination[] }>('/api/vaccinations/mine')
      .then((r) => setVaccinations(r.vaccinations))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const byPet = new Map<string, Vaccination[]>()
  for (const v of filteredVaccinations) {
    const key = v.pet_name
    if (!byPet.has(key)) byPet.set(key, [])
    byPet.get(key)!.push(v)
  }

  return (
    <div>
      <PageHeader title="Carteira de Vacinação" subtitle="Histórico digital de vacinas e controle de doses futuras." />

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : vaccinations.length === 0 ? (
        <EmptyState
          title="Nenhuma vacina registrada"
          description="As vacinas aplicadas na clínica aparecerão aqui com o controle de reforços."
        />
      ) : (
        <div>
          <div className="mb-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por vacina, pet, lote ou status…" />
          </div>

          {filteredVaccinations.length === 0 ? (
            <EmptyState title="Nenhuma vacina encontrada" description="Ajuste a busca." />
          ) : (
          <div className="space-y-6">
          {[...byPet.entries()].map(([petName, list]) => (
            <div key={petName}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-display text-base font-black text-dark">{petName}</h2>
                <span className="h-px flex-1 bg-dark/10" />
              </div>
              <div className="space-y-3">
                {list.map((v) => {
                  const st = vaccineStatus(v.next_dose_at)
                  return (
                    <Card key={v.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-verde-claro text-verde">
                          <SyringeIcon />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-base font-black text-dark">{v.name}</p>
                            <Badge tone={typeTone(st.tone)}>
                              <StatusDot tone={st.tone} /> {st.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-dark/55">
                            {v.applied_at ? `Aplicada em ${formatDate(v.applied_at)}` : 'Aplicação a registrar'}
                            {v.vet_name ? ` · ${formatVetName(v.vet_name)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-x-5 gap-y-1 text-xs text-dark/55">
                        {v.next_dose_at && (
                          <span>
                            <span className="font-semibold text-dark/70">Próxima dose: </span>
                            {formatDate(v.next_dose_at)}
                          </span>
                        )}
                        {v.lot && (
                          <span>
                            <span className="font-semibold text-dark/70">Lote: </span>
                            {v.lot}
                          </span>
                        )}
                        {v.clinic_name && <span>{v.clinic_name}</span>}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
          </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-6 rounded-2xl border border-dark/8 bg-white p-5 text-xs text-dark/55">
        <Legend tone="green" label="Em dia — sem doses próximas ou atrasadas." />
        <Legend tone="yellow" label="Próxima dose — vence em até 30 dias." />
        <Legend tone="red" label="Atrasada — procure a clínica." />
      </div>
    </div>
  )
}

function StatusDot({ tone }: { tone: 'green' | 'yellow' | 'red' }) {
  const colors = { green: 'bg-verde', yellow: 'bg-yellow-500', red: 'bg-magenta' }
  return <span className={`h-2 w-2 rounded-full ${colors[tone]}`} />
}

function Legend({ tone, label }: { tone: 'green' | 'yellow' | 'red'; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusDot tone={tone} />
      {label}
    </span>
  )
}

function SyringeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="m18 2 4 4M17 7 3 21M8 14 4 18M15 9l2 2M12 12l2 2M9 15l2 2" />
    </svg>
  )
}
