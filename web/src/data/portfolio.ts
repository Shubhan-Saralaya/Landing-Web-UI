// Main ship content. Placeholder values — edit freely.

export const profile = {
  name: 'Shubhan',
  title: 'Software Engineer',
  tagline: 'I build software and run my own infrastructure.',
  /** Drop the file in web/public/ to enable the download button. Set to '' to hide it. */
  resumeUrl: '/resume.pdf',
};

export interface Experience {
  role: string;
  org: string;
  period: string;
  location?: string;
  points: string[];
}

export const experience: Experience[] = [
  {
    role: 'Software Engineer',
    org: 'Company Name',
    period: '2024 — Present',
    location: 'City, ST',
    points: [
      'Placeholder: what you built and the impact it had.',
      'Placeholder: a second highlight with a number in it.',
    ],
  },
  {
    role: 'Software Engineering Intern',
    org: 'Previous Company',
    period: '2023',
    points: ['Placeholder: internship highlight.'],
  },
];

export interface SkillGroup {
  group: string;
  items: string[];
}

export const skills: SkillGroup[] = [
  { group: 'Languages', items: ['TypeScript', 'Rust', 'Python', 'SQL'] },
  { group: 'Frontend', items: ['React', 'Vite', 'Three.js'] },
  { group: 'Backend', items: ['axum', 'Node.js', 'REST', 'OAuth'] },
  { group: 'Infrastructure', items: ['Proxmox', 'LXC', 'Docker', 'Linux', 'Cloudflare', 'Tailscale'] },
];

export interface Contact {
  label: string;
  handle: string;
  href: string;
}

export const contacts: Contact[] = [
  { label: 'GitHub', handle: '@your-handle', href: 'https://github.com/your-handle' },
  { label: 'LinkedIn', handle: 'in/your-handle', href: 'https://www.linkedin.com/in/your-handle' },
  { label: 'Email', handle: 'hello@shubhanx86.com', href: 'mailto:hello@shubhanx86.com' },
];
