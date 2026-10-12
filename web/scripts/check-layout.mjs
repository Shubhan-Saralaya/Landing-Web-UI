// Stress-tests the homeserver layout at its limits: node splitting, the sub-room cap, and that no room,
// pod or the spine corridor ever overlaps. Run: npm run check:layout
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = join(mkdtempSync(join(tmpdir(), 'layout-')), 'homeLayout.mjs');
await build({ entryPoints: ['src/scene/homeLayout.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'error' });
const L = await import(pathToFileURL(out).href);

const guests = (n, base = 100) =>
  Array.from({ length: n }, (_, i) => ({ vmid: base + i, name: `svc-${base + i}`, kind: 'lxc', status: 'running' }));
const node = (id, n) => ({ id, name: id, guests: guests(n, Number(id.replace(/\D/g, '') || 1) * 1000) });
const data = (...counts) => ({ datacenter: 'test', nodes: counts.map((n, i) => node(`n${i + 1}`, n)) });

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed++;
};

// --- splitting rules
const per = L.MAX_PER_ROOM;
const sub = L.MAX_SUB_ROOMS;
const roomsOf = (...c) => L.layoutHome(data(...c)).rooms.length;
check(roomsOf(per) === 1, `${per} services -> 1 room`);
check(roomsOf(per + 1) === 2, `${per + 1} services -> 2 rooms`);
check(roomsOf(per * sub) === sub, `${per * sub} services -> ${sub} rooms`);
const over = L.layoutHome(data(per * sub + 5));
check(over.rooms.length === sub && over.hidden === 5, `${per * sub + 5} services -> ${sub} rooms, 5 hidden`);
const split = L.layoutHome(data(per + 1)).rooms.map((r) => r.pods.length);
check(Math.max(...split) - Math.min(...split) <= 1, `split is balanced (${split.join(' + ')})`);
check(L.layoutHome(data(0)).rooms.length === 1, 'empty node still gets a room');

// --- spacing at the maximum: 4 nodes, every one full (4 * 3 rooms * 6 pods)
for (const [label, d] of [
  ['max (4 nodes x 18)', data(18, 18, 18, 18)],
  ['max (8 nodes x 18)', data(...Array(8).fill(18))],
  ['mixed', data(7, 2, 13, 1, 18, 6)],
]) {
  const lay = L.layoutHome(d);
  const discs = [];
  for (const r of lay.rooms) {
    discs.push({ x: r.x, z: r.z, r: L.ROOM_R, tag: `room ${r.key}` });
    for (const p of r.pods) discs.push({ x: p.x, z: p.z, r: L.POD_R, tag: `pod ${p.guest.vmid}` });
  }
  let minGap = Infinity;
  let worst = '';
  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {
      const a = discs[i];
      const b = discs[j];
      const gap = Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r;
      if (gap < minGap) {
        minGap = gap;
        worst = `${a.tag} / ${b.tag}`;
      }
    }
  }
  const ownRing = lay.rooms.every((r) => r.pods.every((p) => Math.abs(Math.hypot(p.x - r.x, p.z - r.z) - L.POD_DIST) < 1e-6));
  const spineGap = Math.min(...discs.map((c) => Math.abs(c.z) - c.r - 0.3));
  const pods = lay.rooms.reduce((n, r) => n + r.pods.length, 0);
  console.log(`      ${label}: ${lay.rooms.length} rooms, ${pods} pods, reach ${lay.reachX.toFixed(1)}, half-depth ${lay.halfZ.toFixed(1)}`);
  check(ownRing, `${label}: pods sit on their room's ring`);
  check(minGap > 0.05, `${label}: min gap between any two discs ${minGap.toFixed(2)} (${worst})`);
  check(spineGap > 0, `${label}: nothing touches the spine corridor (gap ${spineGap.toFixed(2)})`);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall layout checks passed');
