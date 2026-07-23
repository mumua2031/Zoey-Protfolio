import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";

const projectRoot = process.cwd();
const configPath = join(projectRoot, "portfolio-backup.config.json");
const latestPath = join(projectRoot, "src", "data", "portfolioOverrides.latest.json");
const latestPublicPath = join(projectRoot, "public", "data", "portfolioOverrides.latest.json");

const defaultConfig = {
  archiveRoot: "D:\\作品集项目历史版本归档",
  snapshot: { frequency: "manual-or-baseline", retain: 24 },
  incremental: { frequency: "PT2H", retain: 720 },
  daily: { frequency: "P1D", retain: 90 },
};

export const readBackupConfig = () => {
  if (!existsSync(configPath)) {
    return defaultConfig;
  }

  return {
    ...defaultConfig,
    ...JSON.parse(readFileSync(configPath, "utf8")),
  };
};

export const backupConfig = readBackupConfig();
export const archiveRoot = backupConfig.archiveRoot;
export const archiveIndexPath = join(archiveRoot, "index.json");

const kindDirs = {
  snapshot: "snapshots",
  incremental: "incremental",
  daily: "daily",
};

const emptyLatest = () => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  projects: {},
});

const ensureDir = (path) => mkdirSync(path, { recursive: true });

export const writeJson = (path, value) => {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const readLatestOverrides = () => {
  try {
    if (existsSync(latestPath)) {
      return JSON.parse(readFileSync(latestPath, "utf8"));
    }
  } catch {
    return emptyLatest();
  }

  return emptyLatest();
};

export const writeLatestOverrides = (latest) => {
  writeJson(latestPath, latest);
  writeJson(latestPublicPath, latest);
};

export const nowStamp = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const allArchiveNames = () => {
  const names = new Set();
  if (!existsSync(archiveRoot)) return names;

  for (const entry of readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    names.add(entry.name);
    const kind = Object.values(kindDirs).includes(entry.name);
    if (!kind) continue;

    const kindRoot = join(archiveRoot, entry.name);
    for (const child of readdirSync(kindRoot, { withFileTypes: true })) {
      if (child.isDirectory()) names.add(child.name);
    }
  }

  return names;
};

const makeUniqueArchiveName = () => {
  const stamp = nowStamp();
  const names = allArchiveNames();
  let archiveName = stamp;
  let suffix = 1;

  while (names.has(archiveName)) {
    archiveName = `${stamp}-${String(suffix).padStart(2, "0")}`;
    suffix += 1;
  }

  return archiveName;
};

const readHistoryIndex = () => {
  if (!existsSync(archiveIndexPath)) {
    return { updatedAt: null, versions: [] };
  }

  try {
    const index = JSON.parse(readFileSync(archiveIndexPath, "utf8"));
    return { updatedAt: index.updatedAt ?? null, versions: Array.isArray(index.versions) ? index.versions : [] };
  } catch {
    return { updatedAt: null, versions: [] };
  }
};

const writeHistoryIndex = (versions) => {
  writeJson(archiveIndexPath, {
    updatedAt: new Date().toISOString(),
    configFile: "portfolio-backup.config.json",
    layout: {
      snapshots: kindDirs.snapshot,
      incremental: kindDirs.incremental,
      daily: kindDirs.daily,
    },
    versions,
  });
};

const noisyHistoryActionPrefixes = [
  "browser-cache-import",
  "rollback:",
  "scheduled-snapshot",
  "self-test",
  "two-hour-script-snapshot",
];

const isNoisyHistoryAction = (action = "") =>
  noisyHistoryActionPrefixes.some((prefix) => action.startsWith(prefix));

const compactHistoryVersions = (versions) => {
  const seenProjectIncrement = new Set();
  let snapshotCount = 0;
  let dailyCount = 0;
  const snapshotRetain = Number(backupConfig.snapshot?.retain ?? 24);
  const dailyRetain = Number(backupConfig.daily?.retain ?? 90);

  return versions.filter((record) => {
    const action = String(record.action ?? "");
    if (isNoisyHistoryAction(action)) {
      return false;
    }

    if (record.kind === "snapshot") {
      snapshotCount += 1;
      return snapshotCount <= snapshotRetain;
    }

    if (record.kind === "daily") {
      dailyCount += 1;
      return dailyCount <= dailyRetain;
    }

    if (record.kind === "incremental") {
      const key = `${record.projectId ?? "global"}:${action}`;
      if (seenProjectIncrement.has(key)) {
        return false;
      }
      seenProjectIncrement.add(key);
    }

    return true;
  });
};

export const listHistoryVersions = () => {
  const index = readHistoryIndex();
  return {
    ...index,
    versions: compactHistoryVersions(index.versions),
  };
};

const addHistoryRecord = (record) => {
  const previousIndex = readHistoryIndex();
  writeHistoryIndex([record, ...previousIndex.versions]);
  return record;
};

const findRecord = (archiveName) =>
  readHistoryIndex().versions.find((record) => record.archiveName === archiveName || record.id === archiveName);

const versionDir = (record) => {
  if (record.kind && kindDirs[record.kind]) {
    return join(archiveRoot, kindDirs[record.kind], record.archiveName);
  }

  return join(archiveRoot, record.archiveName);
};

const stableStringify = (value) => JSON.stringify(value);

const clone = (value) => JSON.parse(JSON.stringify(value));

const latestSnapshotRecord = () =>
  readHistoryIndex().versions.find((record) => record.kind === "snapshot");

const latestRecord = () =>
  readHistoryIndex().versions.find((record) => record.kind === "incremental" || record.kind === "daily" || record.kind === "snapshot" || record.latestFile);

export const createFullSnapshot = ({ action = "manual-snapshot", latest = readLatestOverrides() } = {}) => {
  ensureDir(join(archiveRoot, kindDirs.snapshot));
  const archiveName = makeUniqueArchiveName();
  const archiveDir = join(archiveRoot, kindDirs.snapshot, archiveName);
  ensureDir(archiveDir);

  const record = {
    id: archiveName,
    archiveName,
    kind: "snapshot",
    action,
    createdAt: new Date().toISOString(),
    dir: `${kindDirs.snapshot}/${archiveName}`,
    latestFile: "latest-overrides.json",
  };

  writeJson(join(archiveDir, "latest-overrides.json"), latest);
  writeJson(join(archiveDir, "meta.json"), record);
  writeFileSync(
    join(archiveDir, "README.md"),
    [
      `# ${archiveName}`,
      "",
      `Kind: snapshot`,
      `Action: ${action}`,
      `Created at: ${record.createdAt}`,
      "",
      "Full baseline snapshot for incremental rollback.",
      "",
    ].join("\n"),
    "utf8",
  );

  return addHistoryRecord(record);
};

const ensureBaselineSnapshot = (latest) => latestSnapshotRecord() ?? createFullSnapshot({ action: "baseline-snapshot", latest });

const changedProjectDiff = (previous, latest) => {
  const projects = {};
  const deletedProjectIds = [];
  const allIds = new Set([...Object.keys(previous.projects ?? {}), ...Object.keys(latest.projects ?? {})]);

  for (const projectId of allIds) {
    if (!(projectId in (latest.projects ?? {}))) {
      deletedProjectIds.push(projectId);
      continue;
    }

    if (stableStringify(previous.projects?.[projectId]) !== stableStringify(latest.projects?.[projectId])) {
      projects[projectId] = latest.projects[projectId];
    }
  }

  return { projects, deletedProjectIds };
};

const applyDiff = (latest, diff) => {
  const next = clone(latest);

  for (const projectId of diff.changes?.deletedProjectIds ?? []) {
    delete next.projects[projectId];
  }

  for (const [projectId, project] of Object.entries(diff.changes?.projects ?? {})) {
    next.projects[projectId] = project;
  }

  next.version = diff.targetVersion ?? next.version + 1;
  next.updatedAt = diff.targetUpdatedAt ?? diff.createdAt ?? new Date().toISOString();
  return next;
};

export const restoreHistoryVersion = (archiveName) => {
  const record = findRecord(archiveName);
  if (!record) {
    const legacyPath = join(archiveRoot, archiveName, "latest-overrides.json");
    if (existsSync(legacyPath)) {
      return JSON.parse(readFileSync(legacyPath, "utf8"));
    }
    throw new Error("Archive version was not found.");
  }

  if (record.kind === "snapshot" || record.kind === "daily" || !record.kind) {
    const latestFile = join(versionDir(record), record.latestFile ?? "latest-overrides.json");
    if (!existsSync(latestFile)) {
      throw new Error("Archive latest file was not found.");
    }
    return JSON.parse(readFileSync(latestFile, "utf8"));
  }

  if (record.kind !== "incremental") {
    throw new Error("Unsupported archive version kind.");
  }

  const index = readHistoryIndex();
  const baseRecord = index.versions.find((candidate) => candidate.archiveName === record.baseSnapshotId || candidate.id === record.baseSnapshotId);
  if (!baseRecord) {
    throw new Error("Incremental base snapshot was not found.");
  }

  let latest = restoreHistoryVersion(baseRecord.archiveName);
  const increments = index.versions
    .filter((candidate) => candidate.kind === "incremental" && candidate.baseSnapshotId === record.baseSnapshotId)
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));

  for (const increment of increments) {
    const diffPath = join(versionDir(increment), increment.diffFile ?? "diff.json");
    if (!existsSync(diffPath)) continue;
    latest = applyDiff(latest, JSON.parse(readFileSync(diffPath, "utf8")));
    if (increment.archiveName === record.archiveName) {
      break;
    }
  }

  return latest;
};

