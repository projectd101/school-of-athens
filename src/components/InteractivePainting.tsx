import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { HOTSPOT_COORDS } from '../data/hotspotCoords'
import { supabase, type Hotspot } from '../lib/supabase'

type ActiveState = {
  hotspotId: number
  x: number
  y: number
  videoId: string
} | null

const IMAGE_ASPECT = 1907 / 825

export default function InteractivePainting() {
  const stageRef = useRef<HTMLDivElement>(null)
  const paintingRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const videoWrapRef = useRef<HTMLDivElement>(null)
  const backBtnRef = useRef<HTMLButtonElement>(null)

  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [discovered, setDiscovered] = useState<Set<number>>(new Set())
  const [active, setActive] = useState<ActiveState>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const animatingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('hotspots')
      .select('*')
      .order('id', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load hotspots', error)
          return
        }
        if (data) setHotspots(data as Hotspot[])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getVideoId = useCallback(
    (hotspotId: number): string | null => {
      const row = hotspots.find((h) => h.id === hotspotId)
      if (row && row.video_id && row.video_id.trim().length > 0) {
        return extractYouTubeId(row.video_id.trim())
      }
      return null
    },
    [hotspots]
  )

  const handleClick = (hotspotId: number, x: number, y: number) => {
    if (animatingRef.current) return
    const videoId = getVideoId(hotspotId)
    if (!videoId) {
      return
    }

    animatingRef.current = true
    if (!hasInteracted) setHasInteracted(true)
    setDiscovered((prev) => new Set(prev).add(hotspotId))
    setActive({ hotspotId, x, y, videoId })
  }

  useEffect(() => {
    if (!active) return
    const painting = paintingRef.current
    const videoWrap = videoWrapRef.current
    const backBtn = backBtnRef.current
    if (!painting || !videoWrap) return

    gsap.set(painting, { transformOrigin: `${active.x}% ${active.y}%` })
    gsap.set(videoWrap, { opacity: 0, display: 'flex' })
    if (backBtn) gsap.set(backBtn, { opacity: 0, pointerEvents: 'none' })

    const tl = gsap.timeline({
      onComplete: () => {
        animatingRef.current = false
      },
    })

    tl.to(painting, {
      scale: 6,
      duration: 1.2,
      ease: 'power3.inOut',
    })
    tl.to(
      videoWrap,
      {
        opacity: 1,
        duration: 0.45,
        ease: 'power1.out',
      },
      '-=0.4'
    )
    if (backBtn) {
      tl.to(
        backBtn,
        { opacity: 1, pointerEvents: 'auto', duration: 0.3 },
        '-=0.15'
      )
    }

    return () => {
      tl.kill()
    }
  }, [active])

  const handleBack = () => {
    if (animatingRef.current) return
    const painting = paintingRef.current
    const videoWrap = videoWrapRef.current
    const backBtn = backBtnRef.current
    if (!painting || !videoWrap) return

    animatingRef.current = true
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(videoWrap, { display: 'none' })
        animatingRef.current = false
        setActive(null)
      },
    })

    if (backBtn) {
      tl.to(backBtn, { opacity: 0, pointerEvents: 'none', duration: 0.2 })
    }
    tl.to(videoWrap, { opacity: 0, duration: 0.35, ease: 'power1.in' }, '<')
    tl.to(painting, {
      scale: 1,
      duration: 1,
      ease: 'power3.inOut',
    })
  }

  const handleBtnMouseEnter = () => {
    if (backBtnRef.current) {
      gsap.to(backBtnRef.current, {
        color: '#ffffff',
        x: -2,
        duration: 0.2,
        ease: 'power1.out',
      })
    }
  }

  const handleBtnMouseLeave = () => {
    if (backBtnRef.current) {
      gsap.to(backBtnRef.current, {
        color: 'rgba(255, 255, 255, 0.45)',
        x: 0,
        duration: 0.2,
        ease: 'power1.out',
      })
    }
  }

  return (
    <div
      ref={stageRef}
      className="no-scroll-page"
      style={{
        position: 'relative',
        width: '100vw',
        overflow: 'hidden',
        background: '#080808',
      }}
    >
      {!hasInteracted && (
        <div
          ref={titleRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            textAlign: 'center',
            paddingTop: '4vh',
            pointerEvents: 'none',
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0) 100%)',
            paddingBottom: '6vh',
          }}
        >
          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(28px, 5vw, 64px)',
              letterSpacing: '0.12em',
              color: '#f2f2f2',
              margin: 0,
              fontWeight: 500,
            }}
          >
            THE SCHOOL OF ATHENS
          </h1>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 'clamp(11px, 1.2vw, 14px)',
              letterSpacing: '0.3em',
              color: '#a8a8a8',
              marginTop: '0.75rem',
              textTransform: 'uppercase',
            }}
          >
            Explore the thinkers
          </p>
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div
          ref={paintingRef}
          style={{
            position: 'relative',
            flexShrink: 0,
            aspectRatio: `${IMAGE_ASPECT}`,
            width: `max(100vw, calc(100vh * ${IMAGE_ASPECT}))`,
          }}
        >
          <img
            src="/assets/school-of-athens.png"
            alt="The School of Athens"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            draggable={false}
          />

          {HOTSPOT_COORDS.map((h) => (
            <HotspotDot
              key={h.id}
              x={h.x}
              y={h.y}
              onClick={() => handleClick(h.id, h.x, h.y)}
            />
          ))}
        </div>
      </div>

      <div
        ref={videoWrapRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70vw',
          maxWidth: '1400px',
          aspectRatio: '16 / 9',
          zIndex: 30,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {active && (
          <iframe
            key={active.hotspotId}
            width="100%"
            height="100%"
            src={`https://www.youtube-nocookie.com/embed/${active.videoId}?autoplay=1&rel=0`}
            title="Video"
            allow="accelerate-compute; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ border: 0, display: 'block' }}
          />
        )}
      </div>

      {/* Exact replica of the reference design Back Button */}
      <button
        ref={backBtnRef}
        onClick={handleBack}
        onMouseEnter={handleBtnMouseEnter}
        onMouseLeave={handleBtnMouseLeave}
        style={{
          position: 'absolute',
          top: '32px',
          left: '36px',
          zIndex: 40,
          opacity: 0,
          pointerEvents: 'none',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          color: 'rgba(255, 255, 255, 0.45)',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.22em',
          cursor: 'pointer',
          textTransform: 'uppercase',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          userSelect: 'none',
          transition: 'color 0.2s ease',
        }}
      >
        <span style={{ fontSize: '13px', lineHeight: 1 }}>←</span> BACK
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '24px',
          zIndex: 20,
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: '#8a8a8a',
          letterSpacing: '0.05em',
        }}
      >
        {discovered.size} / {HOTSPOT_COORDS.length}
      </div>
    </div>
  )
}

function HotspotDot({
  x,
  y,
  onClick,
}: {
  x: number
  y: number
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Open tablet"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: '4.5%',
        aspectRatio: '1 / 1',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        zIndex: 10,
        background: hover
          ? 'radial-gradient(circle, rgba(46, 225, 33, 0.45) 0%, rgba(255,60,110,0.12) 55%, rgba(255,60,110,0) 75%)'
          : 'radial-gradient(circle, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 70%)',
        filter: hover ? 'brightness(1.35)' : 'none',
        animation: hover ? 'hotspot-pulse 1.8s ease-in-out infinite' : 'none',
        transition: 'background 300ms ease, filter 300ms ease',
      }}
    />
  )
}

function extractYouTubeId(input: string): string {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  )
  if (urlMatch) return urlMatch[1]
  return trimmed
}