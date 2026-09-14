import { getLiveRankings, type RankedPlayerRow } from "@/lib/rankings";
import {
  NIL_SCORE_VERSION,
  scoreNilMarketability,
} from "@/lib/scoring/nil-provisional";
import type { RankingFilters } from "@/types/recruiting";

export type NilRankedRow = RankedPlayerRow;

/**
 * NIL Score leaderboard — same college roster pool as Tackle rankings,
 * rescored with provisional NIL marketability.
 */
export async function getNilRankings(
  filters: RankingFilters,
  limit = 50,
): Promise<{ rows: NilRankedRow[]; source: string; version: string }> {
  const { rows: base, source } = await getLiveRankings(filters, Math.max(limit * 3, 150));

  const rescored = base
    .map((row) => {
      const nil = scoreNilMarketability({
        division: row.player.division,
        conference: row.player.conference,
        position: row.player.position,
        transferPortalStatus: row.player.transferPortalStatus,
        collegeName: row.player.collegeName ?? row.player.school?.name,
      });
      return {
        ...row,
        score: nil.score,
        player: {
          ...row.player,
          tackleScore: {
            ...row.player.tackleScore,
            score: nil.score,
            confidence: nil.confidence,
            version: NIL_SCORE_VERSION,
          },
        },
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return { rows: rescored, source, version: NIL_SCORE_VERSION };
}
