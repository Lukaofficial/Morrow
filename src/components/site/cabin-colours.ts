import { CabinClass } from "@/lib/formation";

/** Each class keeps one ink throughout the site, from the brochure to the berth map. */
export const CabinColours: Record<CabinClass, string> = {
  seat: "#a9dcf2",
  couchette: "#97e3cf",
  sleeper: "#ffcf4d",
  suite: "#ff9d9a",
};
