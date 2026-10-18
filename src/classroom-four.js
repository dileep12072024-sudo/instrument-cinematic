import * as T from 'three';
import * as P from './props.js';
import { classroomBuilder } from './classroom-three.js';
import { roomControls } from './roomlights.js';

// Class Room IV (owner's video "Class IV.mp4", 2026-10-18), behind its door at the end of the side passage. Local
// classroom-wing coordinates; the room runs from Class III's end wall (x 7.4) to the block's rear wall, and from the
// passage wall (z -20.49) to the outer wall. Read from the video: the teaching wall is Class III's wall (left on
// entering), with a whiteboard and a black display side by side over a raised tiled platform; the teacher's desk and
// cantilever chairs stand on it by the outer wall. Three bare timber windows (brown frames, three lights, steel grille) in
// the outer wall and three in the end wall; split ACs and oscillating wall fans on the piers between them; ceiling fans,
// square LED panels and paper ornaments under a white grid ceiling; marble-veined cream tiles; rows of timber desk-benches
// facing the teaching wall. Sizes are fitted to the shell, not surveyed.
export const classFour = {
  minX: 7.4, maxX: 16.98, frontZ: -20.49, backZ: -29.82, ceiling: 6.25, platform: .2,
  longWindows: [8.83, 12.17, 15.5], endWindows: [-28.5, -25.5, -22.5], windowWidth: 1.55, // on the facade's bay grid
};

