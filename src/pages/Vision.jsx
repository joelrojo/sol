import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import World from '../scene/World.jsx'

gsap.registerPlugin(ScrollTrigger)

const BEATS = [
  { id: 'name', start: 0.14, end: 0.3, title: 'VALLE DEL SOL' },
  {
    id: 'meaning',
    start: 0.32,
    end: 0.48,
    title: 'Valley of the Sun',
    sub: 'Sofía · Olivia · Lucía',
  },
  {
    id: 'mountain',
    start: 0.52,
    end: 0.7,
    line: 'A wild mountain in Los Angeles.',
  },
  {
    id: 'thesis',
    start: 0.76,
    end: 1.01,
    line: 'The mountain is the marketing.',
  },
]

export default function Vision() {
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: '.vision-scroll',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.65,
      onUpdate: (self) => {
        progressRef.current = self.progress
        setProgress(self.progress)
      },
    })
    return () => trigger.kill()
  }, [])

  return (
    <main className="vision-root">
      <Link className="vision-home" to="/">
        valle
      </Link>
      <div className="vision-stage">
        <Canvas
          dpr={[1, 1.75]}
          camera={{ fov: 42, near: 0.1, far: 220, position: [0, 28, 42] }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#1c1c1a']} />
          <fog attach="fog" args={['#1c1916', 18, 95]} />
          <World progressRef={progressRef} />
        </Canvas>
      </div>
      <div className="vision-scroll" aria-hidden="true" />
      <div className="captions">
        {BEATS.map((beat) => {
          const on = progress >= beat.start && progress < beat.end
          return (
            <div key={beat.id} className={`caption${on ? ' is-on' : ''}`}>
              {beat.title ? <h1>{beat.title}</h1> : <p>{beat.line}</p>}
              {beat.sub ? <span className="sub">{beat.sub}</span> : null}
            </div>
          )
        })}
      </div>
    </main>
  )
}
