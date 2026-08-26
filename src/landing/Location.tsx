import { useRef, useState } from 'react'
import { CLINIC } from '@/lib/clinic'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { PawIcon } from '@/components/ui/icons'

/**
 * Localização: split (informações + mapa). Botão "COMO CHEGAR" abre o
 * Google Maps. O mapa carrega lazy e só interage após o primeiro clique
 * (pointer-events controlado), evitando roubar o scroll.
 */
export function Location() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [mapActive, setMapActive] = useState(false)

  return (
    <section id="contato" className="relative bg-white py-24 lg:py-32" aria-label="Localização e contato">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionLabel index="05">Onde estamos</SectionLabel>
        <h2 className="mt-5 max-w-2xl font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-dark sm:text-5xl lg:text-6xl">
          Fácil de <span className="text-turquesa">chegar.</span>
        </h2>

        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Informações */}
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <div>
                <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-magenta">Endereço</p>
                <p className="mt-2 text-lg font-semibold text-dark">{CLINIC.fullAddress}</p>
              </div>
              <div>
                <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-magenta">Telefone · WhatsApp</p>
                <a href={`tel:+55${CLINIC.phoneRaw}`} className="mt-2 block text-lg font-semibold text-dark hover:text-magenta">
                  {CLINIC.phone}
                </a>
              </div>
              <div>
                <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-magenta">Atendimento</p>
                <p className="mt-2 text-lg font-semibold text-dark">{CLINIC.opening}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={CLINIC.mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-turquesa px-8 font-display text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:-translate-y-0.5 hover:bg-azul"
              >
                COMO CHEGAR
              </a>
              <a
                href={CLINIC.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border-2 border-magenta px-8 font-display text-sm font-bold uppercase tracking-[0.12em] text-magenta transition-colors hover:bg-magenta hover:text-white"
              >
                FALAR NO WHATSAPP
              </a>
            </div>
          </div>

          {/* Mapa */}
          <div className="relative h-[340px] overflow-hidden rounded-3xl border border-dark/10 shadow-soft lg:h-[440px]">
            <iframe
              ref={iframeRef}
              src={CLINIC.mapsEmbedUrl}
              title="Mapa da clínica no Google Maps"
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              style={{ pointerEvents: mapActive ? 'auto' : 'none' }}
            />
            {!mapActive && (
              <button
                onClick={() => setMapActive(true)}
                className="absolute inset-0 z-10 grid place-items-center bg-cream/30 backdrop-blur-[2px]"
                aria-label="Ativar o mapa interativo"
              >
                <span className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-display text-xs font-black uppercase tracking-[0.18em] text-dark shadow-soft">
                  <PawIcon className="h-4 w-4 text-magenta" />
                  Ativar mapa
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
