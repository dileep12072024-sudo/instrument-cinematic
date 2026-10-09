import * as T from 'three';

export const birdDaylight = altitude => T.MathUtils.smoothstep(altitude, 0, 6);

export function createBirds(scene, random = Math.random) {
  const group = new T.Group(); group.name = 'Daytime campus birds'; group.visible = false; scene.add(group);
  const species = [
    { name: 'Parrot', color: '#559831', wing: '#337631', beak: '#c64630', tail: .45, span: .48 },
    { name: 'Cuckoo', color: '#555c62', wing: '#343c43', beak: '#c6ac69', tail: .34, span: .43 },
    { name: 'Crow', color: '#242729', wing: '#111719', beak: '#202324', tail: .24, span: .60 },
  ];
  const round = new T.SphereGeometry(1, 12, 8);
  const forward = new T.Vector3(0, 0, 1), tangent = new T.Vector3();
  const birds = Array.from({ length: 7 }, (_, i) => {
    const type = species[i % species.length];
    const body = new T.Group(); body.name = type.name; group.add(body);
    const feather = new T.MeshStandardMaterial({ color: type.color, roughness: .85 });
    const dark = new T.MeshStandardMaterial({ color: type.wing, side: T.DoubleSide, roughness: .9 });
    const beak = new T.MeshStandardMaterial({ color: type.beak, roughness: .75 });
    const oval = (material, position, scale) => {
      const mesh = new T.Mesh(round, material); mesh.position.set(...position); mesh.scale.set(...scale); body.add(mesh); return mesh;
    };
    oval(feather, [0, 0, 0], [.095, .085, .23]);
    oval(feather, [0, .065, .20], [.078, .078, .085]);
    oval(beak, [0, .045, .295], [.035, .032, .07]);
    for (const side of [-1, 1]) oval(dark, [side * .068, .083, .225], [.012, .012, .012]);
    const tail = new T.Shape(); tail.moveTo(-.045, -.14); tail.lineTo(-.085, -.22 - type.tail); tail.quadraticCurveTo(0, -.25 - type.tail, .085, -.22 - type.tail); tail.lineTo(.045, -.14);
    const tailMesh = new T.Mesh(new T.ShapeGeometry(tail), dark); tailMesh.rotation.x = Math.PI / 2; body.add(tailMesh);
    const wings = [-1, 1].map(side => {
      const wing = new T.Group(); wing.position.set(side * .055, .025, .025); body.add(wing);
      const outline = new T.Shape(); outline.moveTo(0, .1); outline.quadraticCurveTo(side * type.span * .55, .17, side * type.span, -.11);
      for (let j = 0; j < 5; j++) outline.lineTo(side * (type.span - j * .047), -.18 + j * .011 + (j % 2) * .035);
      outline.quadraticCurveTo(side * .12, -.12, 0, -.10); outline.closePath();
      const mesh = new T.Mesh(new T.ShapeGeometry(outline), dark); mesh.rotation.x = Math.PI / 2; wing.add(mesh); return wing;
    });
    // All paths stay above the tallest roof, with independent, gently irregular circuits.
    const points = Array.from({ length: 8 }, (_, j) => {
      const angle = j * Math.PI / 4, radius = 22 + random() * 26;
      return new T.Vector3(Math.cos(angle) * radius, 19 + random() * 10, Math.sin(angle) * radius);
    });
    const path = new T.CatmullRomCurve3(points, true, 'catmullrom', .35);
    return { body, wings, path, progress: random(), speed: (4 + random() * 2) / path.getLength(), phase: random() * Math.PI * 2, time: 0 };
  });
  return {
    group,
    update(dt, altitude, reduced = false) {
      group.visible = altitude > 0 && !reduced;
      if (!group.visible) return;
      for (const bird of birds) {
        bird.time += dt; bird.progress = (bird.progress + dt * bird.speed) % 1;
        bird.body.position.copy(bird.path.getPointAt(bird.progress));
        tangent.copy(bird.path.getTangentAt(bird.progress));
        bird.body.quaternion.setFromUnitVectors(forward, tangent);
        const glide = Math.sin(bird.time * .65 + bird.phase) > .65;
        const flap = glide ? .08 : Math.sin(bird.time * 16 + bird.phase) * .65;
        bird.wings[0].rotation.z = flap; bird.wings[1].rotation.z = -flap;
      }
    },
  };
}
