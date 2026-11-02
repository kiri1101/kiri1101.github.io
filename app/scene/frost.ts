import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from "three";
import type { Rgb } from "~/site.config";
import type { Tier } from "./types";

/**
 * Overdraw budget: big soft sprites are paid per pixel, every frame. This is the prototype's "light"
 * setting (about 5x fewer pixels painted than its first version): 2 400 particles at 20–60 px.
 */
const COUNT = { wide: 2400, small: 1100, tier1: 1200 };
const MIST = { min: 20, max: 60, alpha: 0.3 };
/** Sizes are tuned at the hero camera distance. */
const REF_DIST = { wide: 9.4, small: 13.5 };

// Shaders verbatim from the approved prototype.
const vertexShader = `
    uniform float uMorph, uCollapse, uTime, uPR, uOpacity, uRef, uMistMin, uMistMax;
    attribute vec3 aSphere; attribute vec3 aMono; attribute vec3 aRing; attribute vec3 aDir; attribute vec4 aSeed;
    varying float vAlpha; varying float vMist; varying float vTw;
    void main() {
      float t1 = smoothstep(0.0, 1.0, clamp(uMorph, 0.0, 1.0)), t2 = smoothstep(0.0, 1.0, clamp(uMorph - 1.0, 0.0, 1.0));
      vec3 base = mix(mix(aSphere, aMono, t1), aRing, t2);                 // a point on the current surface
      float life = fract(uTime * aSeed.y + aSeed.x);                        // each particle loops every 8-20 s
      vec3 dir = normalize(normalize(base + 1e-4) * 0.75 + aDir * 0.55 + vec3(0.0, 0.28, 0.0));
      vec3 swirl = 0.14 * life * vec3(sin(uTime * 0.6 + aSeed.x * 30.0), cos(uTime * 0.5 + aSeed.x * 21.0), sin(uTime * 0.4 + aSeed.x * 17.0));
      vec3 p = base + dir * pow(life, 0.75) * aSeed.w + swirl;
      float c = uCollapse * uCollapse * (3.0 - 2.0 * uCollapse);
      p *= 1.0 - c;                                                         // sucked into the singularity
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      vMist = step(0.3, aSeed.z);                                           // 70% soft mist, 30% ice glints
      vTw = 0.55 + 0.45 * sin(uTime * 3.0 + aSeed.x * 50.0);
      vAlpha = smoothstep(0.04, 0.26, life) * (1.0 - smoothstep(0.4, 1.0, life)) * uOpacity;   // visible once it has left the surface
      float px = mix(3.2 + 2.0 * vTw, mix(uMistMin, uMistMax, life), vMist);  // mist puffs expand as they drift
      gl_PointSize = px * uPR * (uRef / -mv.z);
    }`;

const fragmentShader = `
    uniform vec3 uFrost; uniform float uMistAlpha;
    varying float vAlpha; varying float vMist; varying float vTw;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float aMist = pow(smoothstep(0.5, 0.0, d), 2.0) * uMistAlpha;
      float aIce = smoothstep(0.5, 0.1, d) * vTw;
      float a = mix(aIce, aMist, vMist) * vAlpha;
      vec3 ice = uFrost * 0.86;                         // tinted so glints read against the light studio
      vec3 col = mix(ice, mix(vec3(1.0), uFrost, 0.62), vMist);
      gl_FragColor = vec4(col, a);
    }`;

/**
 * Frost aura: vapour and ice glints born on the body's surface, drifting out and lingering.
 * Each particle borrows a random surface point of the body, in all three shapes.
 */
export function createFrost(o: {
  sph: Float32Array;
  mono: Float32Array;
  ring: Float32Array;
  small: boolean;
  pr: number;
  /** Only body points at least this far from the centre count as surface. */
  surface: number;
}) {
  const bodyCount = o.sph.length / 3;
  const n = o.small ? COUNT.small : COUNT.wide;
  const rand = Math.random;
  const fs = new Float32Array(n * 3);
  const fm = new Float32Array(n * 3);
  const fr = new Float32Array(n * 3);
  const dir = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  const { sph, mono, ring } = o;
  for (let j = 0; j < n; j++) {
    let k = (rand() * bodyCount) | 0;
    while (Math.hypot(sph[k * 3], sph[k * 3 + 1], sph[k * 3 + 2]) < o.surface) k = (rand() * bodyCount) | 0; // only true surface points
    for (let a = 0; a < 3; a++) {
      fs[j * 3 + a] = sph[k * 3 + a];
      fm[j * 3 + a] = mono[k * 3 + a];
      fr[j * 3 + a] = ring[k * 3 + a];
    }
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    dir.set([s * Math.cos(th), u, s * Math.sin(th)], j * 3);
    seed.set([rand(), 0.05 + rand() * 0.075, rand(), 0.45 + rand() * 1.25], j * 4);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(fs, 3));
  geometry.setAttribute("aSphere", new BufferAttribute(fs, 3));
  geometry.setAttribute("aMono", new BufferAttribute(fm, 3));
  geometry.setAttribute("aRing", new BufferAttribute(fr, 3));
  geometry.setAttribute("aDir", new BufferAttribute(dir, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seed, 4));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMorph: { value: 0 },
      uCollapse: { value: 0 },
      uTime: { value: 0 },
      uPR: { value: o.pr },
      uOpacity: { value: 1 },
      uRef: { value: o.small ? REF_DIST.small : REF_DIST.wide },
      uFrost: { value: new Color(1, 0.88, 0.8) },
      uMistMin: { value: MIST.min },
      uMistMax: { value: MIST.max },
      uMistAlpha: { value: MIST.alpha },
    },
    vertexShader,
    fragmentShader,
  });
  const u = material.uniforms;

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -810; // behind the body, so its silhouette stays crisp

  return {
    points,

    update(morph: number, collapse: number, time: number, opacity: number, tint: Rgb) {
      (u.uFrost.value as Color).setRGB(...tint);
      u.uMorph.value = morph;
      u.uCollapse.value = collapse;
      u.uTime.value = time;
      u.uOpacity.value = opacity;
      points.visible = opacity > 0.002;
    },

    setPixelRatio(pr: number) {
      u.uPR.value = pr;
    },

    setTier(t: Tier) {
      geometry.setDrawRange(0, t === 0 ? n : Math.min(n, COUNT.tier1));
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export type Frost = ReturnType<typeof createFrost>;
