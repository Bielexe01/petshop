import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, EmptyState } from '@/portal/ui'
import { PawIcon } from '@/components/ui/icons'
import { PetAvatar } from '@/components/ui/PetAvatar'
import { PetPhotoPicker } from '@/components/ui/PetPhotoPicker'
import { PlusIcon, ChevronRightIcon, XIcon } from '@/portal/icons'
import { Field } from '@/auth/fields'

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
  consultas: number
}

interface PetForm {
  name: string
  species: string
  breed: string
  sex: string
  birthDate: string
  weightKg: string
  microchip: string
  notes: string
}

const EMPTY_FORM: PetForm = { name: '', species: 'cachorro', breed: '', sex: 'nao-informado', birthDate: '', weightKg: '', microchip: '', notes: '' }

const speciesLabel: Record<string, string> = { cachorro: 'Cachorro', gato: 'Gato', outros: 'Outro' }

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

export default function PetsList() {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PetForm>(EMPTY_FORM)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = () => {
    api.get<{ pets: Pet[] }>('/api/pets/mine').then((r) => setPets(r.pets)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const set = (k: keyof PetForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const r = await api.post<{ pet: { id: number } }>('/api/pets', {
        name: form.name,
        species: form.species,
        breed: form.breed || null,
        sex: form.sex,
        birthDate: form.birthDate || null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        microchip: form.microchip || null,
        notes: form.notes || null,
      })
      // Foto escolhida antes de criar → envia agora que o pet existe
      if (pendingPhoto) {
        const dataUrl = await readAsDataURL(pendingPhoto)
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
        await api
          .post(`/api/pets/mine/${r.pet.id}/photo`, { mime: pendingPhoto.type, data: base64 })
          .catch(() => {})
      }
      setForm(EMPTY_FORM)
      setPendingPhoto(null)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o pet.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Meus Pets"
        subtitle="Cadastre e acompanhe o histórico médico dos seus pets."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? <XIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Novo pet'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-8">
          <p className="mb-4 font-display text-base font-black text-dark">Cadastrar novo pet</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2">
              <PetPhotoPicker petId={0} photoUrl={null} onUploaded={() => {}} onPendingFile={setPendingPhoto} />
            </div>
            <Field label="Nome do pet" name="name" required value={form.name} onChange={set('name')} placeholder="Ex.: Thor" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="species" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Espécie</label>
              <select
                id="species"
                value={form.species}
                onChange={set('species')}
                className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa"
              >
                <option value="cachorro">Cachorro</option>
                <option value="gato">Gato</option>
                <option value="outros">Outro</option>
              </select>
            </div>
            <Field label="Raça" name="breed" value={form.breed} onChange={set('breed')} placeholder="Ex.: Golden Retriever" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sex" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Sexo</label>
              <select id="sex" value={form.sex} onChange={set('sex')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="macho">Macho</option>
                <option value="femea">Fêmea</option>
                <option value="nao-informado">Não informado</option>
              </select>
            </div>
            <Field label="Data de nascimento" name="birthDate" type="date" value={form.birthDate} onChange={set('birthDate')} />
            <Field label="Peso (kg)" name="weightKg" type="number" min="0" step="0.1" value={form.weightKg} onChange={set('weightKg')} placeholder="Ex.: 25.5" />
            <Field label="Microchip" name="microchip" value={form.microchip} onChange={set('microchip')} placeholder="Opcional" className="sm:col-span-2" />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="notes" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Observações</label>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={set('notes')}
                placeholder="Alergias, temperamento, particularidades…"
                className="w-full rounded-xl border border-dark/15 bg-white px-4 py-3 text-[15px] text-dark outline-none focus:border-turquesa"
              />
            </div>
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="h-12 w-full rounded-full bg-turquesa font-display text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-azul disabled:opacity-60 sm:w-auto sm:px-10"
              >
                {saving ? 'Salvando…' : 'Salvar pet'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <EmptyState
          icon={<PawIcon className="h-10 w-10" />}
          title="Nenhum pet cadastrado"
          description="Cadastre seu primeiro pet para começar a acompanhar consultas, vacinas e documentos."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white"
            >
              <PlusIcon className="h-4 w-4" /> Cadastrar pet
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              to={`/dashboard/pets/${pet.id}`}
              className="group rounded-2xl border border-dark/8 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-magenta/40 hover:shadow-glow"
            >
              <div className="flex items-center gap-3">
                <PetAvatar petId={pet.id} photoUrl={pet.photo_url} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-black text-dark">{pet.name}</p>
                  <p className="truncate text-xs text-dark/55">
                    {speciesLabel[pet.species] ?? pet.species}
                    {pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-dark/30 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dark/8 pt-3 text-xs text-dark/55">
                <span>{pet.consultas} consulta{pet.consultas === 1 ? '' : 's'}</span>
                {pet.birth_date && <span>{formatDate(pet.birth_date)}</span>}
                {pet.weight_kg != null && <span>{pet.weight_kg} kg</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <button onClick={() => navigate('/dashboard')} className="text-xs font-semibold text-turquesa hover:text-azul">
          ← Voltar à visão geral
        </button>
      </div>
    </div>
  )
}
