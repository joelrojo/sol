import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const POS_POINTS = [
  new THREE.Vector3(2, 26, 48),
  new THREE.Vector3(4, 20, 28),
  new THREE.Vector3(1, 14, 10),
  new THREE.Vector3(-5, 9, -4),
  new THREE.Vector3(-3, 7.2, -18),
  new THREE.Vector3(1, 6.4, -28),
]

const LOOK_POINTS = [
  new THREE.Vector3(-8, 7, -18),
  new THREE.Vector3(-6, 5.5, -28),
  new THREE.Vector3(2, 4, -36),
  new THREE.Vector3(8, 3.5, -42),
  new THREE.Vector3(10, 3.2, -48),
  new THREE.Vector3(12, 3, -52),
]

function CameraRig({ progressRef }) {
  const pos = useMemo(() => new THREE.CatmullRomCurve3(POS_POINTS, false, 'catmullrom', 0.35), [])
  const look = useMemo(() => new THREE.CatmullRomCurve3(LOOK_POINTS, false, 'catmullrom', 0.35), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const t = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    const u = THREE.MathUtils.clamp(progressRef.current, 0, 1)
    pos.getPointAt(u, p)
    look.getPointAt(u, t)
    camera.position.lerp(p, 0.08)
    camera.lookAt(t)
  })
  return null
}

function Terrain() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSun: { value: new THREE.Vector3(-22, 8, -48) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          varying vec3 vNorm;
          varying float vH;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }
          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 5; i++) {
              v += a * noise(p);
              p *= 2.03;
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec3 pos = position;
            float ridge = 18.0 * exp(-pow((pos.x + 6.0) * 0.035, 2.0)) * smoothstep(-10.0, 40.0, -pos.y);
            float hills = fbm(pos.xy * 0.028) * 9.0;
            float detail = fbm(pos.xy * 0.11) * 1.6;
            float canyon = -3.4 * exp(-pow((pos.x - 4.0) * 0.08, 2.0));
            pos.z = ridge + hills + detail + canyon - 4.0;
            vH = pos.z;
            vPos = pos;
            vNorm = normalize(normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vPos;
          varying float vH;
          uniform vec3 uSun;

          void main() {
            vec3 obsidian = vec3(0.11, 0.11, 0.10);
            vec3 dust = vec3(0.64, 0.58, 0.51);
            vec3 agave = vec3(0.35, 0.38, 0.29);
            vec3 apricot = vec3(0.84, 0.55, 0.36);
            float t = smoothstep(-2.0, 12.0, vH);
            vec3 col = mix(obsidian, dust, t);
            col = mix(col, agave, smoothstep(2.0, 8.0, vH) * 0.22);
            vec3 L = normalize(uSun - vPos);
            float d = clamp(dot(normalize(vec3(-0.15, 0.85, 0.5)), L), 0.0, 1.0);
            col += apricot * d * 0.18;
            float haze = smoothstep(20.0, 90.0, length(vPos.xy));
            col = mix(col, vec3(0.20, 0.16, 0.14), haze * 0.55);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={material}>
      <planeGeometry args={[180, 180, 160, 160]} />
    </mesh>
  )
}

function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uSunDir: { value: new THREE.Vector3(-0.45, 0.18, -0.87).normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          uniform vec3 uSunDir;
          void main() {
            float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 top = vec3(0.11, 0.12, 0.14);
            vec3 mid = vec3(0.21, 0.18, 0.20);
            vec3 hor = vec3(0.84, 0.55, 0.36);
            vec3 col = mix(hor, mid, smoothstep(0.42, 0.62, h));
            col = mix(col, top, smoothstep(0.58, 0.92, h));
            float sun = pow(max(dot(normalize(vDir), uSunDir), 0.0), 80.0);
            col += vec3(1.0, 0.78, 0.42) * sun * 1.4;
            float glow = pow(max(dot(normalize(vDir), uSunDir), 0.0), 6.0);
            col += vec3(0.84, 0.55, 0.36) * glow * 0.35;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  )

  return (
    <mesh material={material}>
      <sphereGeometry args={[110, 32, 24]} />
    </mesh>
  )
}

function Sun() {
  return (
    <group position={[-22, 8, -48]}>
      <mesh>
        <sphereGeometry args={[2.1, 24, 24]} />
        <meshBasicMaterial color="#f0c27a" />
      </mesh>
      <pointLight color="#d58c5b" intensity={40} distance={90} decay={1.6} />
    </group>
  )
}

function PathLine() {
  const geometry = useMemo(() => {
    const pts = [
      new THREE.Vector3(8, 0.35, 22),
      new THREE.Vector3(3, 0.5, 10),
      new THREE.Vector3(-2, 0.7, 2),
      new THREE.Vector3(-6, 0.9, -6),
      new THREE.Vector3(-1, 1.1, -14),
      new THREE.Vector3(3, 1.2, -22),
    ]
    const curve = new THREE.CatmullRomCurve3(pts)
    return new THREE.TubeGeometry(curve, 80, 0.07, 6, false)
  }, [])

  return (
    <mesh geometry={geometry} position={[0, 4.2, 0]}>
      <meshBasicMaterial color="#c89550" transparent opacity={0.42} />
    </mesh>
  )
}

function Agave() {
  const clusters = useMemo(
    () => [
      [5.5, 4.8, 6],
      [-8, 5.6, 1],
      [7.2, 4.5, -9],
    ],
    [],
  )
  return (
    <group>
      {clusters.map((c, i) => (
        <group key={i} position={c}>
          {Array.from({ length: 7 }, (_, k) => (
            <mesh
              key={k}
              rotation={[0.9, (k / 7) * Math.PI * 2, 0.15]}
              position={[0, 0.15, 0]}
            >
              <coneGeometry args={[0.08, 1.15, 5]} />
              <meshStandardMaterial color="#59604a" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export default function World({ progressRef }) {
  const group = useRef()

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.01
  })

  return (
    <group ref={group}>
      <ambientLight intensity={0.22} color="#c9b8a0" />
      <directionalLight position={[-20, 18, -10]} intensity={0.55} color="#e8c9a0" />
      <Sky />
      <Sun />
      <Terrain />
      <PathLine />
      <Agave />
      <CameraRig progressRef={progressRef} />
    </group>
  )
}
