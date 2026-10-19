import * as T from 'three';
import { tagPiece } from './merge-pieces.js';

// The arrival (owner's reference video, 2026-10-18): the department rises out of the land in construction order.
// Every merged piece (wall, slab, column, pane, door, sign; tagged with its centre by merge-pieces.js) rises rigidly from
// below the earth on its own delay: ground storey first, storey by storey, from the entrance tower outward to the wings;
// the envelope (glazing, doors, screens, gates) after the structure; fittings and signs last. Each piece arrives with
// weight: fast, a small overshoot, settled. The shadow pass uses the same offset (customDepthMaterial), so shadows rise
// with the building. Dust breaks out of the ground where the ground-storey walls come through.
//
// One clock: uRiseT in seconds. Before start() everything is underground; once the clock passes the last piece the
// shader's branch is skipped (uRiseOn = 0) and the building is exactly as built.

const SHELL = 0, ENVELOPE = 1.45, FITOUT = 2.3, SIGNAGE = 3.3; // class delays, seconds: the signs land last, like the logo in the video
const PER_STOREY = .55, PER_METRE_X = .038, PER_METRE_Z = .016, JITTER = .3, DURATION = .9, STOREY = 4;
export const RISE_RATE = .62; // the rise's own clock runs slower than wall time: about eleven seconds, with weight
export const RISE_LENGTH = SHELL + SIGNAGE + PER_STOREY * 3 + PER_METRE_X * 34 + PER_METRE_Z * 17 + JITTER + DURATION + .1;

const envelope = /glass|glaz|door|leaf|leaves|timber|window|casement|screen|grille|gate|shutter|laminate|sidelight|frame/i;
const fitout = /sign|board|plaque|notice|label|fan|lamp|light|tube|garland|hardware|padlock|clock|display|curtain|bench|seat|chair|table|desk|marigold|kolam|calendar|cooler|purifier|projector|ornament|paper|switch|meter|box|conduit|extinguisher|bucket/i;
function classOf(material) {
  const name = material.name || '';
  if (/^(porch sign|upper facade sign)$/i.test(name)) return SIGNAGE;
  if (fitout.test(name)) return FITOUT;
  if (material.transparent || envelope.test(name)) return ENVELOPE;
  return SHELL;
}

// The same hash in GLSL and JS: the dust has to land where (and when) the walls do.
const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
export function delayAt(x, y, z, cls = SHELL) {
  return cls + PER_STOREY * Math.floor(Math.max(y + .5, 0) / STOREY) + PER_METRE_X * Math.abs(x) + PER_METRE_Z * Math.abs(z) + JITTER * hash(x, z);
}

const RISE_GLSL = /* glsl */`
if (uRiseOn > 0.5) {
  vec3 rc = (modelMatrix * vec4(aPiece, 1.0)).xyz;
  float rh = fract(sin(rc.x * 12.9898 + rc.z * 78.233) * 43758.5453);
  float rd = uRiseClass + ${PER_STOREY.toFixed(3)} * floor(max(rc.y + 0.5, 0.0) / ${STOREY.toFixed(1)}) + ${PER_METRE_X.toFixed(3)} * abs(rc.x) + ${PER_METRE_Z.toFixed(3)} * abs(rc.z) + ${JITTER.toFixed(3)} * rh;
  float rt = clamp((uRiseT - rd) / ${DURATION.toFixed(3)}, 0.0, 1.0) - 1.0;
  float re = 1.0 + 1.9 * rt * rt * rt + 0.9 * rt * rt; /* ease out with a ~3% overshoot */
  transformed.y -= (1.0 - re) * (max(rc.y, 0.0) + 5.0 + 3.0 * rh); /* from below the earth */
}`;

