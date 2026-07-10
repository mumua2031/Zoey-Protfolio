import {
  appendIncrementalArchive,
  createDailyArchive,
  createFullSnapshot,
  readLatestOverrides,
} from "./portfolio-history.mjs";

const mode = process.argv[2] ?? "incremental";
const latest = readLatestOverrides();

if (mode === "snapshot") {
  const archive = createFullSnapshot({ action: "manual-baseline-snapshot", latest });
  console.log(`Created baseline snapshot: ${archive.archiveName}`);
} else if (mode === "daily") {
  const archive = createDailyArchive({ action: "daily-merge", latest });
  console.log(`Created daily archive: ${archive.archiveName}`);
} else {
  const archive = appendIncrementalArchive({ action: "two-hour-incremental", latest });
  if (archive.skipped) {
    console.log("Skipped incremental backup: no changes since the latest archive.");
  } else {
    console.log(`Created incremental backup: ${archive.archiveName}`);
  }
}
