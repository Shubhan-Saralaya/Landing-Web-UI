export type Vec3 = [number, number, number];

/**
 * The station lies flat in the XZ plane: hub at the origin, side ships at the ends of the long X arms.
 * `focus` is where the camera aims (side ships fan their modules outward, so it sits past `position`);
 * `radius` is how much space the camera frames around it.
 */
export const SHIPS = {
  main: { position: [0, 0, 0] as Vec3, focus: [0, 0, 0] as Vec3, radius: 7 },
  projects: { position: [-15, 0, 0] as Vec3, focus: [-16.4, 0, 0] as Vec3, radius: 6 },
  homeserver: { position: [15, 0, 0] as Vec3, focus: [17.2, 0, 0] as Vec3, radius: 7.2 },
};

export const OVERVIEW = { focus: [0.5, 0, 0] as Vec3, radius: 21 };

/** Junction modules part-way along each X arm. */
export const JUNCTION_X = 8.2;

/** Octagonal modules are rotated so a flat face points along ±X/±Z; this is the centre-to-face distance. */
export const faceDist = (radius: number) => radius * Math.cos(Math.PI / 8);

/** `count` angles spread evenly over `span` radians, centred on `center` (XZ plane, 0 = +X). */
export function fanAngles(count: number, center: number, span: number): number[] {
  if (count <= 1) return [center];
  return Array.from({ length: count }, (_, i) => center - span / 2 + (i * span) / (count - 1));
}

export const polar = (angle: number, dist: number, origin: Vec3 = [0, 0, 0]): Vec3 => [
  origin[0] + Math.cos(angle) * dist,
  origin[1],
  origin[2] + Math.sin(angle) * dist,
];