export function createRise() {
  const shared = { uRiseT: { value: -1 }, uRiseOn: { value: 1 } };
  const patched = new WeakSet(), depthByClass = new Map();
  function patch(material, cls) {
    if (patched.has(material)) return; patched.add(material);
    const before = material.onBeforeCompile, key = material.customProgramCacheKey;
    const uRiseClass = { value: cls };
    material.customProgramCacheKey = () => (key && key !== T.Material.prototype.customProgramCacheKey ? key.call(material) : '') + '|rise';
    material.onBeforeCompile = (shader, renderer) => {
      before?.call(material, shader, renderer);
      Object.assign(shader.uniforms, shared, { uRiseClass });
      shader.vertexShader = 'attribute vec3 aPiece;\nuniform float uRiseT, uRiseOn, uRiseClass;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + RISE_GLSL);
    };
    material.needsUpdate = true;
  }
  function depthMaterial(cls, kind) {
    const key = kind + cls;
    if (!depthByClass.has(key)) {
      const m = kind === 'distance' ? new T.MeshDistanceMaterial() : new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
      patch(m, cls); depthByClass.set(key, m);
    }
    return depthByClass.get(key);
  }
  return {
    uniforms: shared,
    // Every mesh under root rises; any mesh elsewhere sharing one of these materials gets its own centre too.
    attach(root, scene) {
      const materials = new Set();
      root.traverse(o => {
        if (!o.isMesh || Array.isArray(o.material) || o.isInstancedMesh) return;
        if (!o.geometry.attributes.aPiece) tagPiece(o.geometry); // its own centre (local space; the shader applies modelMatrix)
        const cls = classOf(o.material);
        patch(o.material, cls); materials.add(o.material);
        if (o.castShadow && !o.customDepthMaterial) o.customDepthMaterial = depthMaterial(cls, 'depth');
        if (o.castShadow && !o.customDistanceMaterial) o.customDistanceMaterial = depthMaterial(cls, 'distance');
      });
      scene?.traverse(o => { if (o.isMesh && !o.isInstancedMesh && materials.has(o.material) && !o.geometry.attributes.aPiece) tagPiece(o.geometry); });
    },
    set(t) { shared.uRiseT.value = t; shared.uRiseOn.value = t < RISE_LENGTH ? 1 : 0; },
    get time() { return shared.uRiseT.value; },
    get done() { return shared.uRiseOn.value === 0; },
  };
}

// Dust where the ground-storey walls break through: puffs along every footprint edge, each born when the wall above
// it lands. All motion is in the vertex shader (no per-frame CPU work): position = origin + drift * age, eased.
export function createRiseDust(footprint, groundAt = () => 0) {
  const origins = [], drift = [], birth = [], seed = [];
  let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (const part of footprint) {
    const hx = part.width / 2, hz = part.depth / 2, edges = [[-hx, -hz, hx, -hz], [hx, -hz, hx, hz], [hx, hz, -hx, hz], [-hx, hz, -hx, -hz]];
    for (const [ax, az, bx, bz] of edges) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 2.2));
      for (let k = 0; k < n; k++) {
        const u = (k + .5) / n, x = part.x + ax + (bx - ax) * u, z = part.z + az + (bz - az) * u, out = new T.Vector2(x - part.x, z - part.z).normalize();
        const born = delayAt(x, 0, z) + DURATION * .55, y = groundAt(x, z);
        for (let p = 0; p < 9; p++) {
          origins.push(x + (rnd() - .5) * 1.4, y + .1, z + (rnd() - .5) * 1.4);
          drift.push(out.x * (1.2 + rnd() * 2.4) + (rnd() - .5), .5 + rnd() * 1.6, out.y * (1.2 + rnd() * 2.4) + (rnd() - .5));
          birth.push(born + rnd() * .25); seed.push(rnd());
        }
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(origins, 3)); g.setAttribute('aDrift', new T.Float32BufferAttribute(drift, 3));
  g.setAttribute('aBirth', new T.Float32BufferAttribute(birth, 1)); g.setAttribute('aSeed', new T.Float32BufferAttribute(seed, 1));
  const material = new T.ShaderMaterial({
    uniforms: { uT: { value: -1 }, uColor: { value: new T.Color('#d8c6ac') }, uLight: { value: 1 }, uScale: { value: 600 } },
    vertexShader: /* glsl */`
      attribute vec3 aDrift; attribute float aBirth, aSeed; uniform float uT, uScale; varying float vA;
      void main() {
        float age = uT - aBirth, life = 2.4 + aSeed * 1.4, u = clamp(age / life, 0.0, 1.0);
        float spread = 1.0 - pow(1.0 - u, 3.0);
        vec3 p = position + aDrift * spread * 2.6; p.y += spread * 1.4;
        vA = age < 0.0 ? 0.0 : smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.25, 1.0, u)) * (0.16 + 0.14 * aSeed);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uScale * (1.2 + 3.2 * spread) * (0.6 + aSeed) / -mv.z;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uLight; varying float vA;
      void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard;
        gl_FragColor = vec4(uColor * uLight, vA * pow(1.0 - r, 2.4)); }`,
    transparent: true, depthWrite: false,
  });
  const points = new T.Points(g, material); points.name = 'Rise dust'; points.frustumCulled = false; points.renderOrder = 2;
  const end = Math.max(...birth) + 4;
  return { points, material, set(t) { material.uniforms.uT.value = t; points.visible = t > 0 && t < end; } };
}
