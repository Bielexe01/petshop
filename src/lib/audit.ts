/** Rótulos humanos para ações de auditoria — fonte única (Logs e Dashboard). */
export const ACTION_LABEL: Record<string, string> = {
  criar_cliente: 'Criou cliente',
  editar_cliente: 'Editou cliente',
  remover_cliente: 'Removeu cliente',
  criar_pet: 'Criou pet',
  editar_pet: 'Editou pet',
  remover_pet: 'Removeu pet',
  criar_consulta: 'Criou consulta',
  editar_consulta: 'Editou consulta',
  remover_consulta: 'Removeu consulta',
  criar_receita: 'Criou receita',
  editar_receita: 'Editou receita',
  remover_receita: 'Removeu receita',
  criar_exame: 'Criou exame',
  editar_exame: 'Editou exame',
  remover_exame: 'Removeu exame',
  criar_vacina: 'Criou vacina',
  editar_vacina: 'Editou vacina',
  remover_vacina: 'Removeu vacina',
  criar_documento: 'Enviou documento',
  editar_documento: 'Editou documento',
  remover_documento: 'Removeu documento',
  visualizar_documento: 'Visualizou documento',
  criar_notificacao: 'Criou notificação',
  criar_admin: 'Criou administrador',
  editar_admin: 'Editou administrador',
  remover_admin: 'Removeu administrador',
  criar_registro: 'Criou registro médico',
  remover_registro: 'Removeu registro médico',
  editar_foto: 'Atualizou foto do site',
  remover_foto: 'Removeu foto do site',
}

export function auditActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action
}

/** Cor do badge por tipo de ação (Logs). */
export function auditTone(action: string): 'magenta' | 'turquesa' | 'blue' | 'green' | 'red' {
  if (action.startsWith('remover')) return 'red'
  if (action.startsWith('criar')) return 'green'
  if (action.startsWith('editar')) return 'blue'
  if (action.startsWith('visualizar')) return 'turquesa'
  return 'magenta'
}
