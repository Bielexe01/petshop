import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useIsMobile } from '@/hooks/useIsMobile'

/**
 * Fundo WebGL sutil: partículas orgânicas lentas (pontos coloridos com
 * drift) atrás do conteúdo do Hero. Nada de "3D genérico de cachorro".
 *
 * Performance: lazy import de three, dpr ≤ 1.5, powerPreference low-power,
 * pausa quando fora da viewport, desligado em mobile/reduced-motion.
 */
export function WebGLBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const isMobile = useIsMobile()
  const active = !reduced && !isMobile

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let cleanupFn: (() => void) | null = null

    void import('three').then((THREE) => {
      if (disposed || !container) return

      const scene = new THREE.Scene()
      scene.fog = new THREE.Fog(0xffffff, 60, 160)

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300)
      camera.position.z = 46

      const rendererInstance = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'low-power',
      })
      rendererInstance.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      container.appendChild(rendererInstance.domElement)
      rendererInstance.domElement.style.position = 'absolute'
      rendererInstance.domElement.style.inset = '0'
      rendererInstance.domElement.style.width = '100%'
      rendererInstance.domElement.style.height = '100%'

      const palette = ['#E83E8C', '#F45B9A', '#19B7C8', '#299BD6', '#57C978']
      const COUNT = 150
      const positions = new Float32Array(COUNT * 3)
      const colors = new Float32Array(COUNT * 3)
      const c = new THREE.Color()

      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 70
        positions[i * 3 + 1] = (Math.random() - 0.5) * 46
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20
        c.set(palette[i % palette.length])
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      const material = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true,
      })

      const points = new THREE.Points(geo, material)
      scene.add(points)

      const resize = () => {
        const w = container.clientWidth || 1
        const h = container.clientHeight || 1
        rendererInstance.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(container)

      const clock = new THREE.Clock()

      const render = () => {
        const t = clock.getElapsedTime()
        points.rotation.y = Math.sin(t * 0.05) * 0.12
        points.rotation.x = Math.cos(t * 0.04) * 0.06
        points.position.y = Math.sin(t * 0.1) * 1.2
        rendererInstance.render(scene, camera)
      }

      rendererInstance.setAnimationLoop(render)

      const io = new IntersectionObserver(
        (entries) => {
          const visible = entries[0]?.isIntersecting
          rendererInstance.setAnimationLoop(visible ? render : null)
        },
        { rootMargin: '120px' },
      )
      io.observe(container)

      const onVisibility = () => {
        if (document.hidden) {
          rendererInstance.setAnimationLoop(null)
        } else {
          rendererInstance.setAnimationLoop(render)
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      cleanupFn = () => {
        document.removeEventListener('visibilitychange', onVisibility)
        io.disconnect()
        ro.disconnect()
        rendererInstance.setAnimationLoop(null)
        rendererInstance.dispose()
        geo.dispose()
        material.dispose()
        if (rendererInstance.domElement.parentNode === container) {
          container.removeChild(rendererInstance.domElement)
        }
      }
    })

    return () => {
      disposed = true
      cleanupFn?.()
      cleanupFn = null
    }
  }, [active])

  if (!active) return null

  return <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
}
