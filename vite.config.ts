import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, sep } from "node:path";
import { promisify } from "node:util";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import VitePluginImageCompress from "vite-plugin-image-compress";
import {
  appendIncrementalArchive,
  archiveRollback,
  createDailyArchive,
  createFullSnapshot,
  listHistoryVersions,
  restoreHistoryVersion,
  writeLatestOverrides,
} from "./scripts/portfolio-history.mjs";

type PortfolioImageOverride = {
  src: string;
  alt: string;
  caption: string;
  type?: "image" | "video";
  fit?: "cover" | "contain";
  objectPosition?: string;
  span?: "auto" | "full" | "wide" | "half" | "tall" | "square";
  zoom?: number;
  gridStart?: number;
  gridSpan?: number;
  layoutRatio?: number;
  enabled?: boolean;
};

type ProjectOverride = {
  images: PortfolioImageOverride[];
  copy: {
    name: string;
    nameEn: string;
    title: string;
    subtitle: string;
    intro: string;
    introEn: string;
    keywords: string[];
    hidden?: boolean;
    typography?: Record<string, string | number>;
  };
};

type LatestOverrides = {
  version: number;
  updatedAt: string;
  projects: Record<string, ProjectOverride>;
};

type InfoElementOffset = {
  x?: number;
  y?: number;
};

type InfoTextOverrides = Record<string, {
  title?: string;
  body?: string;
  mediaSrc?: string;
  mediaAlt?: string;
  mediaHidden?: boolean;
  copyOffset?: InfoElementOffset;
  mediaOffset?: InfoElementOffset;
}>;

type LatestInfoTextOverrides = {
  version: number;
  updatedAt: string;
  overrides: InfoTextOverrides;
};

const projectRoot = process.cwd();
const execFileAsync = promisify(execFile);
const publicDir = join(projectRoot, "public");
const latestSrcPath = join(projectRoot, "src", "data", "portfolioOverrides.latest.json");
const latestPublicPath = join(publicDir, "data", "portfolioOverrides.latest.json");
const infoTextLatestSrcPath = join(projectRoot, "src", "data", "infoTextOverrides.latest.json");
const infoTextLatestPublicPath = join(publicDir, "data", "infoTextOverrides.latest.json");
const archiveRoot = "D:\\作品集项目历史版本归档";
const archiveIndexPath = join(archiveRoot, "index.json");
const userAssetDir = join(publicDir, "assets", "user-overrides");
const maxProjectImages = 240;
const maxPayloadBytes = 260 * 1024 * 1024;
const publishTrackedPaths = [
  "src/data/portfolioOverrides.latest.json",
  "public/data/portfolioOverrides.latest.json",
  "src/data/infoTextOverrides.latest.json",
  "public/data/infoTextOverrides.latest.json",
  "public/assets/user-overrides",
];
const allowedAssetExtensions = new Set([
  ".avif",
  ".gif",
  ".glb",
  ".jpeg",
  ".jpg",
  ".mp4",
  ".png",
  ".svg",
  ".webm",
  ".webp",
]);

const jsonResponse = (res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, statusCode: number, body: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body, null, 2));
};

const ensureDir = (path: string) => mkdirSync(path, { recursive: true });

