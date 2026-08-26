import { PawIcon } from '@/components/ui/icons'

/** Loader de página inteira — usado nos Suspense e guards. */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-4">
        <PawIcon className="h-10 w-10 animate-float text-magenta" />
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-dark/50">
          Carregando
        </p>
      </div>
    </div>
  )
}
