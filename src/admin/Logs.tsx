import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDateFull } from '@/lib/clinic'
import { PageHeader, Card, Badge, Table, Th, Td, SearchInput, EmptyState, Modal, Divider } from '@/admin/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { auditActionLabel, auditTone } from '@/lib/audit'

interface Log {
  id: number
  admin_name: string | null
  action: string
  target_type: string
  target_id: number | null
  details: string | null
  created_at: string
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)
  const [detail, setDetail] = useState<Log | null>(null)
  const { query, setQuery, filtered: filteredLogs } = useSearchFilter(logs, (l) => [
    l.admin_name ?? '',
    auditActionLabel(l.action),
    l.target_type ?? '',
    l.details ?? '',
    String(l.target_id ?? ''),
  ])

  const load = (l: number) => {
    api
      .get<{ logs: Log[] }>(`/api/audit?limit=${l}`)
      .then((r) => setLogs(r.logs))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  return (
    <div>
      <PageHeader
        title="Auditoria"
        subtitle="Registro de todas as ações administrativas."
        action={
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-11 rounded-xl border border-dark/15 bg-white px-4 text-sm text-dark outline-none focus:border-turquesa"
            aria-label="Quantidade de registros"
          >
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={300}>Últimos 300</option>
            <option value={500}>Últimos 500</option>
          </select>
        }
      />

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por administrador, ação, alvo ou detalhes…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : logs.length === 0 ? (
        <EmptyState title="Nenhum registro de auditoria" description="As ações administrativas aparecerão aqui." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState title="Nenhum registro encontrado" description="Ajuste a busca." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Quando</Th>
                <Th>Administrador</Th>
                <Th>Ação</Th>
                <Th>Alvo</Th>
                <Th>Detalhes</Th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-cream/60">
                  <Td className="whitespace-nowrap">{formatDateFull(log.created_at)}</Td>
                  <Td>
                    <p className="font-semibold text-dark">{log.admin_name ?? '—'}</p>
                  </Td>
                  <Td>
                    <Badge tone={auditTone(log.action)}>{auditActionLabel(log.action)}</Badge>
                  </Td>
                  <Td className="capitalize">{log.target_type}{log.target_id ? ` #${log.target_id}` : ''}</Td>
                  <Td className="max-w-[260px] truncate">
                    <button type="button" onClick={() => setDetail(log)} className="block w-full truncate text-left text-dark/70 hover:text-magenta">{log.details ?? '—'}</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {detail && (
        <Modal onClose={() => setDetail(null)} label="Detalhes do registro de auditoria">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl font-black text-dark">{auditActionLabel(detail.action)}</h2>
              <p className="mt-0.5 text-xs text-dark/45">{formatDateFull(detail.created_at)}</p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge tone={auditTone(detail.action)}>{auditActionLabel(detail.action)}</Badge>
            {detail.admin_name && <Badge tone="gray">{detail.admin_name}</Badge>}
          </div>

          <Divider className="mb-5" />
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-dark/45">Alvo</dt>
              <dd className="mt-0.5 capitalize font-medium text-dark">{detail.target_type}{detail.target_id ? ` #${detail.target_id}` : ''}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-dark/45">Detalhes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-dark/75">{detail.details ?? '—'}</dd>
            </div>
          </dl>
        </Modal>
      )}
    </div>
  )
}
