import type { ReactNode } from 'react'
import { useSession } from '@/lib/session'
import { EmptyState } from '@/admin/ui'

/** Nomes amigáveis das telas (para a mensagem de acesso restrito). */
const LABELS: Record<string, string> = {
  dashboard: 'o Dashboard',
  clientes: 'Clientes',
  pets: 'Pets',
  consultas: 'Consultas',
  receitas: 'Receitas',
  exames: 'Exames',
  vacinas: 'Vacinas',
  documentos: 'Documentos',
  fotos: 'as Fotos do site',
  auditoria: 'a Auditoria',
}

/**
 * Guard de tela (UI-gating). O superadmin sempre passa (a sessão dele traz
 * todas as telas). Para os demais admins, se o papel não incluir `screen`,
 * renderiza um estado de acesso restrito em vez do conteúdo.
 *
 * A autorização real acontece no backend (requireScreen); este guard apenas
 * evita mostrar uma tela que devolveria 403.
 */
export function GuardScreen({ screen, children }: { screen: string; children: ReactNode }) {
  const { user } = useSession()
  if (user?.role === 'admin' && !user.screens?.includes(screen)) {
    return (
      <EmptyState
        title="Acesso restrito"
        description={`Seu papel não inclui a tela ${LABELS[screen] ?? 'desta área'}. Fale com a superadministradora para liberar.`}
      />
    )
  }
  return <>{children}</>
}
