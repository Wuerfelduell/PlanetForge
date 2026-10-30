import type { ResourceId, SegmentState } from "../sim";

/**
 * Decoration per biome on empty segments (ids from the asset manifest) and the deposit each one
 * stands for: trees are the wood, the dune is the sand, a cactus holds water (Seb 2026-10-30:
 * "Kakteen geben Sand" was a logic error). Props without a resource never shrink.
 */
const PROPS: Partial<Record<string, [id: string, resource?: ResourceId][]>> = {
  forest: [["tree-a", "wood"], ["tree-b", "wood"], ["tree-c", "wood"]],
  savanna: [["acacia", "fiber"], ["bush-a", "food"], ["bush-b", "food"]],
  mountains: [["peak-a", "stone"], ["peak-b", "stone"], ["peak-c", "stone"]],
  ocean: [["wave-a", "water"], ["buoy", "food"], ["wave-b", "water"]],
  desert: [["cactus-a", "water"], ["dune", "sand"], ["cactus-b", "water"]],
  swamp: [["reed-a", "fiber"], ["mushroom", "food"], ["reed-b", "fiber"]],
  tundra: [["pine-snow-a", "wood"], ["ice-rock", "stone"], ["pine-snow-b", "wood"]],
  crystal: [["crystal-a", "aetherite"], ["crystal-b", "aetherite"], ["crystal-c", "aetherite"]],
  glacier: [["serac-a", "water"], ["ice-floe", "water"], ["serac-b", "water"]],
  lava: [["vent-a", "stone"], ["basalt", "stone"], ["vent-b", "stone"]],
  ash: [["ash-cone", "sand"], ["dead-tree", "wood"], ["ash-rock", "stone"]],
  "mushroom-forest": [["giant-mushroom-a"], ["giant-mushroom-b"]],
  "crystal-grotto": [["crystal-a"], ["crystal-b"]],
  "magma-lake": [["vent-a"], ["vent-b"]],
  "primal-sea": [["coral-a"], ["coral-b"]],
};

export interface Prop {
  /** Texture id, e.g. biome.desert.prop.dune. */
  id: string;
  /** How full the deposit behind it is: 1 full (or no such deposit), 0 used up. */
  fill: number;
}

/**
 * The prop a field shows: the one for what its inhabitants gather by hand, else one whose deposit
 * the field has, else any. Varies by field index so neighbours differ.
 */
export function propOf(segment: SegmentState): Prop | undefined {
  const all = PROPS[segment.biome];
  if (!all?.length) return undefined;
  const has = (r?: ResourceId) => !!r && segment.deposits.some((d) => d.resource === r);
  const gathered = all.filter(([, r]) => r && r === segment.gather && has(r));
  const present = all.filter(([, r]) => has(r));
  const pool = gathered.length ? gathered : present.length ? present : all;
  const [name, resource] = pool[(segment.index * 7) % pool.length]!;
  return { id: `biome.${segment.biome}.prop.${name}`, fill: fillOf(segment, resource) };
}

/** How full the deposit behind the field's prop is: 1 full (or no such deposit), 0 used up. */
export function propFill(segment: SegmentState): number {
  return propOf(segment)?.fill ?? 1;
}

function fillOf(segment: SegmentState, resource: ResourceId | undefined): number {
  const deposit = resource && segment.deposits.find((d) => d.resource === resource);
  if (!deposit || deposit.infinite || deposit.max <= 0) return 1;
  return Math.max(0, Math.min(1, deposit.amount / deposit.max));
}
