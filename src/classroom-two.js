import * as T from 'three';
import { classroomBuilder } from './classroom-three.js';
import { roomControls } from './roomlights.js';

// Fitted to the existing wing; the video establishes the layout, not survey dimensions.
export const classTwo = { minX: -12.65, maxX: -1.18, frontZ: -18.16, backZ: -29.82, ceiling: 6.25, platform: .16 };

export function buildClassTwo(parent, m, floorY) {
  const { group, box, rod, add, random, tileSlab, transformed, bench, finish, tiles, steel, cream, ceilingMat, seam, lightMat, fanMat, fabric } = classroomBuilder(parent, m, floorY, 'II');
  const { minX, maxX, frontZ, backZ, ceiling, platform } = classTwo;
  const cx = (minX + maxX) / 2, cz = (frontZ + backZ) / 2, width = maxX - minX, depth = frontZ - backZ;
  tileSlab(cx, cz, width, depth, floorY, .16);
  tileSlab(-6.8, -29.04, 9.4, 1.4, floorY + platform, platform);
  // The entrance wall is shared with III; only its aisle-side extension is new.
  for (const [a, b] of [[-20.43, -19.73], [-18.57, frontZ + .1]]) box(maxX + .05, (floorY + ceiling) / 2, (a + b) / 2, .1, ceiling - floorY, b - a, m.plaster);
  box(maxX + .05, (floorY + 2.38 + ceiling) / 2, -19.15, .1, ceiling - floorY - 2.38, 1.16, m.plaster);

  // Each window is a real opening, including the window partly concealed by the white board.
  function windowWall(length, centers, windowWidth, matrix, acIndices = [], bareWindow = -1) {
    transformed(matrix, () => {
      box(0, floorY + .475, 0, length, .95, .24, m.plaster);
      box(0, (floorY + 2.37 + 7.46) / 2, 0, length, 7.46 - floorY - 2.37, .24, m.plaster);
      let edge = -length / 2;
      for (const [index, x] of centers.entries()) {
        const left = x - windowWidth / 2, mid = floorY + 1.66;
        box((edge + left) / 2, mid, 0, left - edge, 1.42, .24, m.plaster);
        box(x, mid, .02, windowWidth, 1.42, .008, m.glass);
        for (let i = 0; i <= 3; i++) {
          box(x - windowWidth / 2 + i * windowWidth / 3, mid, .05, .05, 1.48, .07, m.wood);
          box(x, mid - .71 + i * 1.42 / 3, .05, windowWidth + .05, .045, .07, m.wood);
        }
        for (let u = -windowWidth / 2 + .08; u < windowWidth / 2; u += .12) box(x + u, mid, .10, .012, 1.42, .012, m.aluminium);
        for (let y = mid - .65; y < mid + .71; y += .16) box(x, y, .10, windowWidth, .012, .012, m.aluminium);
        if (index !== bareWindow) {
          rod([x - windowWidth * .6, mid + .84, .17], [x + windowWidth * .6, mid + .84, .17], .012, steel);
          for (const side of [-1, 1]) {
            const cw = windowWidth * (index % 2 ? .22 : .43);
            const g = new T.PlaneGeometry(cw, 1.58, 24, 4), p = g.attributes.position;
            for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / cw + .5) * Math.PI * 12) * .035);
            g.computeVertexNormals(); g.translate(x + side * (windowWidth / 2 - cw / 2), mid - .02, .2); add(g, fabric);
          }
        }
        if (acIndices.includes(index)) {
          box(x, ceiling - .60, .19, 1.1, .32, .22, cream);
          box(x, ceiling - .72, .31, .98, .04, .018, steel);
          for (let k = 0; k < 3; k++) box(x, ceiling - .66 - k * .025, .32, .96, .008, .018, seam);
          box(x + .75, ceiling - .63, .14, .18, .15, .08, cream);
          rod([x + .45, ceiling - .73, .14], [x + .75, ceiling - .7, .14], .009, steel);
        }
        edge = x + windowWidth / 2;
      }
      box((edge + length / 2) / 2, floorY + 1.66, 0, length / 2 - edge, 1.42, .24, m.plaster);
      box(0, floorY + .07, .13, length, .14, .025, tiles);
    });
  }
  const wall = (angle, x, z) => new T.Matrix4().makeRotationY(angle).setPosition(x, 0, z);
  windowWall(width, [-10.4, -6.8, -3.2].map(x => x - cx), 1.65, wall(0, cx, backZ - .08), [], 1);
  windowWall(width, [-9.8, -6.7, -3.6].map(x => cx - x).sort((a, b) => a - b), 1.55, wall(Math.PI, cx, frontZ + .06));
  windowWall(depth, [-27.85, -25.05, -22.25, -19.4].map(z => cz - z).sort((a, b) => a - b), 1.65, wall(Math.PI / 2, minX - .08, cz), [1, 2, 3]);
  const columns = [-3.1, -6.7, -10.3];
  for (const x of columns) {
    box(x, (floorY + ceiling) / 2, -21, .48, ceiling - floorY, .48, m.plaster);
    box(x, floorY + .07, -21, .53, .14, .53, tiles);
  }
  group.userData.columns = columns;
  for (let x = minX; x < maxX; x += .6) for (let z = backZ; z < frontZ; z += .6) {
    const w = Math.min(.6, maxX - x), d = Math.min(.6, frontZ - z);
    box(x + w / 2, ceiling + .04, z + d / 2, w - .012, .08, d - .012, ceilingMat);
  }
  box(cx, ceiling + .09, cz, width, .015, depth, seam);
  // Desk-benches as filmed (video 20261014_122755, 23-60 s): the outer columns stand close along the window walls with a
  // narrow strip of floor, two middle columns between the pillar lines; they run from the platform to the pillars, the
  // area by the entrance is open floor with one bench against the AC wall. Rows per column are counted from the video
  // where visible, so they are estimates where a column is partly hidden.
  const benchLines = [[-11.5, 8], [-8.4, 8], [-5.2, 7], [-2.1, 7]];
  for (const [x, rows] of benchLines) for (let row = 0; row < rows; row++) bench(x, -27.5 + row * .86, 1.55, -Math.PI / 2);
  bench(-11.5, -19.35, 1.55, -Math.PI / 2);
  group.userData.benchLines = benchLines.map(([x]) => x); group.userData.deskCount = benchLines.reduce((n, [, r]) => n + r, 1); group.userData.benchWidth = 1.55;
  const board = new T.MeshStandardMaterial({ name: 'Class II green chalkboards', color: '#244e43', roughness: .86 });
  for (const x of [-8.6, -5]) {
    box(x, floorY + 2.0, backZ + .18, 1.65, 1.45, .06, m.aluminium);
    box(x, floorY + 2.0, backZ + .22, 1.58, 1.38, .025, board);
    box(x, floorY + 1.27, backZ + .27, 1.65, .035, .16, m.aluminium);
  }
  box(-6.8, floorY + 2.13, backZ + .24, 1.95, 1.60, .07, m.aluminium);
  box(-6.8, floorY + 2.13, backZ + .282, 1.89, 1.54, .025, cream);
  box(-6.8, floorY + platform + .77, -28.95, 1.1, .055, .65, m.wood);
  for (const dx of [-.48, .48]) for (const dz of [-.25, .25]) box(-6.8 + dx, floorY + platform + .38, -28.95 + dz, .06, .76, .06, m.wood);
  box(-6.8, floorY + platform + .46, -29.45, .44, .055, .43, m.wood);
  for (const dx of [-.19, .19]) {
    box(-6.8 + dx, floorY + platform + .52, -29.62, .04, 1.04, .04, m.wood);
    box(-6.8 + dx, floorY + platform + .23, -29.27, .04, .46, .04, m.wood);
  }
  box(-6.8, floorY + platform + .98, -29.62, .44, .12, .04, m.wood);
  for (let x = -6.97; x < -6.6; x += .035) box(x, floorY + platform + .76, -29.62, .008, .32, .012, cream);
  const fanRows = [[], [], []];
  for (const x of [-3.1, -6.7, -10.3]) for (const [row, z] of [-22.8, -25.2, -27.6].entries()) {
    rod([x, ceiling, z], [x, ceiling - .48, z], .018, fanMat);
    const cup = new T.CylinderGeometry(.11, .045, .13, 16); cup.translate(x, ceiling - .08, z); add(cup, fanMat);
    const fan = m.fan.clone(true); fan.name = 'Class II ceiling fan rotor'; fan.position.set(x, ceiling - .5, z);
    fan.rotation.y = random() * Math.PI * 2; fan.traverse(o => { if (o.isMesh) o.material = fanMat; }); group.add(fan); fanRows[row].push(fan);
  }
  // Nine LED panels in three rows across the room, each row on its own switch (switchboard beside the door).
  const panelRows = [-19.92, -23.52, -27.12].map(z => ({ material: lightMat.clone(), positions: [-4.55, -8.15, -11.15].map(x => [x, ceiling - .05, z]) }));
  for (const r of panelRows) for (const [x, , z] of r.positions) box(x, ceiling - .025, z, .57, .02, .57, r.material);
  const colors = ['#bd387d', '#3783a1', '#b6a345', '#40856c'].map(color => new T.MeshStandardMaterial({ color, roughness: .9, side: T.DoubleSide }));
  for (let i = 0; i < 18; i++) {
    const x = -2.5 - (i % 6) * 1.7, z = -23 - Math.floor(i / 6) * 2, y = ceiling - .28 - random() * .15;
    rod([x, ceiling, z], [x, y, z], .0015, seam);
    for (let k = 0; k < 6; k++) { const g = new T.CircleGeometry(.07, 12); g.scale(.85, 1.15, 1); g.rotateY(k * Math.PI / 6); g.translate(x, y - .07, z); add(g, colors[i % 4]); }
  }
  // Projector and the exposed network cabinet/cable loops beside the entrance.
  rod([-6.8, ceiling, -26.2], [-6.8, ceiling - .65, -26.2], .022, m.aluminium);
  box(-6.8, ceiling - .7, -26.2, .32, .12, .27, cream);
  const lens = new T.CylinderGeometry(.045, .045, .035, 20); lens.rotateX(Math.PI / 2); lens.translate(-6.8, ceiling - .71, -26.35); add(lens, steel);
  box(-1.31, floorY + 2.75, -19.9, .24, .40, .55, seam);
  box(-1.44, floorY + 2.75, -19.9, .015, .31, .45, steel);
  for (let i = 0; i < 7; i++) {
    const path = new T.CatmullRomCurve3([[-1.45, floorY + 2.55, -19.9], [-1.5, floorY + 2.3 - i * .10, -19.78], [-1.48, floorY + 2.18 - i * .10, -20.04], [-1.45, floorY + 2.55, -19.9]].map(p => new T.Vector3(...p)));
    add(new T.TubeGeometry(path, 20, .004, 5, false), steel);
  }
  for (const x of [-3.2, -6.7, -10.2]) {
    box(x, floorY + 1.5, frontZ - .09, .23, .11, .035, cream);
    rod([x, floorY + 1.55, frontZ - .08], [x, ceiling, frontZ - .08], .008, seam);
  }
  const room = finish();
  // Each panel lights the room; switchboard beside the entrance (video 78 s); fans spin (roomlights.js).
  roomControls(room, { name: 'Class II', box: [minX, maxX, floorY, ceiling, backZ, frontZ], panelRows, fanRows,
    board: { position: [maxX - .012, floorY + 1.35, -20.12], turn: -Math.PI / 2 } });
  return room;
}