export const appendIncrementalArchive = ({
  action = "project-save",
  projectId,
  previous,
  latest = readLatestOverrides(),
  changedProjects,
} = {}) => {
  ensureDir(join(archiveRoot, kindDirs.incremental));
  const previousLatest = previous ?? (latestRecord() ? restoreHistoryVersion(latestRecord().archiveName) : latest);
  const baseSnapshot = ensureBaselineSnapshot(previousLatest);
  const diff = {
    projects: changedProjects ?? changedProjectDiff(previousLatest, latest).projects,
    deletedProjectIds: changedProjectDiff(previousLatest, latest).deletedProjectIds,
  };

  if (!Object.keys(diff.projects).length && !diff.deletedProjectIds.length) {
    return {
      archiveName: null,
      kind: "incremental",
      action,
      skipped: true,
      reason: "no-changes",
    };
  }

  const archiveName = makeUniqueArchiveName();
  const archiveDir = join(archiveRoot, kindDirs.incremental, archiveName);
  ensureDir(archiveDir);

  const parent = latestRecord();
  const record = {
    id: archiveName,
    archiveName,
    kind: "incremental",
    action,
    projectId,
    createdAt: new Date().toISOString(),
    dir: `${kindDirs.incremental}/${archiveName}`,
    diffFile: "diff.json",
    baseSnapshotId: baseSnapshot.archiveName,
    parentVersionId: parent?.archiveName,
    changedProjectIds: Object.keys(diff.projects),
    deletedProjectIds: diff.deletedProjectIds,
  };

  writeJson(join(archiveDir, "diff.json"), {
    version: 1,
    createdAt: record.createdAt,
    action,
    projectId,
    baseSnapshotId: record.baseSnapshotId,
    parentVersionId: record.parentVersionId,
    targetVersion: latest.version,
    targetUpdatedAt: latest.updatedAt,
    changes: diff,
  });
  writeJson(join(archiveDir, "meta.json"), record);
  writeFileSync(
    join(archiveDir, "README.md"),
    [
      `# ${archiveName}`,
      "",
      `Kind: incremental`,
      `Action: ${action}`,
      projectId ? `Project ID: ${projectId}` : undefined,
      `Base snapshot: ${record.baseSnapshotId}`,
      `Created at: ${record.createdAt}`,
      "",
      "Diff archive. Rollback rebuilds baseline plus incrementals automatically.",
      "",
    ].filter(Boolean).join("\n"),
    "utf8",
  );

  return addHistoryRecord(record);
};

export const createDailyArchive = ({ action = "daily-merge", latest } = {}) => {
  ensureDir(join(archiveRoot, kindDirs.daily));
  const materialized = latest ?? (latestRecord() ? restoreHistoryVersion(latestRecord().archiveName) : readLatestOverrides());
  const archiveName = makeUniqueArchiveName();
  const archiveDir = join(archiveRoot, kindDirs.daily, archiveName);
  ensureDir(archiveDir);

  const record = {
    id: archiveName,
    archiveName,
    kind: "daily",
    action,
    createdAt: new Date().toISOString(),
    dir: `${kindDirs.daily}/${archiveName}`,
    latestFile: "latest-overrides.json",
  };

  writeJson(join(archiveDir, "latest-overrides.json"), materialized);
  writeJson(join(archiveDir, "meta.json"), record);
  return addHistoryRecord(record);
};

export const archiveRollback = ({ archiveName, latest }) =>
  appendIncrementalArchive({
    action: `rollback:${archiveName}`,
    previous: readLatestOverrides(),
    latest,
  });
