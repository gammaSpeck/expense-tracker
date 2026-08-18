// Tunable size/count ceilings pulled out of their call sites so they're visible and
// auditable in one place. This file is for genuine numeric limits only — domain data
// (category colors, currency lists, CSV source presets), UI sentinel values, and security
// parameters (crypto iteration counts) stay next to the code that uses them; moving those
// here would trade locality for no real benefit, or in the crypto case, be actively risky.

// csvImport.ts: parseCsvFile
// Generous enough for a legitimate 200,000-row file with long fields, small enough to bound
// the in-memory parsed array Papa Parse builds before `complete` fires (no streaming).
export const MAX_CSV_ROWS = 200_000;
export const MAX_CSV_FILE_BYTES = 50 * 1024 * 1024;

// CsvCategoryStep.tsx: IgnoreRuleValueField, CategoryValueList
// Above this many distinct values, per-value pickers (one Select/CommandItem each) stop
// rendering eagerly — hundreds of DOM controls for a high-cardinality column would block
// the wizard on large files. Bulk default-category assignment / manual typing takes over.
export const MAX_CSV_PICKER_VALUES = 200;

// CsvPreviewStep.tsx: how many matched rows the import preview table renders at once.
export const CSV_PREVIEW_ROW_COUNT = 20;

// TransactionsPage.tsx: useIncrementalReveal page size for the transaction list.
export const TRANSACTIONS_PAGE_SIZE = 100;

// telemetry.ts: captureError
// Message is capped, not allowlisted: full stable error-code taxonomy is a bigger design
// change (loses exact diagnostic text like the RangeError this feature exists to catch) --
// deferred pending a product decision.
export const MAX_TELEMETRY_MESSAGE_LENGTH = 300;
