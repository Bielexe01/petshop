import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PawIcon } from '@/components/ui/icons'
import { CLINIC } from '@/lib/clinic'

/**
 * Layout das telas de autenticação: split premium — lado esquerdo com a
 * identidade da clínica (foto), lado direito com o formulário.
 */
export default function AuthLayout({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  return (
    <div className="flex min-h-screen bg-cream">
      {/* Painel visual */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-dark p-10 lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-magenta text-white">
            <PawIcon className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-black text-white">Clínica Veterinária</span>
            <span className="block font-display text-sm font-black text-magenta">Dr.ª Cássia Carvalho</span>
          </span>
        </Link>

        <div>
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-turquesa">
            {admin ? 'Painel administrativo' : CLINIC.opening}
          </p>
          <h2 className="mt-4 max-w-sm font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-white">
            {admin ? 'Gerencie a clínica.' : 'Seu pet no centro do cuidado.'}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            {admin
              ? 'Clientes, pets, consultas, receitas e documentos — tudo em um só lugar, com segurança.'
              : 'Acesse o histórico do seu pet: consultas, vacinas, receitas, exames e documentos.'}
          </p>
        </div>

        <p className="text-xs text-white/40">{CLINIC.fullAddress}</p>
      </div>

      {/* Formulário */}
      <div className="relative flex flex-1 items-center justify-center px-5 py-12">
        {/* Bolha decorativa */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rosa/15 blur-2xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-turquesa/10 blur-2xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-magenta text-white">
                <PawIcon className="h-5 w-5" />
              </span>
              <span className="font-display text-sm font-black text-dark">Dr.ª Cássia Carvalho</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
