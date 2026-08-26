import { useEffect, useState } from 'react'
import { api, downloadFile, openFile } from '@/lib/api'
import { formatDate, formatVetName } from '@/lib/clinic'
import { PageHeader, Card, EmptyState, Badge, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { DownloadIcon, ViewIcon } from '@/portal/icons'

interface Prescription {
  id: number
  pet_name: string
  vet_name: string | null
  issued_at: string | null
  valid_until: string | null
  instructions: string | null
}

export default function Receitas() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const { query, setQuery, filtered: filteredRx } = useSearchFilter(prescriptions, (rx) => [rx.pet_name, rx.vet_name ?? ''])

  useEffect(() => {
    api
      .get<{ prescriptions: Prescription[] }>('/api/prescriptions/mine')
      .then((r) => setPrescriptions(r.prescriptions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader
        title="Receitas"
        subtitle="Acesso somente leitura às suas receitas. Consulte um profissional antes de usar."
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          title="Nenhuma receita disponível"
          description="Receitas emitidas pela clínica aparecerão aqui para consulta e download."
        />
      ) : (
        <div>
          <div className="mb-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por pet ou veterinária…" />
          </div>

          {filteredRx.length === 0 ? (
            <EmptyState title="Nenhuma receita encontrada" description="Ajuste a busca." />
          ) : (
            <div className="space-y-3">
              {filteredRx.map((rx) => (
                <Card key={rx.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-turquesa/10 text-turquesa">
                      <FilePrescriptionIcon />
                    </span>
                    <div>
                      <p className="font-display text-base font-black text-dark">Receita · {rx.pet_name}</p>
                      <p className="text-sm text-dark/55">
                        Emitida em {rx.issued_at ? formatDate(rx.issued_at) : '—'}
                        {rx.vet_name ? ` · ${formatVetName(rx.vet_name)}` : ''}
                      </p>
                      {rx.valid_until && (
                        <p className="mt-0.5 text-xs text-dark/45">Validade: {formatDate(rx.valid_until)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openFile(`/api/prescriptions/mine/${rx.id}/pdf`).catch(() => alert('Não foi possível abrir o PDF.'))}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-dark/15 px-5 font-display text-[11px] font-bold uppercase tracking-wider text-dark transition-colors hover:border-turquesa hover:text-turquesa"
                    >
                      <ViewIcon className="h-4 w-4" /> Visualizar
                    </button>
                    <button
                      onClick={() => downloadFile(`/api/prescriptions/mine/${rx.id}/download`, `receita-${rx.id}.pdf`).catch(() => alert('Não foi possível baixar o PDF.'))}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-5 font-display text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
                    >
                      <DownloadIcon className="h-4 w-4" /> Baixar PDF
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs leading-relaxed text-yellow-800">
        <Badge tone="yellow">Importante</Badge>
        <span>Este é um canal informativo. Medicamentos devem ser usados somente sob orientação veterinária.</span>
      </p>
    </div>
  )
}

function FilePrescriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M9 3h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M8 11v8l2 2 3-3 3 3 2-2v-8" />
    </svg>
  )
}
