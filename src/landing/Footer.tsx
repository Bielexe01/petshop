import { Link } from 'react-router-dom'
import { CLINIC, NAV_ITEMS } from '@/lib/clinic'
import { PawIcon } from '@/components/ui/icons'

/**
 * Rodapé limpo: nome da clínica, tagline, navegação, telefone, endereço.
 * Sem redes sociais (não fornecidas).
 */
export function Footer() {
  return (
    <footer className="bg-dark py-16 text-white">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr]">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-magenta text-white">
                <PawIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-black leading-tight">Clínica Veterinária</p>
                <p className="font-display text-base font-black leading-tight text-magenta">Sua CLinica</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              Cuidado que não espera: atendimento veterinário 24 horas com amor, estrutura e dedicação em Guariba-SP.
            </p>
          </div>

          {/* Navegação */}
          <nav aria-label="Links do rodapé">
            <p className="font-display text-xs font-black uppercase tracking-[0.24em] text-white/40">Navegação</p>
            <ul className="mt-5 space-y-3">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contato */}
          <div>
            <p className="font-display text-xs font-black uppercase tracking-[0.24em] text-white/40">Contato</p>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              <li>
                <a href={`tel:+55${CLINIC.phoneRaw}`} className="transition-colors hover:text-white">
                  {CLINIC.phone}
                </a>
              </li>
              <li>{CLINIC.opening}</li>
              <li className="leading-relaxed">{CLINIC.fullAddress}</li>
            </ul>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 items-center rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-[0.16em] text-white transition-all hover:-translate-y-0.5 hover:bg-rosa"
            >
              Área do Cliente
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Sua CLinica · Guariba-SP</p>
          <p>Feito com <span className="text-magenta">♥</span> para quem cuida de quem ama.</p>
        </div>
      </div>
    </footer>
  )
}
