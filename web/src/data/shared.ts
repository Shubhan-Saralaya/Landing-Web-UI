// Shared services: infrastructure every ship depends on. Lives on the main ship.
// Public page — describe roles only, no private hostnames.

export interface SharedService {
  name: string;
  role: string;
  detail: string;
}

export const sharedServices: SharedService[] = [
  {
    name: 'Cloudflare',
    role: 'Edge & tunnels',
    detail: 'DNS, TLS and tunnels that bring public services in without opening ports.',
  },
  {
    name: 'Tailscale',
    role: 'Private mesh',
    detail: 'WireGuard mesh linking the nodes and my devices for admin access.',
  },
  {
    name: 'Google',
    role: 'Identity',
    detail: 'OAuth sign-in that grants clearance to restricted sectors.',
  },
];
