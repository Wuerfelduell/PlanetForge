import type { ResourceId, SegmentState } from "../sim";

/** The deposit a biome's props stand for: trees are the wood, peaks the stone, and so on. */
const PROP_RESOURCE: Partial<Record<string, ResourceId>> = {
  forest: "wood",
  savanna: "food",
  mountains: "stone",
  desert: "sand",
  swamp: "clay",
  tundra: "stone",
  crystal: "aetherite",
};

/** How full the deposit behind a segment's prop is: 1 full (or no such deposit), 0 used up. */
export function propFill(segment: SegmentState): number {
  const resource = PROP_RESOURCE[segment.biome];
  const deposit = resource && segment.deposits.find((d) => d.resource === resource);
  if (!deposit || deposit.infinite || deposit.max <= 0) return 1;
  return Math.max(0, Math.min(1, deposit.amount / deposit.max));
}
