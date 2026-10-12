export type Focus = 'overview' | 'main' | 'projects' | 'homeserver';
export const FOCI: Focus[] = ['overview', 'main', 'projects', 'homeserver'];

/**
 * Shape of server/data/homeserver.json. /api/homeserver (authenticated) returns it whole;
 * /api/homeserver/public returns it with every `url` stripped.
 */
export interface Guest {
  vmid: number;
  name: string;
  kind: 'lxc' | 'vm';
  status: 'running' | 'stopped';
  url?: string;
  description?: string;
}

export interface PveNode {
  id: string;
  name: string;
  /** Proxmox web UI (Tailscale-only). */
  url?: string;
  guests: Guest[];
}

export interface HomeserverData {
  datacenter: string;
  nodes: PveNode[];
}

/** Props shared by the 3D scene and the 2D fallback. */
export interface StationProps {
  focus: Focus;
  onSelect: (focus: Focus) => void;
  locked: boolean;
  /** Public map (no urls) while locked, full map once cleared; undefined if the server is unreachable. */
  homeserver?: HomeserverData;
}
