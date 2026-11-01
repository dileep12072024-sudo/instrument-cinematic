// The trees' detail levels, made off the main thread (tree-lod.js)
import { buildLods } from './tree-lod.js';
onmessage = ({ data: { id, job } }) => {
  const result = buildLods(job), transfer = [];
  for (const l of result.lods) { transfer.push(l.index.buffer); for (const [a] of Object.values(l.attributes)) transfer.push(a.buffer); }
  postMessage({ id, result }, [...new Set(transfer)]);
};
