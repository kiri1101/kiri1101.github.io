import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from "three";
import { ss, type Phases } from "~/lib/timeline";
import type { Frost } from "./frost";
import { paletteAt } from "./palette";
import type { Tier } from "./types";

/** Radius of the sphere stage. */
export const ORB_R = 1.6;

/** Points in the body: the prototype's counts per layout, capped on tier 1. */
const POINTS = { wide: 24000, small: 10000, tier1: 14000 };

export const orbPointCount = (small: boolean) => (small ? POINTS.small : POINTS.wide);

/** The body's three shapes, point i of each belonging to the same particle (see geometry.ts). */
export type OrbShapes = { sph: Float32Array; mono: Float32Array; ring: Float32Array };

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Shaders verbatim from the approved prototype.
const vertexShader = `
    uniform float uMorph, uCollapse, uTime, uSize, uPR;
    attribute vec3 aSphere; attribute vec3 aMono; attribute vec3 aRing; attribute float aRand;
    varying float vWarm; varying float vShade;
    void main() {
      float t1 = clamp(uMorph, 0.0, 1.0), t2 = clamp(uMorph - 1.0, 0.0, 1.0);
      float s1 = smoothstep(aRand * 0.35, aRand * 0.35 + 0.65, t1);
      float s2 = smoothstep(aRand * 0.35, aRand * 0.35 + 0.65, t2);
      vec3 p = mix(mix(aSphere, aMono, s1), aRing, s2);
      p += 0.03 * vec3(sin(uTime * 0.9 + aRand * 40.0), cos(uTime * 1.1 + aRand * 31.0), sin(uTime * 0.7 + aRand * 23.0));
      float c = uCollapse * uCollapse * (3.0 - 2.0 * uCollapse);
      float ang = c * 7.0 * (0.4 + aRand);
      p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
      p *= 1.0 - c;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      vWarm = 1.0 - smoothstep(0.0, 1.05, length(p) / 2.1);
      vShade = aRand;
      gl_PointSize = uSize * uPR * (0.55 + aRand * 0.9) / -mv.z;
    }`;

const fragmentShader = `
    uniform float uOpacity, uDark, uCollapse; uniform vec3 uCore;
    varying float vWarm; varying float vShade;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.1, d);
      vec3 frost = mix(vec3(0.79, 0.81, 0.85), vec3(1.0), smoothstep(0.1, 0.8, vShade));
      vec3 col = mix(frost, uCore, pow(vWarm, 1.4) * 0.92);
      col = mix(col, vec3(1.0, 0.86, 0.72), uDark);
      gl_FragColor = vec4(col, a * uOpacity * 0.95 * (1.0 - 0.7 * smoothstep(0.25, 0.9, uCollapse)));   // thin out as it compresses
    }`;

type Pointer = { x: number; y: number };

/**
 * The hero body: particles that morph sphere → monogram → ring, then swirl into a single point.
 * The frost aura rides along as a child, so it shares the body's rotation and parallax.
 * The shapes and the frost are built beforehand, a stage at a time, so no single step is a long task.
 */
export function createOrb(o: { shapes: OrbShapes; frost: Frost; small: boolean; pr: number }) {
  const { sph, mono, ring } = o.shapes;
  const { frost } = o;
  const n = sph.length / 3;
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) seeds[i] = Math.random();

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(sph, 3));
  geometry.setAttribute("aSphere", new BufferAttribute(sph, 3));
  geometry.setAttribute("aMono", new BufferAttribute(mono, 3));
  geometry.setAttribute("aRing", new BufferAttribute(ring, 3));
  geometry.setAttribute("aRand", new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMorph: { value: 0 },
      uCollapse: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: o.small ? 40 : 36 },
      uPR: { value: o.pr },
      uOpacity: { value: 1 },
      uDark: { value: 0 },
      uCore: { value: new Color(1.0, 0.56, 0.3) },
    },
    vertexShader,
    fragmentShader,
  });
  const u = material.uniforms;

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -800;
  points.add(frost.points);

  let rot = 0;

  return {
    object: points,

    update(ph: Phases, P: number, dt: number, time: number, pointer: Pointer) {
      const { morph, mono: monoStage, collapse } = ph;
      rot += dt * 0.16 * (1 - monoStage) * (1 - collapse);
      rot = lerp(rot, Math.round(rot / TAU) * TAU, monoStage * 0.08);
      points.rotation.set(pointer.y * 0.18 * (1 - collapse), rot + pointer.x * 0.3 * (1 - collapse), 0);
      u.uMorph.value = morph;
      u.uCollapse.value = collapse;
      u.uTime.value = time;
      u.uDark.value = ss(2.1, 2.4, P);
      const opacity = 1 - ss(2.2, 2.5, P); // fade out before the particles pile up
      u.uOpacity.value = opacity;
      points.visible = P < 2.55 && opacity > 0.002;
      const pal = paletteAt(morph, collapse);
      (u.uCore.value as Color).setRGB(...pal.core);
      frost.update(morph, collapse, time, 1 - ss(2.1, 2.45, P), pal.frost);
    },

    setPixelRatio(pr: number) {
      u.uPR.value = pr;
      frost.setPixelRatio(pr);
    },

    setTier(t: Tier) {
      geometry.setDrawRange(0, t === 0 ? n : Math.min(n, POINTS.tier1));
      frost.setTier(t);
    },

    /** Releases the body; the frost belongs to whoever created it. */
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
