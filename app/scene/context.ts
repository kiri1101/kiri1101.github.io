/**
 * Which WebGL the scene accepts, shared by the host's availability check and `createScene`, so the check answers
 * for exactly the context the scene will ask for. No three.js here: the host imports this eagerly.
 */

/**
 * - No MSAA: the orb's soft dots have no hard edges to smooth, and the cards anti-alias their own rounded edges
 *   in the shader. On weak GPUs MSAA was the prototype's single largest cost.
 * - failIfMajorPerformanceCaveat: software or blocklisted GL (SwiftShader, llvmpipe, lab tools without a GPU)
 *   gets no context, and the page keeps its poster; `isSoftwareRenderer` catches what the flag lets through.
 *   `allowSoftwareGL` lifts both, for tests only.
 */
export function sceneContextAttributes(allowSoftwareGL = false): WebGLContextAttributes {
  return {
    alpha: true,
    antialias: false,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: !allowSoftwareGL,
  };
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;
/** What Chrome and Safari answer for RENDERER; the real name then comes from WEBGL_debug_renderer_info. */
const MASKED_RENDERER = /^(webkit webgl|mozilla)$/i;

/**
 * True when the context renders on the CPU. failIfMajorPerformanceCaveat alone does not catch every case:
 * Chromium started with SwiftShader chosen explicitly (as Playwright's headless Chromium is) still grants the
 * context. Firefox reports the real renderer in RENDERER, so it never touches the extension it deprecates.
 */
export function isSoftwareRenderer(gl: WebGL2RenderingContext): boolean {
  let renderer = String(gl.getParameter(gl.RENDERER));
  if (MASKED_RENDERER.test(renderer)) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  return SOFTWARE_RENDERER.test(renderer);
}
