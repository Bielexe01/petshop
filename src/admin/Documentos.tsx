import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { api, openFile } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, Badge, Table, Th, Td, RowAction, SearchInput, EmptyState } from '@/admin/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { ViewIcon } from '@/portal/icons'

interface Document {
  id: number
  title: string
  type: string
  pet_id: number | null
  client_id: number | null
  pet_name: string | null
  client_name: string | null
  file_name: string
  mime: string
  is_available: number
  created_at: string
}

interface PetOption {
  id: number
  name: string
  owner_name: string | null
}

interface ClientOption {
  id: number
  full_name: string | null
  email: string
}

const typeMeta: Record<string, { label: string; tone: 'magenta' | 'turquesa' | 'azul' | 'verde' | 'gray' }> = {
  receita: { label: 'Receita', tone: 'magenta' },
  exame: { label: 'Exame', tone: 'turquesa' },
  atestado: { label: 'Atestado', tone: 'azul' },
  comprovante: { label: 'Comprovante', tone: 'verde' },
  veterinario: { label: 'Veterinário', tone: 'gray' },
}

const EMPTY_FORM = { title: '', type: 'veterinario', clientId: '', petId: '', isAvailable: true }

const MAX_SIZE = 10 * 1024 * 1024

export default function Documentos() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [pets, setPets] = useState<PetOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fileName, setFileName] = useState('')
  const [data, setData] = useState('')
  const [mime, setMime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { query, setQuery, filtered: filteredDocs } = useSearchFilter(documents, (d) => [d.title, d.pet_name ?? '', d.file_name, typeMeta[d.type]?.label ?? ''])

  const load = () => {
    api.get<{ documents: Document[] }>('/api/documents').then((r) => setDocuments(r.documents)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    void Promise.all([
      api.get<{ clients: ClientOption[] }>('/api/clients'),
      api.get<{ pets: PetOption[] }>('/api/pets'),
    ]).then(([c, p]) => {
      setClients(c.clients)
      setPets(p.pets)
    }).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE) {
      setError('O arquivo deve ter no máximo 10 MB.')
      setData('')
      setFileName('')
      return
    }
    setFileName(file.name)
    setMime(file.type || 'application/pdf')
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      setData(base64)
      setError('')
    }
    reader.onerror = () => {
      setError('Não foi possível ler o arquivo.')
      setData('')
    }
    reader.readAsDataURL(file)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!data) {
      setError('Selecione um arquivo.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/documents', {
        title: form.title,
        type: form.type,
        clientId: form.clientId ? Number(form.clientId) : null,
        petId: form.petId ? Number(form.petId) : null,
        isAvailable: form.isAvailable,
        fileName,
        mime,
        data,
      })
      setForm(EMPTY_FORM)
      setFileName('')
      setData('')
      setMime('')
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o documento.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async (d: Document) => {
    await api.put(`/api/documents/${d.id}`, {
      title: d.title,
      type: d.type,
      clientId: d.client_id ?? null,
      petId: d.pet_id ?? null,
      isAvailable: d.is_available === 0,
    }).catch(() => {})
    load()
  }

  const remove = async (d: Document) => {
    if (!window.confirm(`Remover o documento "${d.title}"?`)) return
    await api.del(`/api/documents/${d.id}`).catch(() => {})
    load()
  }

  const view = (d: Document) => void openFile(`/api/documents/admin/${d.id}/file`).catch(() => alert('Não foi possível abrir o documento.'))

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Envie documentos e controle a disponibilidade para o cliente."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Enviar documento'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Enviar documento</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <FormInput label="Título *" required value={form.title} onChange={set('title')} placeholder="Ex.: Hemograma completo — Thor" className="sm:col-span-2" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="type" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Tipo</label>
              <select id="type" value={form.type} onChange={set('type')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="receita">Receita</option>
                <option value="exame">Exame</option>
                <option value="atestado">Atestado</option>
                <option value="comprovante">Comprovante</option>
                <option value="veterinario">Veterinário</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Cliente</label>
              <select id="client" value={form.clientId} onChange={set('clientId')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="">Sem vínculo de cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name ?? 'Sem nome'} · {c.email}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pet" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Pet</label>
              <select id="pet" value={form.petId} onChange={set('petId')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="">Sem vínculo de pet</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.owner_name ? ` · ${p.owner_name}` : ''}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-turquesa hover:text-azul">
                <span className="grid h-12 w-full items-center rounded-xl border border-dashed border-turquesa/50 px-4">
                  {fileName || 'Selecionar arquivo…'}
                </span>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={onFile} className="sr-only" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-dark/70">
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} className="h-4 w-4 accent-magenta" />
              Disponível para o cliente
            </label>
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Enviando…' : 'Enviar documento'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por documento, pet ou tipo…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : documents.length === 0 ? (
        <EmptyState title="Nenhum documento enviado" description="Envie o primeiro documento." />
      ) : filteredDocs.length === 0 ? (
        <EmptyState title="Nenhum documento encontrado" description="Ajuste a busca." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Documento</Th>
                <Th>Vínculo</Th>
                <Th>Tipo</Th>
                <Th>Enviado</Th>
                <Th>Disponível</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((d) => {
                const meta = typeMeta[d.type] ?? typeMeta.veterinario
                return (
                  <tr key={d.id} className="hover:bg-cream/60">
                    <Td>
                      <p className="font-semibold text-dark">{d.title}</p>
                      <p className="text-xs text-dark/40">{d.file_name}</p>
                    </Td>
                    <Td>
                      {d.pet_name ?? '—'}
                      <p className="text-xs text-dark/40">{d.client_name ?? 'Sem cliente'}</p>
                    </Td>
                    <Td><Badge tone={meta.tone}>{meta.label}</Badge></Td>
                    <Td>{formatDate(d.created_at)}</Td>
                    <Td><Badge tone={d.is_available ? 'green' : 'red'}>{d.is_available ? 'Visível' : 'Oculto'}</Badge></Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1.5">
                        <RowAction tone="ghost" onClick={() => view(d)}><ViewIcon className="h-3.5 w-3.5" /> Ver</RowAction>
                        <RowAction tone="ghost" onClick={() => void toggleAvailable(d)}>{d.is_available ? 'Ocultar' : 'Mostrar'}</RowAction>
                        <RowAction tone="ghost" onClick={() => void remove(d)}>Remover</RowAction>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function FormInput({ label, className, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">{label}</label>
      <input id={id} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none placeholder:text-dark/30 focus:border-turquesa" {...props} />
    </div>
  )
}
