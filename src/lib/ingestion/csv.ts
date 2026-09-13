import type { NormalizedPlayerRecord } from "./types";
import { normalizePosition, splitDisplayName, normalizeName } from "./shared/normalize";

/** Parse operator CSV for permitted roster imports. */
export function parsePlayerCsv(csv: string): {
  records: NormalizedPlayerRecord[];
  errors: string[];
} {
  const lines = csv.trim().split(/\r?\n/);
  const errors: string[] = [];
  if (lines.length < 2) return { records: [], errors: ["CSV requires header + at least one row"] };

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const records: NormalizedPlayerRecord[] = [];
  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = splitCsvLine(line).map((c) => c.trim());
    const firstName =
      cols[idx("first_name")] || cols[idx("firstname")] || "";
    const lastName = cols[idx("last_name")] || cols[idx("lastname")] || "";
    const schoolName = cols[idx("school")] || cols[idx("school_name")] || "";
    const stateCode = (
      cols[idx("state")] ||
      cols[idx("state_code")] ||
      ""
    ).toUpperCase();
    const sourceUrl = cols[idx("source_url")] || cols[idx("url")] || undefined;

    if (!firstName || !lastName || !schoolName || !stateCode) {
      errors.push(`Row ${i + 2}: missing required first_name/last_name/school/state`);
      return;
    }
    if (!sourceUrl) {
      errors.push(`Row ${i + 2}: source_url recommended for provenance`);
    }

    const heightRaw = cols[idx("height")] || "";
    const heightInches = parseHeight(heightRaw);
    const weightLbs = Number(cols[idx("weight")]) || undefined;
    const classYear =
      Number(cols[idx("class_year")] || cols[idx("class")]) || undefined;
    const jerseyNumber =
      Number(cols[idx("jersey")] || cols[idx("jersey_number")]) || undefined;
    const seasonYear =
      Number(cols[idx("season_year")] || cols[idx("season")]) ||
      new Date().getFullYear();

    records.push({
      firstName: normalizeName(firstName),
      lastName: normalizeName(lastName),
      position: normalizePosition(cols[idx("position")]),
      classYear,
      jerseyNumber,
      heightInches,
      weightLbs,
      schoolName: normalizeName(schoolName),
      stateCode,
      seasonYear,
      sourceUrl,
      sourceName: cols[idx("source_name")] || "Manual CSV import",
      sourceType: "csv_import",
      sourceState: stateCode,
      sourceSchool: normalizeName(schoolName),
    });
  });

  return { records, errors };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function parseHeight(raw: string): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^(\d)\s*['′]\s*(\d{1,2})/);
  if (m) return Number(m[1]) * 12 + Number(m[2]);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function validateCsvPreview(records: NormalizedPlayerRecord[]) {
  return {
    count: records.length,
    states: [...new Set(records.map((r) => r.stateCode))],
    missingSourceUrl: records.filter((r) => !r.sourceUrl).length,
    sample: records.slice(0, 5),
  };
}

// re-export for callers that used splitDisplayName via csv historically
export { splitDisplayName };
