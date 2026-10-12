// Shipyard: open projects that will be self-hosted on the homeserver. Placeholders.

export interface Project {
  name: string;
  status: 'in-construction' | 'planned' | 'launched';
  blurb: string;
  tags: string[];
  /** Set once it's live. */
  url?: string;
  repo?: string;
}

export const projects: Project[] = [
  {
    name: 'Project Alpha',
    status: 'in-construction',
    blurb: 'Placeholder: a short pitch for the first project.',
    tags: ['Rust', 'Web'],
  },
  {
    name: 'Project Beta',
    status: 'planned',
    blurb: 'Placeholder: another idea queued for the shipyard.',
    tags: ['React'],
  },
  {
    name: 'Project Gamma',
    status: 'planned',
    blurb: 'Placeholder: something that will run on the homeserver.',
    tags: ['Self-hosted'],
  },
];
