import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDate, formatVetName } from '@/lib/clinic'
import { PageHeader, Card, EmptyState, Badge, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'

interface Exam {
  id: number
  pet_name: string
  name: string
  category: string
  status: string
  result_date: string | null
  vet_name: string | null
  notes: string | null
}

const catLabel: Record<string, string> = {
  laboratorial: 'Laboratorial',
  imagem: 'Imagem',
  outros: 'Outros',
}

const statusBadge: Record<string, { tone: 'green' | 'yellow' | 'blue' | 'gray'; label: string }> = {
  pendente: { tone: 'gray', label: 'Pendente' },
  em_andamento: { tone: 'yellow', label: 'Em andamento' },
  concluido: { tone: 'green', label: 'Concluído' },
}

const CATEGORIES = [
  { key: 'laboratorial', label: 'Laboratoriais', desc: 'Hemogramas, bioquímicos, urinálise', color: 'from-magenta/12 to-rosa/8 text-magenta' },
  { key: 'imagem', label: 'Imagem', desc: 'Ultrassom, raio-X, ecocardiograma', color: 'from-turquesa/12 to-azul/8 text-turquesa' },
  { key: 'outros', label: 'Outros', desc: 'Exames e avaliações diversas', color: 'from-verde/12 to-verde/8 text-verde' },
] as const

export default function Exames() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const { query, setQuery, filtered: filteredExams } = useSearchFilter(exams, (e) => [
    e.name,
    e.pet_name,
    catLabel[e.category] ?? e.category,
    statusBadge[e.status]?.label ?? '',
    e.vet_name ?? '',
    e.notes ?? '',
  ])

  useEffect(() => {
    api
      .get<{ exams: Exam[] }>('/api/exams/mine')
      .then((r) => setExams(r.exams))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-40 animate-pulse rounded bg-dark/10" />
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      </div>
    )
  }

  if (exams.length === 0) {
    return (
      <div>
        <PageHeader title="Exames" subtitle="Resultados e andamento dos exames do seu pet." />
        <EmptyState
          title="Nenhum exame registrado"
          description="Quando a clínica registrar um exame, o status e o resultado aparecerão aqui."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Exames"
        subtitle="Resultados e andamento dos exames do seu pet. Laudos em PDF aparecem na aba Documentos."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {CATEGORIES.map((c) => {
          const list = exams.filter((e) => e.category === c.key)
          return (
            <Card key={c.key} className="p-4">
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.color}`}>
                  <FlaskIcon />
                </span>
                <div>
                  <p className="font-display text-sm font-black text-dark">{c.label}</p>
                  <p className="text-xs text-dark/50">{c.desc}</p>
                </div>
              </div>
              <p className="mt-4 font-display text-2xl font-black text-dark">{list.length}</p>
            </Card>
          )
        })}
      </div>

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por exame, pet, categoria ou status…" />
      </div>

      {filteredExams.length === 0 ? (
        <EmptyState title="Nenhum exame encontrado" description="Ajuste a busca." />
      ) : (
        <div className="space-y-3">
          {filteredExams.map((exam) => {
            const st = statusBadge[exam.status] ?? statusBadge.pendente
            return (
              <Card key={exam.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-azul-claro text-azul">
                    <FlaskIcon />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-black text-dark">{exam.name}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="text-sm text-dark/55">
                      {exam.pet_name} · {catLabel[exam.category] ?? exam.category}
                      {exam.vet_name ? ` · ${formatVetName(exam.vet_name)}` : ''}
                    </p>
                    {exam.result_date && <p className="text-xs text-dark/45">Resultado em {formatDate(exam.result_date)}</p>}
                  </div>
                </div>
                {exam.notes && <p className="max-w-sm text-sm leading-relaxed text-dark/60 sm:text-right">{exam.notes}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M9 3h6M10 3v5.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8.5V3" />
      <path d="M7 15h10" />
    </svg>
  )
}
