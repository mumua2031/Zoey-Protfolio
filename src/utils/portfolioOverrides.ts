import type { PortfolioImage, PortfolioProject } from "../data/portfolio";

export type EditablePortfolioImage = PortfolioImage & {
  enabled: boolean;
};

export type EditableProjectCopy = {
  name: string;
  nameEn: string;
  title: string;
  subtitle: string;
  intro: string;
  introEn: string;
  keywords: string[];
  hidden?: boolean;
  typography?: EditableProjectTypography;
};

export type EditableProjectTypography = {
  cnFontFamily: string;
  enFontFamily: string;
  cnTitleSize: number;
  enTitleSize: number;
  cnBodySize: number;
  enBodySize: number;
};

export const defaultProjectTypography: EditableProjectTypography = {
  cnFontFamily: "system",
  enFontFamily: "system",
  cnTitleSize: 1,
  enTitleSize: 1,
  cnBodySize: 1,
  enBodySize: 1,
};

type PortfolioOverrideEntry = {
  images?: EditablePortfolioImage[];
  copy?: EditableProjectCopy;
};

type PortfolioOverrideStore = Record<string, PortfolioOverrideEntry | EditablePortfolioImage[]>;
type IndexedProjectOverride = PortfolioOverrideEntry & {
  projectId: string;
  updatedAt: number;
};

export type LatestPortfolioOverrideStore = {
  version: number;
  updatedAt: string;
  projects: Record<string, Required<PortfolioOverrideEntry>>;
};

const STORAGE_KEY = "zoey-portfolio-artwork-overrides-v2";
const LEGACY_STORAGE_KEY = "zoey-portfolio-artwork-overrides-v1";
const DB_NAME = "zoey-portfolio-overrides";
const DB_VERSION = 1;
const DB_STORE_NAME = "project-overrides";
const latestOverrideCacheBust = () => `t=${Date.now()}`;
const stableStringify = (value: unknown) => JSON.stringify(value);

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);
const canUseIndexedDb = () => typeof window !== "undefined" && Boolean(window.indexedDB);

const openOverrideDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME, { keyPath: "projectId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readProjectFromIndexedDb = async (projectId: string) => {
  const db = await openOverrideDb();

  return new Promise<PortfolioOverrideEntry | undefined>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, "readonly");
    const store = transaction.objectStore(DB_STORE_NAME);
    const request = store.get(projectId);

    request.onsuccess = () => {
      const result = request.result as IndexedProjectOverride | undefined;
      resolve(result ? { images: result.images, copy: result.copy } : undefined);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

const readAllProjectsFromIndexedDb = async () => {
  const db = await openOverrideDb();

  return new Promise<IndexedProjectOverride[]>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, "readonly");
    const store = transaction.objectStore(DB_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as IndexedProjectOverride[]);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

const writeProjectToIndexedDb = async (
  projectId: string,
  images: EditablePortfolioImage[],
  copy: EditableProjectCopy,
) => {
  const db = await openOverrideDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DB_STORE_NAME);
    store.put({ projectId, images, copy, updatedAt: Date.now() } satisfies IndexedProjectOverride);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

const deleteProjectFromIndexedDb = async (projectId: string) => {
  const db = await openOverrideDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DB_STORE_NAME);
    store.delete(projectId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

const normalizeEntry = (
  entry?: PortfolioOverrideEntry | EditablePortfolioImage[],
): PortfolioOverrideEntry => {
  if (!entry) {
    return {};
  }

  return Array.isArray(entry) ? { images: entry } : entry;
};

const readLatestBackendStore = async (): Promise<LatestPortfolioOverrideStore | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const endpoints = [
    `/api/portfolio/overrides/latest?${latestOverrideCacheBust()}`,
    `/data/portfolioOverrides.latest.json?${latestOverrideCacheBust()}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      const store = await response.json() as LatestPortfolioOverrideStore;
      if (store && typeof store === "object" && store.projects) {
        return store;
      }
    } catch {
      // Try the next endpoint.
    }
  }

  return null;
};

export const syncProjectOverrideToBackend = async (
  projectId: string,
  images: EditablePortfolioImage[],
  copy: EditableProjectCopy,
  action = "project-save",
): Promise<{ images: EditablePortfolioImage[]; copy: EditableProjectCopy } | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/api/portfolio/sync-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        projectId,
        project: { images, copy },
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = await response.json() as {
      project?: { images: EditablePortfolioImage[]; copy: EditableProjectCopy };
    };
    return payload.project ?? null;
  } catch (error) {
    console.warn("[portfolio-sync] Backend sync failed.", error);
    return null;
  }
};

export const syncBrowserOverridesToBackend = async () => {
  const candidates = new Map<string, Required<PortfolioOverrideEntry>>();

  try {
    for (const record of await readAllProjectsFromIndexedDb()) {
      if (record.projectId && Array.isArray(record.images) && record.copy) {
        candidates.set(record.projectId, { images: record.images, copy: record.copy });
      }
    }
  } catch {
    // IndexedDB may not exist yet.
  }

  try {
    const store = readStore();
    for (const [projectId, entry] of Object.entries(store)) {
      const normalized = normalizeEntry(entry);
      if (!candidates.has(projectId) && Array.isArray(normalized.images) && normalized.copy) {
        candidates.set(projectId, { images: normalized.images, copy: normalized.copy });
      }
    }
  } catch {
    // localStorage may be unavailable.
  }

  const latest = await readLatestBackendStore();
  let syncedCount = 0;

  for (const [projectId, entry] of candidates.entries()) {
    if (stableStringify(latest?.projects?.[projectId]) === stableStringify(entry)) {
      continue;
    }

    const synced = await syncProjectOverrideToBackend(
      projectId,
      entry.images,
      entry.copy,
      "browser-cache-import",
    );
    if (synced) {
      await writeProjectToIndexedDb(projectId, synced.images, synced.copy);
      try {
        saveProjectOverride(projectId, synced.images, synced.copy);
      } catch {
        // Backend sync already succeeded.
      }
      syncedCount += 1;
    }
  }

  return syncedCount;
};

export const createPortfolioHistorySnapshot = async (action = "scheduled-snapshot") => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const response = await fetch("/api/portfolio/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    return response.ok;
  } catch (error) {
    console.warn("[portfolio-sync] Snapshot failed.", error);
    return false;
  }
};

export const listPortfolioHistoryVersions = async (): Promise<Array<{ archiveName: string; createdAt: string; action: string; kind?: string; projectId?: string }>> => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const response = await fetch(`/api/portfolio/history?${latestOverrideCacheBust()}`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json() as { versions?: Array<{ archiveName: string; createdAt: string; action: string; kind?: string; projectId?: string }> };
    return payload.versions ?? [];
  } catch {
    return [];
  }
};

export const rollbackPortfolioHistoryVersion = async (archiveName: string) => {
  const response = await fetch("/api/portfolio/rollback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archiveName }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
};

const readStore = (): PortfolioOverrideStore => {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PortfolioOverrideStore;
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return legacyRaw ? (JSON.parse(legacyRaw) as PortfolioOverrideStore) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: PortfolioOverrideStore) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const toEditableImages = (images: PortfolioImage[]): EditablePortfolioImage[] =>
  images.map((image) => ({
    ...image,
    enabled: true,
    type: image.type ?? "image",
    fit: image.fit ?? "contain",
    objectPosition: image.objectPosition ?? "center center",
    span: image.span ?? "auto",
    zoom: image.zoom ?? 1,
  }));

export const toEditableProjectCopy = (project: PortfolioProject): EditableProjectCopy => ({
  name: project.name,
  nameEn: project.nameEn,
  title: project.title,
  subtitle: project.subtitle,
  intro: project.intro,
  introEn: project.introEn,
  keywords: project.keywords,
  hidden: false,
  typography: defaultProjectTypography,
});

export const normalizeProjectCopy = (copy: EditableProjectCopy): EditableProjectCopy => ({
  ...copy,
  hidden: copy.hidden ?? false,
  typography: {
    ...defaultProjectTypography,
    ...(copy.typography ?? {}),
  },
});

export const getProjectOverride = (
  project: PortfolioProject,
): { images: EditablePortfolioImage[]; copy: EditableProjectCopy } => {
  const entry = normalizeEntry(readStore()[project.id]);

  return {
    images: Array.isArray(entry.images) ? entry.images : toEditableImages(project.images),
    copy: normalizeProjectCopy(entry.copy ?? toEditableProjectCopy(project)),
  };
};

export const getProjectOverrideAsync = async (
  project: PortfolioProject,
): Promise<{ images: EditablePortfolioImage[]; copy: EditableProjectCopy }> => {
  try {
    const latest = await readLatestBackendStore();
    const entry = normalizeEntry(latest?.projects?.[project.id]);
    if (Array.isArray(entry.images) || entry.copy) {
      return {
        images: Array.isArray(entry.images) ? entry.images : toEditableImages(project.images),
        copy: normalizeProjectCopy(entry.copy ?? toEditableProjectCopy(project)),
      };
    }
  } catch {
    // Fall through to browser-local storage.
  }

  try {
    const entry = normalizeEntry(await readProjectFromIndexedDb(project.id));
    if (Array.isArray(entry.images) || entry.copy) {
      return {
        images: Array.isArray(entry.images) ? entry.images : toEditableImages(project.images),
        copy: normalizeProjectCopy(entry.copy ?? toEditableProjectCopy(project)),
      };
    }
  } catch {
    // Fall through to the synchronous localStorage backup.
  }

  return getProjectOverride(project);
};

export const getProjectEditableImages = (
  projectId: string,
  fallbackImages: PortfolioImage[],
): EditablePortfolioImage[] => {
  const entry = normalizeEntry(readStore()[projectId]);
  return Array.isArray(entry.images) ? entry.images : toEditableImages(fallbackImages);
};

export const saveProjectOverride = (
  projectId: string,
  images: EditablePortfolioImage[],
  copy: EditableProjectCopy,
) => {
  const store = readStore();
  store[projectId] = { images, copy };
  writeStore(store);
};

export const saveProjectOverrideAsync = async (
  projectId: string,
  images: EditablePortfolioImage[],
  copy: EditableProjectCopy,
): Promise<{ images: EditablePortfolioImage[]; copy: EditableProjectCopy } | null> => {
  await writeProjectToIndexedDb(projectId, images, copy);

  try {
    saveProjectOverride(projectId, images, copy);
  } catch {
    // Large local image replacements can exceed localStorage; IndexedDB above is the source of truth.
  }

  const synced = await syncProjectOverrideToBackend(projectId, images, copy);
  if (synced) {
    await writeProjectToIndexedDb(projectId, synced.images, synced.copy);
    try {
      saveProjectOverride(projectId, synced.images, synced.copy);
    } catch {
      // The backend mirror has already persisted the content.
    }
    return synced;
  }

  return null;
};

export const saveProjectEditableImages = (
  projectId: string,
  images: EditablePortfolioImage[],
) => {
  const store = readStore();
  const entry = normalizeEntry(store[projectId]);
  store[projectId] = { ...entry, images };
  writeStore(store);
};

export const resetProjectOverride = (projectId: string) => {
  const store = readStore();
  delete store[projectId];
  writeStore(store);
};

export const resetProjectOverrideAsync = async (projectId: string) => {
  resetProjectOverride(projectId);
  try {
    await deleteProjectFromIndexedDb(projectId);
  } catch {
    // localStorage reset already ran; ignore unavailable IndexedDB.
  }
};

export const resetProjectEditableImages = resetProjectOverride;

export const getVisibleImages = (images: EditablePortfolioImage[]): PortfolioImage[] =>
  images
    .filter((image) => image.enabled)
    .map(({ enabled: _enabled, ...image }) => image);

export const exportProjectOverride = (
  projectId: string,
  images: EditablePortfolioImage[],
  copy: EditableProjectCopy,
) =>
  JSON.stringify(
    {
      projectId,
      copy,
      images,
    },
    null,
    2,
  );

export const exportProjectImages = (
  projectId: string,
  images: EditablePortfolioImage[],
) =>
  JSON.stringify(
    {
      projectId,
      images,
    },
    null,
    2,
  );
