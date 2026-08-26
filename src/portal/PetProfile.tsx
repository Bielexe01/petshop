import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatDate, formatVetName } from '@/lib/clinic'
import { Card, EmptyState, Badge, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { PawIcon } from '@/components/ui/icons'
import { PetAvatar } from '@/components/ui/PetAvatar'
import { PetPhotoPicker } from '@/components/ui/PetPhotoPicker'
import { ChevronRightIcon } from '@/portal/icons'

interface Pet {
  id: number
  name: string
  species: string
  breed: string | null
  sex: string
  birth_date: string | null
  weight_kg: number | null
  microchip: string | null
  photo_url: string | null
  notes: string | null
}

interface RecordItem {
  id: number
  record_type: string
  title: string
  description: string | null
  vet_name: string | null
  created_at: string
}

const typeColors: Record<string, 'magenta' | 'turquesa' | 'azul' | 'verde'> = {
  consulta: 'magenta',
  cirurgia: 'azul',
  vacina: 'verde',
  exame: 'turquesa',
  retorno: 'magenta',
}

const typeLabel: Record<string, string> = {
  consulta: 'Consulta',
  cirurgia: 'Cirurgia',
  vacina: 'Vacina',
  exame: 'Exame',
  retorno: 'Retorno',
  urgencia: 'Urgência',
}

export default function PetProfile() {
  const { id } = useParams()
  const petId = Number(id)
  const [pet, setPet] = useState<Pet | null>(null)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const { query, setQuery, filtered: filteredRecords } = useSearchFilter(records, (r) => [
    r.title,
    r.description ?? '',
    typeLabel[r.record_type] ?? r.record_type,
    r.vet_name ?? '',
  ])

  const loadPet = () => {
    api.get<{ pet: Pet }>(`/api/pets/mine/${petId}`).then((r) => setPet(r.pet)).catch(() => {})
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      api.get<{ pet: Pet }>(`/api/pets/mine/${petId}`),
      api.get<{ records: RecordItem[] }>(`/api/records/pet/${petId}`),
    ])
      .then(([p, r]) => {
        if (cancelled) return
        setPet(p.pet)
        setRecords(r.records)
      })
      .catch(() => {
        /* 404 → redireciona abaixo */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [petId])

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-dark/10" />
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      </div>
    )
  }

  if (!pet) {
    return (
      <EmptyState
        icon={<PawIcon className="h-10 w-10" />}
        title="Pet não encontrado"
        description="Este pet não existe ou não pertence à sua conta."
        action={<Link to="/dashboard/pets" className="text-xs font-semibold text-turquesa hover:text-azul">Voltar aos meus pets</Link>}
      />
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard/pets" className="text-xs font-semibold text-turquesa hover:text-azul">
          ← Meus pets
        </Link>
      </div>

      {/* Cabeçalho do pet */}
      <Card className="mb-8 overflow-hidden p-0">
        <div className="flex flex-col items-start gap-6 bg-gradient-to-br from-magenta/10 via-cream to-turquesa/10 p-6 sm:flex-row sm:items-center lg:p-8">
          <PetAvatar petId={pet.id} photoUrl={pet.photo_url} className="h-24 w-24 rounded-3xl shadow-soft" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-black tracking-tight text-dark">{pet.name}</h1>
            <p className="mt-1 text-sm text-dark/60">
              {pet.species === 'cachorro' ? 'Cachorro' : pet.species === 'gato' ? 'Gato' : 'Outro'}
              {pet.breed ? ` · ${pet.breed}` : ''} · {pet.sex === 'macho' ? 'macho' : pet.sex === 'femea' ? 'fêmea' : 'sexo não informado'}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {pet.birth_date && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-dark/45">Nascimento</dt>
                <dd className="mt-0.5 font-semibold text-dark">{formatDate(pet.birth_date)}</dd>
              </div>
            )}
            {pet.weight_kg != null && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-dark/45">Peso</dt>
                <dd className="mt-0.5 font-semibold text-dark">{pet.weight_kg} kg</dd>
              </div>
            )}
            {pet.microchip && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-dark/45">Microchip</dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold text-dark">{pet.microchip}</dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-dark/45">Registros</dt>
              <dd className="mt-0.5 font-semibold text-dark">{records.length}</dd>
            </div>
          </dl>
        </div>
        {pet.notes && <p className="border-t border-dark/8 px-6 py-4 text-sm text-dark/60">{pet.notes}</p>}
        <div className="border-t border-dark/8 px-6 py-4">
          <PetPhotoPicker petId={pet.id} photoUrl={pet.photo_url} onUploaded={() => loadPet()} />
        </div>
      </Card>

      {/* Timeline médica */}
      <div>
        <h2 className="mb-5 font-display text-xl font-black tracking-tight text-dark">Histórico médico</h2>
        {records.length === 0 ? (
          <EmptyState
            title="Sem registros ainda"
            description="Quando houver consultas, exames e vacinas, eles aparecerão aqui em ordem cronológica."
          />
        ) : (
          <>
            <div className="mb-4">
              <SearchInput value={query} onChange={setQuery} placeholder="Buscar no histórico (tipo, título, veterinária)…" />
            </div>
            {filteredRecords.length === 0 ? (
              <EmptyState title="Nenhum registro encontrado" description="Ajuste a busca." />
            ) : (
          <ol className="relative space-y-6 border-l-2 border-dark/10 pl-6 lg:pl-8">
            {filteredRecords.map((r) => {
              const tone = typeColors[r.record_type] ?? 'magenta'
              return (
                <li key={r.id} className="relative">
                  <span className="absolute -left-[31px] top-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow-soft ring-2 ring-turquesa lg:-left-[39px]">
                    <span className="h-2 w-2 rounded-full bg-turquesa" />
                  </span>
                  <Card className="group">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone={tone}>{typeLabel[r.record_type] ?? r.record_type}</Badge>
                        <span className="text-xs text-dark/45">{formatDate(r.created_at)}</span>
                      </div>
                      {r.vet_name && <span className="text-xs text-dark/50">{formatVetName(r.vet_name)}</span>}
                    </div>
                    <p className="mt-2 font-display text-base font-bold text-dark">{r.title}</p>
                    {r.description && <p className="mt-1 text-sm leading-relaxed text-dark/60">{r.description}</p>}
                  </Card>
                </li>
              )
            })}
          </ol>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/dashboard/agendamentos"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
        >
          Agendar consulta <ChevronRightIcon className="h-4 w-4" />
        </Link>
        <Link
          to="/dashboard/consultas"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-dark/15 px-6 font-display text-xs font-bold uppercase tracking-wider text-dark transition-colors hover:border-magenta hover:text-magenta"
        >
          Ver todas as consultas
        </Link>
      </div>
    </div>
  )
}
