// BufferGeometryUtils with one addition (vite aliases the addon to this file): while `pieces.tagging` is on,
// mergeGeometries stamps every input geometry with its own centre (attribute aPiece), so a merged mesh still knows
// which vertices belong to which wall, slab or pane. rise.js uses it to raise each piece rigidly out of the ground.
// Off by default: the landscape and everything after the building is built merges exactly as before.
import * as Utils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BufferAttribute, BufferGeometry, Box3, Vector3 } from 'three';

export * from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export const pieces = { tagging: false };

// A tagged piece's centre must move with it: geometry is often placed (translate, rotate, applyMatrix4) after it was
// merged and tagged. Every BufferGeometry transform goes through applyMatrix4, so this one hook covers them all.
const move = BufferGeometry.prototype.applyMatrix4;
BufferGeometry.prototype.applyMatrix4 = function (matrix) {
  const piece = this.attributes.aPiece;
  if (piece) { piece.applyMatrix4(matrix); piece.needsUpdate = true; }
  return move.call(this, matrix);
};

const box = new Box3(), centre = new Vector3();
export function tagPiece(geometry, at) {
  const count = geometry.attributes.position.count, array = new Float32Array(count * 3);
  if (!at) { box.setFromBufferAttribute(geometry.attributes.position); box.getCenter(centre); at = centre; }
  for (let i = 0; i < count; i++) { array[i * 3] = at.x; array[i * 3 + 1] = at.y; array[i * 3 + 2] = at.z; }
  geometry.setAttribute('aPiece', new BufferAttribute(array, 3));
  return geometry;
}

export function mergeGeometries(geometries, useGroups) {
  if (geometries.length && (pieces.tagging || geometries.some(g => g.attributes.aPiece))) { // mixed inputs would fail to merge
    // mergeGeometries needs one attribute set across its inputs: tag every input that lacks one (already tagged
    // inputs keep theirs, so a merged prop stays one piece when it is merged again into a batch).
    if (geometries.some(g => !g.attributes.aPiece) && geometries.every(g => g.attributes.position)) for (const g of geometries) if (!g.attributes.aPiece) tagPiece(g);
  }
  return Utils.mergeGeometries(geometries, useGroups);
}
