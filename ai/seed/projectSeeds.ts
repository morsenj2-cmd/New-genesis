import { createHash } from "crypto";

export interface ProjectSeeds {
  baseSeed: string;
  layoutSeed: string;
  styleSeed: string;
  componentSeed: string;
  spacingSeed: string;
  interactionSeed: string;
}

const SALTS: Record<keyof Omit<ProjectSeeds, "baseSeed">, string> = {
  layoutSeed: "layout::structure::v1",
  styleSeed: "style::palette::v1",
  componentSeed: "component::variant::v1",
  spacingSeed: "spacing::rhythm::v1",
  interactionSeed: "interaction::motion::v1",
};

function deriveSeed(baseSeed: string, salt: string): string {
  return createHash("sha256")
    .update(baseSeed + "|" + salt)
    .digest("hex");
}

export function generateProjectSeeds(baseSeed: string): ProjectSeeds {
  if (!baseSeed || baseSeed.length < 8) {
    throw new Error("baseSeed must be at least 8 characters");
  }

  return {
    baseSeed,
    layoutSeed: deriveSeed(baseSeed, SALTS.layoutSeed),
    styleSeed: deriveSeed(baseSeed, SALTS.styleSeed),
    componentSeed: deriveSeed(baseSeed, SALTS.componentSeed),
    spacingSeed: deriveSeed(baseSeed, SALTS.spacingSeed),
    interactionSeed: deriveSeed(baseSeed, SALTS.interactionSeed),
  };
}
