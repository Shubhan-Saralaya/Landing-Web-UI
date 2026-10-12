// Shared services: infrastructure every ship depends on. Lives on the main ship.
// Public page — describe roles only, no private hostnames.

import type { CustomLogo } from '../types';

/** The hub shows up to this many shared services on its roofs (two arm modules, two junctions). */
export const MAX_SHARED_LOGOS = 4;

export interface SharedService {
  name: string;
  /** Built-in logo id (scene/logos.ts) or a custom { path, color? }; omitted: matched from `name`. */
  logo?: string | CustomLogo;
  role: string;
  detail: string;
}

export const sharedServices: SharedService[] = [
  {
    name: 'Cloudflare',
    logo: 'cloudflare',
    role: 'Edge & tunnels',
    detail: 'DNS, TLS and tunnels that bring public services in without opening ports.',
  },
  {
    name: 'Tailscale',
    logo: 'tailscale',
    role: 'Private mesh',
    detail: 'WireGuard mesh linking the nodes and my devices for admin access.',
  },
  {
    name: 'Google',
    logo: 'google',
    role: 'Identity',
    detail: 'OAuth sign-in that grants clearance to restricted sectors.',
  },
];
