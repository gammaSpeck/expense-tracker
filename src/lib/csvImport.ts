import Papa from "papaparse";
import type { ParsedCsv } from "@/types/csvImport";

const MAX_CSV_ROWS = 200_000;
// Generous enough for a legitimate 200,000-row file with long fields, small enough to bound
// the in-memory parsed array Papa Parse builds before `complete` fires (no streaming).
const MAX_CSV_FILE_BYTES = 50 * 1024 * 1024;

// "Account","Account" -> "Account","Account (2)" so the mapping dropdown stays unambiguous.
function dedupeHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((cell) => {
    const trimmed = cell.trim();
    const count = (seen.get(trimmed) ?? 0) + 1;
    seen.set(trimmed, count);
    return count === 1 ? trimmed : `${trimmed} (${count})`;
  });
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  if (!file.name.toLowerCase().endsWith(".csv"))
    return Promise.reject(new Error("File must be a .csv format"));

  if (file.size > MAX_CSV_FILE_BYTES)
    return Promise.reject(
      new Error("This file is too large to import. Please split it into smaller files."),
    );

  const { promise, resolve, reject } = Promise.withResolvers<ParsedCsv>();
  Papa.parse<string[]>(file, {
    header: false,
    skipEmptyLines: "greedy",
    complete: (results) => {
      if (results.errors.length > 0) {
        reject(new Error("Could not read this file as CSV"));
        return;
      }
      const rows = results.data;
      if (rows.length < 2 || rows[0].length === 0) {
        reject(new Error("This file appears to be empty or has no column headers"));
        return;
      }
      if (rows.length - 1 > MAX_CSV_ROWS) {
        reject(
          new Error(
            "This file is too large to import. Please split it into files under 200,000 rows.",
          ),
        );
        return;
      }
      resolve({
        headers: dedupeHeaders(rows[0]),
        rows: rows.slice(1),
        fileName: file.name,
        fileSize: file.size,
      });
    },
    error: () => reject(new Error("Could not read this file as CSV")),
  });
  return promise;
}