export function buildClassFour(parent, m, floorY) {
  const { group, box, rod, add, random, tileSlab, transformed, bench, finish, steel, cream, ceilingMat, seam, lightMat, fanMat } = classroomBuilder(parent, m, floorY, 'IV');
  const { minX, maxX, frontZ, backZ, ceiling, platform, longWindows, endWindows, windowWidth } = classFour;
  const cx = (minX + maxX) / 2, cz = (backZ + frontZ) / 2, width = maxX - minX, depth = frontZ - backZ;
  const sill = floorY + .95, head = floorY + 2.37, wallTop = 7.46, mid = (sill + head) / 2;
  tileSlab(cx, cz, width, depth, floorY, .16);
  for (let x = minX; x < maxX; x += .6) for (let z = backZ; z < frontZ; z += .6) {
    const w = Math.min(.6, maxX - x), d = Math.min(.6, frontZ - z); box(x + w / 2, ceiling + .045, z + d / 2, w, .09, d, ceilingMat);
  }
  for (let x = minX; x < maxX; x += .6) box(x, ceiling - .004, cz, .014, .014, depth, seam);
  for (let z = backZ; z < frontZ; z += .6) box(cx, ceiling - .004, z, width, .014, .014, seam);

  // Outer walls with their window openings, in a frame where u runs along the wall and +w points into the room.
  // along: 'x' (outer long wall at backZ) or 'z' (end wall at maxX).
  const onWall = (along, draw) => {
    const matrix = along === 'x' ? new T.Matrix4() : new T.Matrix4().makeRotationY(Math.PI / 2);
    transformed(matrix, draw);
  };
  // In the end-wall frame (rotation +90 degrees) local (u, w) maps to room (x, z) = (w, -u).
  const walls = [
    { along: 'x', plane: backZ, from: minX - .1, to: maxX + .24, windows: longWindows, inward: 1 },
    { along: 'z', plane: maxX, from: -frontZ, to: -backZ + .24, windows: endWindows.map(z => -z), inward: -1 },
  ];
  for (const { along, plane, from, to, windows, inward } of walls) onWall(along, () => {
    const wc = plane - inward * .08; // wall centre: 8 cm out from the room edge, 0.32 thick (as Class III)
    box((from + to) / 2, (floorY - .16 + sill) / 2, wc, to - from, sill - floorY + .16, .32, m.plaster);
    box((from + to) / 2, (head + wallTop) / 2, wc, to - from, wallTop - head, .32, m.plaster);
    let edge = from;
    for (const u of [...windows].sort((a, b) => a - b)) {
      const left = u - windowWidth / 2;
      box((edge + left) / 2, mid, wc, left - edge, head - sill, .32, m.plaster);
      timberWindow(u, plane + inward * .09, windowWidth, inward);
      for (let k = -5; k <= 5; k++) box(u + k * windowWidth / 12, mid, plane + inward * .015, .012, head - sill, .012, m.aluminium); // steel grille
      for (let y = sill + .1; y < head; y += .16) box(u, y, plane + inward * .015, windowWidth, .012, .012, m.aluminium);
      edge = u + windowWidth / 2;
    }
    box((edge + to) / 2, mid, wc, to - edge, head - sill, .32, m.plaster);
  });
  // Bare timber window: brown frame, three lights in three rows, patterned glass; no curtains in the video.
  function timberWindow(u, w, ww, inward) {
    const h = head - sill;
    box(u, mid, w, ww, h, .012, m.glass);
    for (let i = 0; i <= 3; i++) box(u - ww / 2 + i * ww / 3, mid, w + inward * .025, .055, h + .06, .055, m.wood);
    for (let i = 0; i <= 3; i++) box(u, sill + i * h / 3, w + inward * .025, ww + .055, .045, .055, m.wood);
    box(u, sill - .03, w + inward * .06, ww + .12, .04, .14, m.wood); // timber sill board
  }
  // Partition to the rear room beyond the side passage's end (x 11 to the end wall).
  box((11 + maxX) / 2, (floorY - .16 + wallTop) / 2, -20.4, maxX - 11, wallTop - floorY + .16, .18, m.plaster);

  // Teaching wall (Class III's end wall, x = minX): raised tiled platform, whiteboard and black display, projector.
  const platformFront = 9.7, platformNear = -22.0;
  tileSlab((minX + platformFront) / 2, (platformNear + backZ) / 2, platformFront - minX, platformNear - backZ, floorY + platform, platform);
  const whiteboard = new T.MeshStandardMaterial({ name: 'Class IV whiteboard', color: '#f3f4f1', roughness: .25 });
  const display = new T.MeshStandardMaterial({ name: 'Class IV teaching display', color: '#0d1314', roughness: .3, metalness: .1 });
  const top = floorY + platform;
  box(minX + .02, top + 1.55, -23.6, .03, 1.2, 2.45, m.aluminium); box(minX + .04, top + 1.55, -23.6, .015, 1.14, 2.39, whiteboard);
  box(minX + .03, top + .95, -23.6, .07, .025, 2.2, m.aluminium); // marker tray
  box(minX + .04, top + 1.45, -26.1, .05, .95, 1.62, steel); box(minX + .066, top + 1.45, -26.1, .004, .89, 1.56, display);
  rod([minX + .04, top + .97, -25.4], [minX + .04, floorY + .1, -25.4], .006, cream); // its cable down the wall
  rod([9.6, ceiling, -23.6], [9.6, ceiling - .5, -23.6], .022, m.aluminium);
  add(P.rbox(.34, .12, .28, .02, 9.6, ceiling - .56, -23.6), cream); // ceiling projector
  { const lens = new T.CylinderGeometry(.04, .04, .03, 20); lens.rotateZ(Math.PI / 2); lens.translate(9.42, ceiling - .56, -23.6); add(lens, steel); }
  // Teacher's desk (black steel frame, dark top) and two cantilever chairs, by the outer wall.
  const desk = new T.MeshStandardMaterial({ name: 'Class IV desk top', map: P.woodTexture('#3b2a20'), roughness: .5 });
  add(P.rbox(.6, .035, 1.1, .01, 8.75, top + .76, -28.4), desk);
  for (const dx of [-.27, .27]) for (const dz of [-.5, .5]) box(8.75 + dx, top + .38, -28.4 + dz, .03, .76, .03, steel);
  for (const dx of [-.27, .27]) box(8.75 + dx, top + .12, -28.4, .025, .025, 1.0, steel);
  const chairCloth = [new T.MeshStandardMaterial({ name: 'Blue chair fabric', color: '#25407e', roughness: .9 }), new T.MeshStandardMaterial({ name: 'Maroon chair fabric', color: '#6e1f28', roughness: .9 })];
  const chair = (x, z, cloth, turn) => transformed(new T.Matrix4().makeRotationY(turn).setPosition(x, 0, z), () => {
    add(P.rbox(.46, .07, .44, .025, 0, top + .47, 0), cloth); add(P.rbox(.44, .38, .06, .025, 0, top + .78, -.24), cloth);
    for (const s of [-1, 1]) { // cantilever tube: floor runner, front leg, under the seat, up the back
      const path = new T.CatmullRomCurve3([[s * .22, top + .015, -.25], [s * .22, top + .015, .2], [s * .22, top + .1, .26], [s * .22, top + .42, .2], [s * .22, top + .44, -.18], [s * .22, top + .7, -.27]].map(p => new T.Vector3(...p)), false, 'catmullrom', .2);
      add(new T.TubeGeometry(path, 24, .011, 6, false), m.aluminium);
    }
  });
  chair(8.2, -28.5, chairCloth[0], Math.PI / 2); chair(9.2, -27.4, chairCloth[1], -Math.PI / 2 + .3);

  // Desk-benches facing the teaching wall: seven rows, four lines.
  let deskCount = 0;
  for (let row = 0; row < 7; row++) for (const z of [-21.68, -23.93, -26.33, -28.58]) { bench(10.45 + row * .86, z, 1.55); deskCount++; }
  group.userData.deskCount = deskCount;

  // Split ACs high on the piers; oscillating wall fans with their switch boxes and surface conduit.
  const ac = (x, z, turn) => transformed(new T.Matrix4().makeRotationY(turn).setPosition(x, 0, z), () => {
    add(P.rbox(1.0, .3, .21, .04, 0, ceiling - .42, .105), cream);
    box(0, ceiling - .53, .2, .9, .03, .02, steel);
    for (let k = 0; k < 3; k++) box(0, ceiling - .47 - k * .022, .212, .88, .007, .015, seam);
    add(P.rbox(.14, .12, .06, .01, .62, ceiling - .45, .04), cream); // its isolator
  });
  ac(10.5, backZ + .08, 0); ac(13.85, backZ + .08, 0); ac(maxX - .08, -24.0, -Math.PI / 2);
  const fanBody = new T.MeshStandardMaterial({ name: 'Class IV wall fan body', color: '#e8e6de', roughness: .45 });
  const wallFans = [];
  for (const [x, z, turn] of [[10.5, backZ + .08, 0], [13.85, backZ + .08, 0], [maxX - .08, -27.0, -Math.PI / 2], [maxX - .08, -21.4, -Math.PI / 2]]) {
    const fan = P.wallFan(fanBody, seam); fan.position.set(x, ceiling - 1.05, z); fan.rotation.y = turn; group.add(fan); wallFans.push(fan);
    transformed(new T.Matrix4().makeRotationY(turn).setPosition(x, 0, z), () => { // its switch box and the conduit up to it
      add(P.rbox(.16, .1, .04, .01, .2, floorY + 1.5, .02), cream); rod([.2, floorY + 1.55, .012], [.2, ceiling - .9, .012], .007, cream);
    });
  }
  // Ceiling fans in three rows, LED panels between them.
  const fanRows = [[], [], []], rows = [-22.6, -25.2, -27.8];
  for (const x of [9.4, 12.6, 15.6]) for (const [row, z] of rows.entries()) {
    rod([x, ceiling - .05, z], [x, ceiling - .48, z], .018, fanMat);
    const cup = new T.CylinderGeometry(.11, .045, .13, 16); cup.translate(x, ceiling - .09, z); add(cup, fanMat);
    const fan = m.fan.clone(true); fan.name = 'Class IV ceiling fan rotor'; fan.position.set(x, ceiling - .5, z);
    fan.rotation.y = random() * Math.PI * 2; fan.traverse(o => { if (o.isMesh) o.material = fanMat; }); group.add(fan); fanRows[row].push(fan);
  }
  const panelRows = rows.map(z => ({ material: lightMat.clone(), positions: [11.0, 14.1].map(x => [x, ceiling - .06, z]) }));
  for (const r of panelRows) for (const [x, , z] of r.positions) { box(x, ceiling - .018, z, .61, .025, .61, seam); box(x, ceiling - .035, z, .57, .015, .57, r.material); }
  // Folded paper ornaments on threads, and crossed red paper strips beside the windows (video 19-55 s).
  const papers = ['#d0447f', '#2f8bb5', '#d8b04a', '#3d9a73', '#c43a3a'].map(color => new T.MeshStandardMaterial({ color, roughness: .9, side: T.DoubleSide }));
  for (let i = 0; i < 15; i++) {
    const x = 10.2 + (i % 5) * 1.5, z = -22 - Math.floor(i / 5) * 2.7, drop = .25 + random() * .2;
    rod([x, ceiling, z], [x, ceiling - drop, z], .0015, seam);
    for (let fold = 0; fold < 6; fold++) { const g = new T.CircleGeometry(.07, 12); g.scale(.85, 1.15, 1); g.rotateY(fold * Math.PI / 6); g.translate(x, ceiling - drop - .07, z); add(g, papers[i % papers.length]); }
  }
  const ribbon = new T.MeshStandardMaterial({ name: 'Red paper strips', color: '#c8323f', roughness: .85, side: T.DoubleSide });
  const cross = (x, y, z, turn) => { for (const a of [.7, -.7]) { const g = new T.PlaneGeometry(.04, .3); g.rotateZ(a); g.rotateY(turn); g.translate(x, y, z); add(g, ribbon); } };
  for (const u of longWindows) cross(u + windowWidth / 2 + .2, head + .25, backZ + .1, 0);
  for (const z of endWindows) cross(maxX - .1, head + .25, z - windowWidth / 2 - .2, -Math.PI / 2);

  const room = finish();
  fanRows.push(wallFans);
  // Every panel lights the room; the board is on the teaching wall by the door, the fans run (roomlights.js).
  roomControls(room, { name: 'Class IV', box: [minX, maxX, floorY, ceiling, backZ, frontZ], panelRows, fanRows,
    board: { position: [minX + .006, floorY + 1.35, -21.0], turn: Math.PI / 2 } });
  return room;
}
