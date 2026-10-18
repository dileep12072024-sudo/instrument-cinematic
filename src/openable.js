import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Side-hung casement windows that open outward (owner, 2026-10-17): two leaves per window, hinged at the outer edges of
// the opening, glazed, with glazing bars. A tap (main.js) opens or closes a window. To keep draw calls low, a cluster of
// windows draws as two merged meshes while every leaf is closed and the camera is far; near (or once opened) each leaf
// is its own pivot. Window frame: local x along the wall, y up, +z outward; origin at the bottom centre of the opening.
const keep = ['position', 'normal', 'uv', 'aPiece'];
const clean = g => { const c = g.index ? g.toNonIndexed() : g; for (const n of Object.keys(c.attributes)) if (!keep.includes(n)) c.deleteAttribute(n); return c; };

function leafGeometry(lw, h, dir, bars) { // hinge at origin, leaf toward x = dir * lw, outer face at z = 0
  const frame = [], X = x => dir * x, t = .04, s = .055;
  const bx = (x, y, w, hh) => { const g = new T.BoxGeometry(w, hh, t); g.translate(X(x), y, -t / 2); frame.push(g); };
  bx(s / 2, h / 2, s, h); bx(lw - s / 2, h / 2, s, h); bx(lw / 2, s / 2, lw, s); bx(lw / 2, h - s / 2, lw, s);
  for (let k = 1; k < bars.rows; k++) bx(lw / 2, h * k / bars.rows, lw - 2 * s, .025);
  for (let k = 1; k < bars.cols; k++) bx(lw * k / bars.cols, h / 2, .025, h - 2 * s);
  { const g = new T.CylinderGeometry(.008, .008, .12, 8); g.translate(X(lw - .05), h * .45, .02); frame.push(g); } // handle
  const glass = new T.PlaneGeometry(lw - .04, h - .04); glass.translate(X(lw / 2), h / 2, -t / 2);
  return { frame: mergeGeometries(frame.map(clean)), glass: clean(glass) };
}

export function casementCluster(name, frameMaterial, glassMaterial, { near = 22, openAngle = 1.35, rows = 3, cols = 2 } = {}) {
  const group = new T.Group(); group.name = name;
  const live = new T.Group(); live.name = `${name} (opening leaves)`; group.add(live);
  const leaves = [], windows = [], box = new T.Box3();
  let still = null;
  const api = {
    group, windows,
    add(matrix, w, h, opts = {}) {
      const win = { leaves: [], open: false };
      // Leaves: two (hinged at the outer edges) or three - the outer two hinged at the edges, the middle one on the
      // mullion to its left - each a third of the opening, as the original three-light windows (owner, 2026-10-17).
      const count = opts.leaves ?? 2, lw = w / count;
      const hinges = count === 3 ? [[-w / 2, 1], [w / 2, -1], [-w / 6, 1]] : [[-w / 2, 1], [w / 2, -1]];
      for (const [hx, dir] of hinges) {
        const { frame, glass } = leafGeometry(lw, h, dir, { rows: opts.rows ?? rows, cols: opts.cols ?? cols });
        const pivot = new T.Group(); pivot.matrixAutoUpdate = false;
        const hinge = new T.Matrix4().makeTranslation(hx, 0, 0).premultiply(matrix);
        const a = new T.Mesh(frame, frameMaterial), b = new T.Mesh(glass, glassMaterial); a.castShadow = true; pivot.add(a, b);
        for (const mesh of [a, b]) mesh.userData.casement = win;
        live.add(pivot);
        const leaf = { pivot, hinge, dir, angle: 0, frame, glass }; leaves.push(leaf); win.leaves.push(leaf);
        box.expandByPoint(new T.Vector3().setFromMatrixPosition(hinge));
      }
      windows.push(win); return win;
    },
    // Build the merged "all closed" version once every window is added.
    finish() {
      const pose = l => new T.Matrix4().copy(l.hinge);
      const f = mergeGeometries(leaves.map(l => l.frame.clone().applyMatrix4(pose(l)))), g = mergeGeometries(leaves.map(l => l.glass.clone().applyMatrix4(pose(l))));
      still = new T.Group(); still.name = `${name} (closed, merged)`;
      const fm = new T.Mesh(f, frameMaterial); fm.castShadow = true; still.add(fm, new T.Mesh(g, glassMaterial)); group.add(still);
      for (const l of leaves) { l.pivot.matrix.copy(l.hinge); l.pivot.matrixWorldNeedsUpdate = true; }
      return api;
    },
    toggle(win) { win.open = !win.open; },
    // Per frame: animate leaves toward their target, pick merged or live drawing. Returns true while anything moves.
    update(camera, dt) {
      let moving = false, anyOpen = false;
      for (const win of windows) for (const l of win.leaves) {
        const target = win.open ? -l.dir * openAngle : 0;
        if (Math.abs(l.angle - target) > .001) { l.angle = T.MathUtils.damp(l.angle, target, 4, dt); moving = true; l.pivot.matrix.copy(l.hinge).multiply(new T.Matrix4().makeRotationY(l.angle)); l.pivot.matrixWorldNeedsUpdate = true; }
        if (l.angle !== 0) anyOpen = true;
      }
      const close = box.distanceToPoint(camera.position) < near;
      live.visible = close || anyOpen || moving; if (still) still.visible = !live.visible;
      return moving;
    },
  };
  return api;
}
