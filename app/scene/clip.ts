import { CustomBlending, Mesh, PlaneGeometry, ShaderMaterial, SrcAlphaFactor, Vector2, Vector3, ZeroFactor, type WebGLRenderer } from "three";
import { HOLE_EDGE_PX, type Circle } from "./types";

const vertexShader = `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// The alpha a CSS mask `radial-gradient(circle, #000 r, transparent r + edge)` would have at this pixel, times the
// frame's fade.
const fragmentShader = `
    uniform vec3 uCircle; uniform float uEdge; uniform float uFade;
    void main() {
      float keep = clamp((uCircle.z + uEdge - length(gl_FragCoord.xy - uCircle.xy)) / uEdge, 0.0, 1.0);
      gl_FragColor = vec4(0.0, 0.0, 0.0, keep * uFade);
    }`;

/** A circle that covers any drawing buffer: no clipping, only the fade. */
const EVERYWHERE = 1e9;

/**
 * Keeps the frame only inside a circle, and fades the whole frame: a full-screen pass, drawn after everything else,
 * that multiplies every pixel (colour and alpha, which are premultiplied) by the circle's coverage and the fade.
 * The coverage is exactly what a CSS mask did to the canvas ("stars only inside the hole"), without the compositor
 * re-masking a full-screen layer each frame; the fade lets a scene that starts mid-page come in gently, in the
 * renderer, not with an opacity animation on a full-screen layer. Hidden while there is neither a circle nor a
 * fade, so it costs nothing the rest of the time.
 */
export function createClip() {
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms: { uCircle: { value: new Vector3() }, uEdge: { value: HOLE_EDGE_PX }, uFade: { value: 1 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: ZeroFactor, // destination × source alpha, for colour and alpha alike
    blendDst: SrcAlphaFactor,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1e9; // after every other transparent object
  mesh.visible = false;
  const buffer = new Vector2();
  let circle: Circle | null = null;
  let fade = 1;
  const show = () => {
    mesh.visible = circle !== null || fade < 1;
  };

  return {
    mesh,

    set(clip: Circle | null) {
      circle = clip;
      show();
    },

    /** The whole frame's opacity, 0..1 (1: untouched). */
    setFade(f: number) {
      fade = Math.min(1, Math.max(0, f));
      material.uniforms.uFade.value = fade;
      show();
    },

    /** Converts the circle to drawing-buffer pixels (origin bottom left) for the frame about to be drawn. */
    update(renderer: WebGLRenderer, cssWidth: number, cssHeight: number) {
      if (!mesh.visible) return;
      const c = material.uniforms.uCircle.value as Vector3;
      if (!circle) {
        c.set(0, 0, EVERYWHERE);
        return;
      }
      renderer.getDrawingBufferSize(buffer);
      const sx = buffer.x / cssWidth;
      const sy = buffer.y / cssHeight;
      c.set(circle.x * sx, buffer.y - circle.y * sy, circle.r * sx);
      material.uniforms.uEdge.value = HOLE_EDGE_PX * sx;
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
