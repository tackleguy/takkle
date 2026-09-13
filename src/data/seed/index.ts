import type { Player, School, SeedManifest } from "@/types/recruiting";
import manifest from "./manifest.json";
import schoolsData from "./schools.json";
import ncesSchoolsSample from "./schools-nces-sample.json";
import cfbdSample from "./players-cfbd-sample.json";
import cfbdManifest from "./players-cfbd-manifest.json";
import chunk0 from "./players-chunk-0.json";
import chunk1 from "./players-chunk-1.json";
import chunk2 from "./players-chunk-2.json";
import chunk3 from "./players-chunk-3.json";
import chunk4 from "./players-chunk-4.json";
import chunk5 from "./players-chunk-5.json";

export const seedManifest = manifest as SeedManifest;
export const cfbdSeedManifest = cfbdManifest as SeedManifest;
export const seedSchools = schoolsData as School[];
export const ncesSampleSchools = ncesSchoolsSample as School[];
export const cfbdSamplePlayers = cfbdSample as Player[];

const allChunks = [chunk0, chunk1, chunk2, chunk3, chunk4, chunk5] as Player[][];

let _playersCache: Player[] | null = null;

export function getAllPlayers(): Player[] {
  if (!_playersCache) {
    _playersCache = allChunks.flat();
  }
  return _playersCache;
}

export function getCfbdSamplePlayers(): Player[] {
  return cfbdSamplePlayers;
}

/** Synthetic seed schools (demo players). Prefer getNcesSampleSchools for real CCD. */
export function getSchools(): School[] {
  return seedSchools;
}

export function getNcesSampleSchools(): School[] {
  return ncesSampleSchools;
}