const readRequestBody = (req: NodeJS.ReadableStream) =>
  new Promise<string>((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maxPayloadBytes) {
        reject(new Error("Payload is too large."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const nowStamp = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
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

const makeUniqueArchiveDir = () => {
  const stamp = nowStamp();
  let archiveDir = join(archiveRoot, stamp);
  let suffix = 1;

  while (existsSync(archiveDir)) {
    archiveDir = join(archiveRoot, `${stamp}-${String(suffix).padStart(2, "0")}`);
    suffix += 1;
  }

  return archiveDir;
};

const readLatestOverrides = (): LatestOverrides => {
  try {
    if (existsSync(latestSrcPath)) {
      return JSON.parse(readFileSync(latestSrcPath, "utf8")) as LatestOverrides;
    }
  } catch {
    // Continue with an empty store if the latest mirror is unreadable.
  }

  return { version: 1, updatedAt: new Date(0).toISOString(), projects: {} };
};

const readLatestInfoTextOverrides = (): LatestInfoTextOverrides => {
  try {
    if (existsSync(infoTextLatestSrcPath)) {
      const latest = JSON.parse(readFileSync(infoTextLatestSrcPath, "utf8")) as LatestInfoTextOverrides;
      if (latest && typeof latest === "object" && latest.overrides) {
        return latest;
      }
    }
  } catch {
    // Continue with an empty store if the latest mirror is unreadable.
  }

  return { version: 1, updatedAt: new Date(0).toISOString(), overrides: {} };
};

const writeJson = (path: string, value: unknown) => {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeLatestInfoTextOverrides = (latest: LatestInfoTextOverrides) => {
  writeJson(infoTextLatestSrcPath, latest);
  writeJson(infoTextLatestPublicPath, latest);
};

const mimeExtension = (mime: string) => {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/svg+xml") return ".svg";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/webm") return ".webm";
  return "";
};

const hashBuffer = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");

let assetHashIndex: Map<string, string> | null = null;

const buildAssetHashIndex = () => {
  const index = new Map<string, string>();
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const extension = extname(entry.name).toLowerCase();
      if (!allowedAssetExtensions.has(extension)) continue;

      const hash = hashBuffer(readFileSync(fullPath));
      const publicPath = `/${relative(publicDir, fullPath).split(sep).join("/")}`;
      index.set(hash, publicPath);
    }
  };

  walk(join(publicDir, "assets"));
  return index;
};

const getAssetHashIndex = () => {
  assetHashIndex ??= buildAssetHashIndex();
  return assetHashIndex;
};

const persistDataUrl = (src: string) => {
  const match = src.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Unsupported media data URL.");
  }

  const [, mime, base64] = match;
  const extension = mimeExtension(mime);
  if (!extension) {
    throw new Error(`Unsupported media type: ${mime}`);
  }

  const buffer = Buffer.from(base64, "base64");
  const hash = hashBuffer(buffer);
  const existingPath = getAssetHashIndex().get(hash);

  if (existingPath) {
    return existingPath;
  }

  ensureDir(userAssetDir);
  const filename = `${hash.slice(0, 20)}${extension}`;
  const assetPath = join(userAssetDir, filename);
  writeFileSync(assetPath, buffer);

  const publicPath = `/assets/user-overrides/${filename}`;
  getAssetHashIndex().set(hash, publicPath);
  return publicPath;
};

const normalizeSrc = (src: string) => {
  if (!src) return "";
  if (src.startsWith("data:")) return persistDataUrl(src);
  if (src.startsWith("/assets/") || src.startsWith("./assets/") || src.startsWith("assets/")) {
    return src.startsWith("/") ? src : `/${src.replace(/^\.\//, "")}`;
  }
  if (src.startsWith("http://127.0.0.1") || src.startsWith("http://localhost")) {
    const url = new URL(src);
    return url.pathname;
  }
  if (/^https?:\/\//.test(src)) {
    throw new Error("Remote media URLs are blocked. Please upload the asset into the project.");
  }
  return src;
};

const validateProjectOverride = (projectId: string, project: ProjectOverride) => {
  if (!/^[-a-zA-Z0-9_]+$/.test(projectId)) {
    throw new Error("Invalid project id.");
  }
  if (!project || !Array.isArray(project.images) || typeof project.copy !== "object") {
    throw new Error("Invalid project override payload.");
  }
  if (project.images.length > maxProjectImages) {
    throw new Error(`Too many images for one project. Limit is ${maxProjectImages}.`);
  }
  if (!project.copy.name || !project.copy.nameEn || !project.copy.title) {
    throw new Error("Project copy requires name, nameEn, and title.");
  }
  if (!Array.isArray(project.copy.keywords)) {
    throw new Error("Project keywords must be an array.");
  }
};

const validateInfoTextOverrides = (overrides: InfoTextOverrides) => {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new Error("Invalid info text override payload.");
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (!/^(about|experience|services):(cn|en):[-A-Za-z0-9_]+$/.test(key)) {
      throw new Error(`Invalid info text override key: ${key}`);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Invalid info text override value: ${key}`);
    }
    if (value.title !== undefined && typeof value.title !== "string") {
      throw new Error(`Invalid info text title: ${key}`);
    }
    if (value.body !== undefined && typeof value.body !== "string") {
      throw new Error(`Invalid info text body: ${key}`);
    }
    if (value.mediaSrc !== undefined && typeof value.mediaSrc !== "string") {
      throw new Error(`Invalid info media source: ${key}`);
    }
    if (value.mediaAlt !== undefined && typeof value.mediaAlt !== "string") {
      throw new Error(`Invalid info media alt: ${key}`);
    }
    if (value.mediaHidden !== undefined && typeof value.mediaHidden !== "boolean") {
      throw new Error(`Invalid info media hidden flag: ${key}`);
    }
    for (const offset of [value.copyOffset, value.mediaOffset]) {
      if (offset === undefined) continue;
      if (!offset || typeof offset !== "object" || Array.isArray(offset)) {
        throw new Error(`Invalid info element offset: ${key}`);
      }
      if (offset.x !== undefined && typeof offset.x !== "number") {
        throw new Error(`Invalid info element x offset: ${key}`);
      }
      if (offset.y !== undefined && typeof offset.y !== "number") {
        throw new Error(`Invalid info element y offset: ${key}`);
      }
    }
  }
};

const normalizeInfoTextOverrides = (overrides: InfoTextOverrides): InfoTextOverrides =>
  Object.fromEntries(
    Object.entries(overrides)
      .map(([key, value]) => [
        key,
        {
          ...(typeof value.title === "string" ? { title: value.title } : {}),
          ...(typeof value.body === "string" ? { body: value.body } : {}),
          ...(typeof value.mediaSrc === "string" ? { mediaSrc: normalizeSrc(value.mediaSrc) } : {}),
          ...(typeof value.mediaAlt === "string" ? { mediaAlt: value.mediaAlt } : {}),
          ...(typeof value.mediaHidden === "boolean" ? { mediaHidden: value.mediaHidden } : {}),
          ...(value.copyOffset ? { copyOffset: { x: value.copyOffset.x ?? 0, y: value.copyOffset.y ?? 0 } } : {}),
          ...(value.mediaOffset ? { mediaOffset: { x: value.mediaOffset.x ?? 0, y: value.mediaOffset.y ?? 0 } } : {}),
        },
      ])
      .filter(([, value]) => {
        const entry = value as {
          title?: string;
          body?: string;
          mediaSrc?: string;
          mediaAlt?: string;
          mediaHidden?: boolean;
          copyOffset?: InfoElementOffset;
          mediaOffset?: InfoElementOffset;
        };
        return Boolean(
          entry.title ||
          entry.body ||
          entry.mediaSrc ||
          entry.mediaAlt ||
          entry.mediaHidden !== undefined ||
          entry.copyOffset ||
          entry.mediaOffset
        );
      }),
  );

const normalizeProjectOverride = (project: ProjectOverride): ProjectOverride => ({
  ...project,
  copy: {
    ...project.copy,
    keywords: project.copy.keywords.map((keyword) => String(keyword).trim()).filter(Boolean),
  },
  images: project.images.map((image) => ({
    ...image,
    src: normalizeSrc(image.src),
    alt: image.alt ?? "",
    caption: image.caption ?? "",
    enabled: image.enabled ?? true,
    type: image.type ?? "image",
    fit: image.fit ?? "contain",
    objectPosition: image.objectPosition ?? "center center",
    span: image.span ?? "auto",
    zoom: typeof image.zoom === "number" ? image.zoom : 1,
  })),
});

const stableStringify = (value: unknown) => JSON.stringify(value);

const appendArchive = (payload: {
  action: string;
  projectId?: string;
  latest: LatestOverrides;
  project?: ProjectOverride;
}) => {
  ensureDir(archiveRoot);
  const archiveDir = makeUniqueArchiveDir();
  ensureDir(archiveDir);

  const archiveName = archiveDir.split(sep).pop() ?? nowStamp();
  const record = {
    archiveName,
    action: payload.action,
    projectId: payload.projectId,
    createdAt: new Date().toISOString(),
    latestFile: "latest-overrides.json",
    projectFile: payload.project ? "project-overrides.json" : undefined,
  };

  writeJson(join(archiveDir, "latest-overrides.json"), payload.latest);
  if (payload.project) {
    writeJson(join(archiveDir, "project-overrides.json"), {
      projectId: payload.projectId,
      ...payload.project,
    });
  }
  writeFileSync(
    join(archiveDir, "README.md"),
    [
      `# ${archiveName}`,
      "",
      `Action: ${payload.action}`,
      payload.projectId ? `Project ID: ${payload.projectId}` : undefined,
      `Created at: ${record.createdAt}`,
      "",
      "This folder is a local portfolio history archive. It is kept on D: for rollback and review.",
      "",
    ]
      .filter(Boolean)
      .join("\n"),
    "utf8",
  );

  const previousIndex = existsSync(archiveIndexPath)
    ? JSON.parse(readFileSync(archiveIndexPath, "utf8")) as { versions?: unknown[] }
    : { versions: [] };
  writeJson(archiveIndexPath, {
    updatedAt: new Date().toISOString(),
    versions: [record, ...(previousIndex.versions ?? [])],
  });

  return record;
};

