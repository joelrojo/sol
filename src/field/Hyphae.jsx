import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2
const GOLD = [200, 149, 80]
const APRICOT = [213, 140, 91]
const BONE = [232, 224, 210]
const DUST = [164, 149, 130]

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function build(w, h, seed) {
  const rand = mulberry32(seed ^ (w * 131 + h))
  const cx = w * 0.5
  const cy = h * 0.5
  const reach = Math.hypot(w, h) * 0.54
  const nodes = []
  const edges = []

  const add = (bx, by, kind, ray) => {
    const i = nodes.length
    nodes.push({
      bx,
      by,
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      ph: rand() * TAU,
      sp: 0.35 + rand() * 0.85,
      kind,
      ray,
    })
    return i
  }

  const link = (i, j, kind) => {
    if (i === j) return
    edges.push({
      i,
      j,
      kind,
      bow: (rand() - 0.5) * (kind === 'ray' ? 0.07 : 0.42),
    })
  }

  const rayCount = w < 700 ? 12 : 16
  for (let r = 0; r < rayCount; r++) {
    const a = (r / rayCount) * TAU + (rand() - 0.5) * 0.1
    const segs = 6 + ((rand() * 3) | 0)
    let prev = -1
    const chain = []
    for (let s = 1; s <= segs; s++) {
      const t = s / segs
      const rad = reach * (0.1 + t * 0.9) * (0.86 + rand() * 0.2)
      const i = add(
        cx + Math.cos(a) * rad,
        cy + Math.sin(a) * rad,
        s === segs ? 'tip' : s < 2 ? 'hub' : 'via',
        r,
      )
      chain.push(i)
      if (prev >= 0) link(prev, i, 'ray')
      prev = i
    }

    for (const i of chain) {
      if (rand() > 0.55) continue
      const n = nodes[i]
      const sign = rand() < 0.5 ? 1 : -1
      let ba = a + sign * (0.32 + rand() * 0.75)
      let px = n.bx
      let py = n.by
      let p = i
      const hops = 2 + ((rand() * 3) | 0)
      for (let hop = 0; hop < hops; hop++) {
        ba += (rand() - 0.5) * 0.45
        const d = 26 + rand() * 52
        px = Math.min(w - 10, Math.max(10, px + Math.cos(ba) * d))
        py = Math.min(h - 10, Math.max(10, py + Math.sin(ba) * d))
        const j = add(px, py, 'hypha', r)
        link(p, j, 'hypha')
        p = j
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    if (rand() > 0.28) continue
    let best = -1
    let bestD = 78
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].ray === nodes[j].ray) continue
      const d = Math.hypot(nodes[i].bx - nodes[j].bx, nodes[i].by - nodes[j].by)
      if (d < bestD && d > 20) {
        bestD = d
        best = j
      }
    }
    if (best >= 0) link(i, best, 'hypha')
  }

  return { nodes, edges, cx, cy }
}

function edgePoint(a, b, k, bow) {
  const mx = a.x + (b.x - a.x) * k
  const my = a.y + (b.y - a.y) * k
  const nx = -(b.y - a.y)
  const ny = b.x - a.x
  const s = bow * 4 * k * (1 - k)
  return [mx + nx * s, my + ny * s]
}

