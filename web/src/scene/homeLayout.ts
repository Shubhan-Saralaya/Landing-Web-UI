/**
 * Layout of the homeserver ship, in scene units (the 2D view scales these). Pure: no three.js.
 *
 *   core ── spine ──────────────────────────▶ +x
 *            │ column 0     │ column 1  ...
 *        ┌───┴───┐ room ±z, pods fan outward
 *
 * Every Proxmox node is a room. A node with more than `maxPerRoom` services splits into up to
 * `maxSubRooms` rooms ("home2 · 1/2"); anything past `maxPerRoom * maxSubRooms` is not drawn (reported
 * as `hidden`). Rooms alternate above/below a spine corridor, one column per pair, so neighbouring rooms
 * and pod fans can never overlap however many nodes there are.
 */

import type { Guest, HomeserverData, PveNode } from '../types';

export const MAX_PER_ROOM = 6;
export const MAX_SUB_ROOMS = 3;
/** The hub has room for this many side ships (Shipyard + Homeserver today; the rest are reserved). */
export const MAX_SIDE_SHIPS = 4;

export const CORE_R = 1.5;
export const ROOM_R = 1.35;
export const POD_R = 0.58;
export const POD_DIST = 2.9; // room centre -> pod centre
export const POD_STEP = 0.5; // radians between neighbouring pods
export const COLUMN_X0 = 6.2; // core -> first column
export const COLUMN_STEP = 7.6;
export const ROOM_OFFSET = 4.8; // spine -> room centre

export interface PodPlace {
  guest: Guest;
  /** Position relative to the core, XZ plane. */
  x: number;
  z: number;
}

export interface RoomPlace {
  key: string;
  nodeId: string;
  /** Node name, plus "· 1/2" when the node was split. Empty for the anonymous rooms shown while sealed. */
  label: string;
  x: number;
  z: number;
  /** +1 = room above the spine (+z), -1 = below. */
  side: 1 | -1;
  pods: PodPlace[];
}

export interface HomeLayout {
  rooms: RoomPlace[];
  /** Spine corridor runs from the core to this x. */
  spineEnd: number;
  /** Furthest point from the core along +x, and half the depth in z, including pods. */
  reachX: number;
  halfZ: number;
  /** Guests dropped because their node exceeded maxPerRoom * maxSubRooms. */
  hidden: number;
}

// Shown when the server is unreachable: two anonymous rooms, no pods.
const SEALED: PveNode[] = [
  { id: 'sealed-a', name: '', guests: [] },
  { id: 'sealed-b', name: '', guests: [] },
];

export function layoutHome(data?: HomeserverData): HomeLayout {
  const maxPer = Math.max(1, Math.floor(data?.layout?.maxPerRoom ?? MAX_PER_ROOM));
  const maxSubs = Math.max(1, Math.floor(data?.layout?.maxSubRooms ?? MAX_SUB_ROOMS));
  const nodes = data?.nodes ?? SEALED;

  // Split each node into sub-rooms of near-equal size.
  const chunks: { node: PveNode; guests: Guest[]; index: number; count: number }[] = [];
  let hidden = 0;
  for (const node of nodes) {
    const count = Math.min(maxSubs, Math.max(1, Math.ceil(node.guests.length / maxPer)));
    const kept = node.guests.slice(0, count * maxPer);
    hidden += node.guests.length - kept.length;
    const size = Math.ceil(kept.length / count) || 0;
    for (let i = 0; i < count; i++) {
      chunks.push({ node, guests: kept.slice(i * size, (i + 1) * size), index: i, count });
    }
  }

  const rooms: RoomPlace[] = chunks.map((c, i) => {
    const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const x = COLUMN_X0 + Math.floor(i / 2) * COLUMN_STEP;
    const z = side * ROOM_OFFSET;
    const n = c.guests.length;
    const span = Math.min((n - 1) * POD_STEP, Math.PI * 1.5);
    const outward = side > 0 ? Math.PI / 2 : -Math.PI / 2; // angle where z = sin(angle)
    const pods = c.guests.map((guest, j) => {
      const a = n <= 1 ? outward : outward - span / 2 + (j * span) / (n - 1);
      return { guest, x: x + Math.cos(a) * POD_DIST, z: z + Math.sin(a) * POD_DIST };
    });
    return {
      key: `${c.node.id}#${c.index}`,
      nodeId: c.node.id,
      label: c.node.name ? (c.count > 1 ? `${c.node.name} · ${c.index + 1}/${c.count}` : c.node.name) : '',
      x,
      z,
      side,
      pods,
    };
  });

  const lastX = rooms.length ? Math.max(...rooms.map((r) => r.x)) : COLUMN_X0;
  // Widest a fan reaches sideways (along x) from its room centre.
  const fanHalfSpan = (POD_STEP * (maxPer - 1)) / 2;
  const sideways = Math.max(ROOM_R, POD_DIST * Math.sin(Math.min(fanHalfSpan, Math.PI * 0.75)) + POD_R);
  return {
    rooms,
    spineEnd: lastX,
    reachX: lastX + sideways,
    halfZ: ROOM_OFFSET + POD_DIST + POD_R,
    hidden,
  };
}