const runPublishCommand = async (command: string, args: string[]) => {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: projectRoot,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 12,
  });

  return `${stdout}${stderr}`.trim();
};

const publishEditorChanges = async (action = "editor-publish") => {
  const gitCommand = process.platform === "win32" ? "git.exe" : "git";
  const existingPublishPaths = publishTrackedPaths.filter((path) => existsSync(join(projectRoot, path)));

  if (process.platform === "win32") {
    await runPublishCommand("cmd.exe", ["/d", "/s", "/c", "npm run build"]);
  } else {
    await runPublishCommand("npm", ["run", "build"]);
  }

  const changedStatus = await runPublishCommand(gitCommand, [
    "status",
    "--short",
    "--",
    ...existingPublishPaths,
  ]);
  const changedFiles = changedStatus
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!changedFiles.length) {
    return {
      ok: true,
      skipped: true,
      message: "没有检测到需要同步上线的编辑改动。",
      changedFiles: [],
    };
  }

  await runPublishCommand(gitCommand, ["add", "--", ...existingPublishPaths]);

  const stagedFiles = await runPublishCommand(gitCommand, [
    "diff",
    "--cached",
    "--name-only",
    "--",
    ...existingPublishPaths,
  ]);

  if (!stagedFiles.trim()) {
    return {
      ok: true,
      skipped: true,
      message: "编辑改动已经与仓库一致，无需重新发布。",
      changedFiles,
    };
  }

  const stamp = nowStamp();
  const commitMessage = `Publish portfolio editor changes ${stamp}`;
  await runPublishCommand(gitCommand, ["commit", "-m", commitMessage]);
  const commit = await runPublishCommand(gitCommand, ["rev-parse", "--short", "HEAD"]);
  const branch = (await runPublishCommand(gitCommand, ["branch", "--show-current"])) || "master";
  await runPublishCommand(gitCommand, ["push", "origin", `${branch}:main`]);

  return {
    ok: true,
    action,
    commit,
    message: "已提交并推送，Vercel 会自动部署到线上网址。",
    changedFiles,
  };
};