export default function Hyphae() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, inside: false }
    const pulses = []
    let graph = null
    let w = 0
    let h = 0
    let raf = 0
    let last = performance.now()
    let t = 0
    let alive = true

    const resize = () => {
      const next = canvas.parentElement
      if (!next) return
      w = next.clientWidth
      h = next.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      graph = build(w, h, 0x51a7)
      pulses.length = 0
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      pointer.vx = x - pointer.tx
      pointer.vy = y - pointer.ty
      pointer.tx = x
      pointer.ty = y
      pointer.inside = true
    }

    const onLeave = () => {
      pointer.inside = false
      pointer.vx = 0
      pointer.vy = 0
    }

    const draw = (now) => {
      if (!alive || !graph) return
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      t += dt
      const { nodes, edges, cx, cy } = graph
      const breath = 0.5 + 0.5 * Math.sin(t * 0.55)

      pointer.x += (pointer.tx - pointer.x) * 0.18
      pointer.y += (pointer.ty - pointer.y) * 0.18
      pointer.vx *= 0.9
      pointer.vy *= 0.9

      ctx.clearRect(0, 0, w, h)

      const corona = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.min(w, h) * 0.48)
      corona.addColorStop(0, rgba(APRICOT, 0.16 + breath * 0.1))
      corona.addColorStop(0.34, rgba(GOLD, 0.07 + breath * 0.05))
      corona.addColorStop(1, rgba(GOLD, 0))
      ctx.fillStyle = corona
      ctx.fillRect(0, 0, w, h)

      if (!reduced) {
        for (const n of nodes) {
          const drift = 1.8
          let fx = n.bx + Math.sin(t * 0.22 * n.sp + n.ph) * drift - n.x
          let fy = n.by + Math.cos(t * 0.18 * n.sp + n.ph) * drift - n.y

          if (pointer.inside) {
            const dx = n.x - pointer.x
            const dy = n.y - pointer.y
            const d2 = dx * dx + dy * dy
            const r = 150
            if (d2 < r * r) {
              const d = Math.sqrt(d2) + 0.001
              const q = 1 - d / r
              const g = q * q
              fx += (dx / d) * g * 38 + pointer.vx * g * 0.55
              fy += (dy / d) * g * 38 + pointer.vy * g * 0.55
            }
          }

          n.vx = n.vx * 0.84 + fx * 0.12
          n.vy = n.vy * 0.84 + fy * 0.12
          n.x += n.vx
          n.y += n.vy
        }
      }

      for (const e of edges) {
        const a = nodes[e.i]
        const b = nodes[e.j]
        const ray = e.kind === 'ray'
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const nx = -(b.y - a.y)
        const ny = b.x - a.x
        const draw = (alpha, width) => {
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.quadraticCurveTo(mx + nx * e.bow, my + ny * e.bow, b.x, b.y)
          ctx.strokeStyle = rgba(ray ? GOLD : DUST, alpha)
          ctx.lineWidth = width
          ctx.stroke()
        }
        if (ray) draw(0.06 + breath * 0.04, 5.2)
        draw(ray ? 0.3 + breath * 0.12 : 0.2, ray ? 1.15 : 0.85)
      }

      if (!reduced) {
        if (pulses.length < 28 && Math.random() < dt * 5.2) {
          const rays = edges.filter((e) => e.kind === 'ray')
          const pool = rays.length && Math.random() < 0.7 ? rays : edges
          if (pool.length) {
            const e = pool[(Math.random() * pool.length) | 0]
            const a = nodes[e.i]
            const b = nodes[e.j]
            const outward = Math.hypot(b.bx - cx, b.by - cy) > Math.hypot(a.bx - cx, a.by - cy)
            pulses.push({
              e,
              k: 0,
              dir: outward ? 1 : 0,
              dur: 0.7 + Math.random() * 0.9,
            })
          }
        }

        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i]
          p.k += dt / p.dur
          if (p.k >= 1) {
            pulses.splice(i, 1)
            continue
          }
          const a = nodes[p.e.i]
          const b = nodes[p.e.j]
          const u = p.dir ? p.k : 1 - p.k
          const [x, y] = edgePoint(a, b, u, p.e.bow)
          const fade = Math.sin(p.k * Math.PI)
          ctx.fillStyle = rgba(GOLD, 0.72 * fade)
          ctx.beginPath()
          ctx.arc(x, y, 1.7, 0, TAU)
          ctx.fill()
          ctx.fillStyle = rgba(APRICOT, 0.16 * fade)
          ctx.beginPath()
          ctx.arc(x, y, 8.4, 0, TAU)
          ctx.fill()
        }
      }

      for (const n of nodes) {
        const hub = n.kind === 'hub'
        const a = hub ? 0.48 + breath * 0.14 : n.kind === 'hypha' ? 0.22 : 0.3
        ctx.fillStyle = rgba(hub ? GOLD : BONE, a)
        const r = hub ? 1.7 : 0.85
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, TAU)
        ctx.fill()
      }
    }

    const tick = (now) => {
      draw(now)
      if (!reduced) raf = requestAnimationFrame(tick)
    }

    resize()
    draw(performance.now())
    if (!reduced) raf = requestAnimationFrame(tick)

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else if (!reduced && alive) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas className="splash-field" ref={ref} aria-hidden="true" />
}
