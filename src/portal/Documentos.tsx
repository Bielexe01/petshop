import { useEffect, useState } from 'react'
import { api, downloadFile, openFile } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, EmptyState, Badge, SearchInput } from '@/portal/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { DownloadIcon, ViewIcon, FileIcon } from '@/portal/icons'

interface Document {
  id: number
  title: string
  type: string
  pet_name: string | null
  mime: string
  created_at: string
}

const typeMeta: Record<string, { label: string; color: string }> = {
  receita: { label: 'Receita', color: 'bg-magenta/10 text-magenta' },
  exame: { label: 'Exame', color: 'bg-turquesa/10 text-turquesa' },
  atestado: { label: 'Atestado', color: 'bg-azul/10 text-azul' },
  comprovante: { label: 'Comprovante', color: 'bg-verde/10 text-verde' },
  veterinario: { label: 'Veterinário', color: 'bg-dark/8 text-dark/60' },
}

export default function Documentos() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const { query, setQuery, filtered: filteredDocs } = useSearchFilter(documents, (d) => [
    d.title,
    d.pet_name ?? '',
    typeMeta[d.type]?.label ?? '',
  ])

  useEffect(() => {
    api
      .get<{ documents: Document[] }>('/api/documents/mine')
      .then((r) => setDocuments(r.documents))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleOpen = (doc: Document) => {
    void openFile(`/api/documents/mine/${doc.id}/file`).catch(() => alert('Não foi possível abrir o documento.'))
  }

  const handleDownload = (doc: Document) => {
    void downloadFile(`/api/documents/mine/${doc.id}/download`, doc.title).catch(() => alert('Não foi possível baixar o documento.'))
  }

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Receitas, exames, atestados e comprovantes disponibilizados pela clínica."
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileIcon className="h-10 w-10" />}
          title="Nenhum documento disponível"
          description="Quando a clínica disponibilizar um documento, ele aparecerá aqui para você visualizar ou baixar."
        />
      ) : (
        <div>
          <div className="mb-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por documento, pet ou tipo…" />
          </div>

          {filteredDocs.length === 0 ? (
            <EmptyState title="Nenhum documento encontrado" description="Ajuste a busca." />
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => {
                const meta = typeMeta[doc.type] ?? typeMeta.veterinario
                return (
                  <Card key={doc.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${meta.color}`}>
                        <FileIcon className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-display text-base font-black text-dark">{doc.title}</p>
                          <Badge tone="magenta">{meta.label}</Badge>
                        </div>
                        <p className="text-sm text-dark/55">
                          {doc.pet_name ? `${doc.pet_name} · ` : ''}Disponível em {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleOpen(doc)}
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-dark/15 px-5 font-display text-[11px] font-bold uppercase tracking-wider text-dark transition-colors hover:border-turquesa hover:text-turquesa"
                      >
                        <ViewIcon className="h-4 w-4" /> Visualizar
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-5 font-display text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
                      >
                        <DownloadIcon className="h-4 w-4" /> Baixar
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!isPdfHint(documents) && <p className="mt-6 text-xs text-dark/45">Alguns documentos podem abrir direto no navegador, dependendo do formato.</p>}
    </div>
  )
}

function isPdfHint(docs: Document[]): boolean {
  return docs.some((d) => d.mime.includes('pdf'))
}