const imageCompressQuality = 70;
const compressedImageExtensions = new Set([".jpg", ".jpeg", ".png"]);
const shouldCompressImages = process.env.ZOEY_COMPRESS_IMAGES === "1";

const distImageCompressPlugin = (): Plugin => {
  let distDir = "";

  const collectImages = (dir: string, files: string[] = []) => {
    if (!existsSync(dir)) return files;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        collectImages(fullPath, files);
        continue;
      }

      if (compressedImageExtensions.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }

    return files;
  };

  return {
    name: "zoey-dist-image-compress",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      distDir = isAbsolute(config.build.outDir) ? config.build.outDir : join(config.root, config.build.outDir);
    },
    async closeBundle() {
      const { default: sharp } = await import("sharp");
      const imageFiles = collectImages(distDir);

      for (const imagePath of imageFiles) {
        const source = readFileSync(imagePath);
        const extension = extname(imagePath).toLowerCase();
        const originalMetadata = await sharp(source).metadata();
        const pipeline = sharp(source, { animated: false });
        const optimized = extension === ".png"
          ? await pipeline.png({ quality: imageCompressQuality }).toBuffer()
          : await pipeline.jpeg({ quality: imageCompressQuality }).toBuffer();

        if (optimized.length >= source.length) continue;

        const optimizedMetadata = await sharp(optimized).metadata();
        if (optimizedMetadata.width !== originalMetadata.width || optimizedMetadata.height !== originalMetadata.height) {
          continue;
        }

        writeFileSync(imagePath, optimized);
      }
    },
  };
};
const portfolioPersistencePlugin = (): Plugin => ({
  name: "zoey-portfolio-local-persistence",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ?? "";

      try {
        if (req.method === "GET" && url.startsWith("/api/portfolio/overrides/latest")) {
          jsonResponse(res, 200, readLatestOverrides());
          return;
        }

        if (req.method === "GET" && url.startsWith("/api/info-page/overrides/latest")) {
          jsonResponse(res, 200, readLatestInfoTextOverrides());
          return;
        }

        if (req.method === "POST" && url.startsWith("/api/info-page/overrides/sync")) {
          const body = JSON.parse(await readRequestBody(req)) as {
            overrides?: InfoTextOverrides;
          };
          if (!body.overrides) {
            throw new Error("overrides are required.");
          }

          validateInfoTextOverrides(body.overrides);
          const latest = readLatestInfoTextOverrides();
          const normalizedOverrides = normalizeInfoTextOverrides(body.overrides);
          if (stableStringify(latest.overrides) === stableStringify(normalizedOverrides)) {
            jsonResponse(res, 200, { ok: true, skipped: true, latest });
            return;
          }

          const nextLatest: LatestInfoTextOverrides = {
            version: latest.version + 1,
            updatedAt: new Date().toISOString(),
            overrides: normalizedOverrides,
          };
          writeLatestInfoTextOverrides(nextLatest);
          jsonResponse(res, 200, { ok: true, latest: nextLatest });
          return;
        }

        if (req.method === "GET" && url.startsWith("/api/portfolio/history")) {
          jsonResponse(res, 200, listHistoryVersions());
          return;
        }

        if (req.method === "POST" && url.startsWith("/api/portfolio/sync-project")) {
          const body = JSON.parse(await readRequestBody(req)) as {
            action?: string;
            projectId?: string;
            project?: ProjectOverride;
          };
          if (!body.projectId || !body.project) {
            throw new Error("projectId and project are required.");
          }

          validateProjectOverride(body.projectId, body.project);
          const latest = readLatestOverrides();
          const normalizedProject = normalizeProjectOverride(body.project);
          if (stableStringify(latest.projects[body.projectId]) === stableStringify(normalizedProject)) {
            jsonResponse(res, 200, {
              ok: true,
              skipped: true,
              projectId: body.projectId,
              project: normalizedProject,
            });
            return;
          }

          const nextLatest: LatestOverrides = {
            version: latest.version + 1,
            updatedAt: new Date().toISOString(),
            projects: {
              ...latest.projects,
              [body.projectId]: normalizedProject,
            },
          };

          writeLatestOverrides(nextLatest);
          const archive = appendIncrementalArchive({
            action: body.action ?? "project-save",
            projectId: body.projectId,
            previous: latest,
            latest: nextLatest,
            changedProjects: { [body.projectId]: normalizedProject },
          });

          server.ws.send({ type: "custom", event: "portfolio-overrides-saved", data: { projectId: body.projectId } });
          jsonResponse(res, 200, { ok: true, projectId: body.projectId, archive, project: normalizedProject });
          return;
        }

        if (req.method === "POST" && url.startsWith("/api/portfolio/snapshot")) {
          const body = JSON.parse((await readRequestBody(req)) || "{}") as { action?: string; kind?: string };
          const latest = readLatestOverrides();
          const archive =
            body.kind === "snapshot"
              ? createFullSnapshot({ action: body.action ?? "manual-snapshot", latest })
              : body.kind === "daily"
                ? createDailyArchive({ action: body.action ?? "daily-merge", latest })
                : appendIncrementalArchive({ action: body.action ?? "two-hour-incremental", latest });
          jsonResponse(res, 200, { ok: true, archive });
          return;
        }

        if (req.method === "POST" && url.startsWith("/api/portfolio/publish")) {
          const body = JSON.parse((await readRequestBody(req)) || "{}") as { action?: string };
          const result = await publishEditorChanges(body.action ?? "editor-publish");
          jsonResponse(res, 200, result);
          return;
        }

        if (req.method === "POST" && url.startsWith("/api/portfolio/rollback")) {
          const body = JSON.parse(await readRequestBody(req)) as { archiveName?: string };
          if (!body.archiveName || body.archiveName.includes("..") || /[\\/:*?"<>|]/.test(body.archiveName)) {
            throw new Error("Invalid archive name.");
          }

          const latest = restoreHistoryVersion(body.archiveName);
          writeLatestOverrides(latest);
          const archive = archiveRollback({ archiveName: body.archiveName, latest });
          jsonResponse(res, 200, { ok: true, archive, latest });
          return;
        }
      } catch (error) {
        jsonResponse(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
        return;
      }

      next();
    });
  },
});

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    ...(shouldCompressImages
      ? [
          VitePluginImageCompress({
            test: /\.(jpe?g|png)$/i,
            includePublic: false,
            jpeg: { quality: imageCompressQuality },
            jpg: { quality: imageCompressQuality },
            png: { quality: imageCompressQuality },
          }),
        ]
      : []),
    portfolioPersistencePlugin(),
    ...(shouldCompressImages ? [distImageCompressPlugin()] : []),
  ],
  assetsInclude: ["**/*.glb"],
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["framer-motion"],
          three: ["three", "@react-three/fiber"],
        },
      },
    },
  },
});
