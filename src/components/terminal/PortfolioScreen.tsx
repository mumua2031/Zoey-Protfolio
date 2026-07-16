import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PortfolioCategory } from "../../data/portfolio";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import {
  createPortfolioHistorySnapshot,
  defaultProjectTypography,
  getProjectOverride,
  getProjectOverrideAsync,
  saveProjectOverrideAsync,
  syncBrowserOverridesToBackend,
  type EditablePortfolioImage,
  type EditableProjectCopy,
} from "../../utils/portfolioOverrides";
import { publishEditorChanges } from "../../utils/publishChanges";
import { LazyArtwork, type LayoutPreset } from "./LazyArtwork";
import { PortfolioEditor } from "./PortfolioEditor";

const screenSpring = { type: "spring" as const, stiffness: 260, damping: 32 };

const projectFontFamilies: Record<string, string> = {
  system: 'Inter, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif',
  songti: '"Noto Serif SC", "Songti SC", SimSun, serif',
  heiti: '"Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", "Noto Serif SC", serif',
  mono: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
};

const projectEnglishCopy: Record<string, { subtitle: string; keywords: string[] }> = {
  "visual-identity": {
    subtitle: "Brand Visual / Editorial System",
    keywords: ["Brand Identity", "Editorial Order", "Whitespace", "Visual Rhythm"],
  },
  "visual-editorial": {
    subtitle: "Information Hierarchy / Layout Rhythm",
    keywords: ["Hierarchy", "Grid", "Image Rhythm", "Gallery Narrative"],
  },
  "aigc-frame": {
    subtitle: "Generative Image / Prompt Direction",
    keywords: ["Prompting", "Image Experiment", "Style Control", "Rapid Iteration"],
  },
  "aigc-storyboard": {
    subtitle: "Visual Storytelling / AI Workflow",
    keywords: ["Sequential Frames", "Moodboard", "Spatial Imagination", "Material Direction"],
  },
  "fashion-silhouette": {
    subtitle: "Silhouette / Material / Lookbook",
    keywords: ["Silhouette", "Textile", "Muted Palette", "Feminine Line"],
  },
  "fashion-lookbook": {
    subtitle: "Textile Order / Visual Manual",
    keywords: ["Lookbook", "Collection", "Material Archive", "Visual Manual"],
  },
  "interior-studio": {
    subtitle: "White Space / Soft Minimal",
    keywords: ["Proportion", "Natural Light", "Circulation", "White Material"],
  },
  "interior-gallery": {
    subtitle: "Viewing Path / Spatial Display",
    keywords: ["Exhibition", "Frames", "Viewing Path", "Wall Order"],
  },
  "painting-lines": {
    subtitle: "Line / Texture / Emotional Sampling",
    keywords: ["Line", "Whitespace", "Emotion", "Slow Viewing"],
  },
  "painting-texture": {
    subtitle: "Material Trace / Emotional Surface",
    keywords: ["Texture", "Material", "Handmade Trace", "Chance"],
  },
  "photography-still": {
    subtitle: "Spatial Image / Silent Narrative",
    keywords: ["Natural Light", "Still Life", "Space", "Restrained Narrative"],
  },
  "photography-object": {
    subtitle: "Light / Object / Quiet Story",
    keywords: ["Close Framing", "Everyday Object", "Light", "Silent Story"],
  },
};

type PortfolioScreenProps = {
  category: PortfolioCategory;
  isOpen: boolean;
  onBack: () => void;
};

const isDeveloperUrl = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("dev") === "1" || params.get("edit") === "1";
};

export function PortfolioScreen({ category, isOpen, onBack }: PortfolioScreenProps) {
  const screenRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const manualResumeTimerRef = useRef<number | null>(null);
  const scrollPositionRef = useRef(0);
  const toolbarVisibleUntilRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const editableImagesRef = useRef<EditablePortfolioImage[]>([]);
  const editableCopyRef = useRef<EditableProjectCopy | null>(null);
  const language = usePortfolioStore((state) => state.language);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isDeveloperMenuOpen, setIsDeveloperMenuOpen] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(category.projects[0]?.id ?? "");
  const [projectCopyMap, setProjectCopyMap] = useState<Record<string, EditableProjectCopy>>({});
  const visibleProjects = useMemo(
    () => category.projects.filter((project) => !projectCopyMap[project.id]?.hidden),
    [category.projects, projectCopyMap],
  );
  const activeProject = useMemo(
    () =>
      visibleProjects.find((project) => project.id === activeProjectId) ??
      visibleProjects[0] ??
      category.projects[0],
    [activeProjectId, category.projects, visibleProjects],
  );
  const [editableImages, setEditableImages] = useState<EditablePortfolioImage[] | null>(null);
  const [editableCopy, setEditableCopy] = useState<EditableProjectCopy | null>(null);

  useEffect(() => {
    let isCurrent = true;

    // 一次性从 IndexedDB 加载所有项目的覆盖数据，避免两次渲染导致闪屏
    void Promise.all(
      category.projects.map(async (project) => {
        const override = await getProjectOverrideAsync(project);
        return [project.id, override] as const;
      }),
    ).then((entries) => {
      if (!isCurrent) return;

      const copyMap: Record<string, EditableProjectCopy> = {};
      for (const [id, override] of entries) {
        copyMap[id] = override.copy;
      }
      setProjectCopyMap(copyMap);

      // 首个项目的图片和文案数据
      const firstProject = category.projects[0];
      if (firstProject) {
        const firstOverride = entries.find(([id]) => id === firstProject.id)?.[1];
        if (firstOverride) {
          setEditableImages(firstOverride.images);
          setEditableCopy(firstOverride.copy);
          editableImagesRef.current = firstOverride.images;
          editableCopyRef.current = firstOverride.copy;
        }
      }
    });

    setActiveProjectId(category.projects[0]?.id ?? "");

    return () => {
      isCurrent = false;
    };
  }, [category.id, category.projects]);

  useEffect(() => {
    setIsDeveloperMode(isDeveloperUrl());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (!isDeveloperUrl()) {
          setIsDeveloperMode(false);
          setIsDeveloperMenuOpen(false);
          return;
        }
        setIsDeveloperMode((current) => !current);
        setIsDeveloperMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isDeveloperMode) {
      setIsEditorOpen(false);
      setIsLayoutEditing(false);
      setIsDeveloperMenuOpen(false);
    }
  }, [isDeveloperMode]);

  useEffect(() => {
    if (!isDeveloperMode) {
      return;
    }

    void syncBrowserOverridesToBackend();

    const snapshotInterval = window.setInterval(() => {
      void createPortfolioHistorySnapshot("two-hour-auto-snapshot");
    }, 2 * 60 * 60 * 1000);

    return () => window.clearInterval(snapshotInterval);
  }, [isDeveloperMode]);

  useEffect(() => {
    if (!activeProject || activeProject.id === activeProjectId) {
      return;
    }

    setActiveProjectId(activeProject.id);
  }, [activeProject, activeProjectId]);

  useEffect(() => {
    toolbarVisibleUntilRef.current = performance.now() + 2000;
  }, []);

  useEffect(() => {
    const now = performance.now();
    if (screenRef.current) {
      screenRef.current.scrollTop = 0;
      scrollPositionRef.current = 0;
      directionRef.current = 1;
      pauseUntilRef.current = now + 1200;
      toolbarVisibleUntilRef.current = now + 2000;
      setIsToolbarVisible(true);
    }
    if (manualResumeTimerRef.current) {
      window.clearTimeout(manualResumeTimerRef.current);
      manualResumeTimerRef.current = null;
    }
    setIsAutoPaused(false);
    setIsManualScrolling(false);
    setIsEditorOpen(false);
    setIsLayoutEditing(false);
  }, [category.id, activeProjectId, isOpen]);

  useEffect(() => {
    if (activeProject) {
      let isCurrent = true;

      // 只从 IndexedDB 异步加载一次，避免 localStorage 快照 → IndexedDB 覆盖两次渲染导致的闪屏
      void getProjectOverrideAsync(activeProject).then((persistentOverride) => {
        if (!isCurrent) return;
        setEditableImages(persistentOverride.images);
        setEditableCopy(persistentOverride.copy);
        editableImagesRef.current = persistentOverride.images;
        editableCopyRef.current = persistentOverride.copy;
      });

      return () => {
        isCurrent = false;
      };
    }
  }, [activeProject]);

  useEffect(() => {
    if (editableImages) {
      editableImagesRef.current = editableImages;
    }
  }, [editableImages]);

  useEffect(() => {
    if (editableCopy) {
      editableCopyRef.current = editableCopy;
    }
  }, [editableCopy]);

  useEffect(() => {
    const screen = screenRef.current;
    if (screen) {
      scrollPositionRef.current = screen.scrollTop;
    }

    const speed = 65;
    let lastTime = performance.now();

    const step = (time: number) => {
      const screen = screenRef.current;
      if (screen && !isAutoPaused && !isLayoutEditing && time > pauseUntilRef.current) {
        const maxScroll = screen.scrollHeight - screen.clientHeight;
        if (maxScroll > 0) {
          const delta = ((time - lastTime) / 1000) * speed * directionRef.current;
          const next = scrollPositionRef.current + delta;

          if (next >= maxScroll) {
            screen.scrollTop = maxScroll;
            scrollPositionRef.current = maxScroll;
            directionRef.current = -1;
            pauseUntilRef.current = time + 900;
          } else if (next <= 0) {
            screen.scrollTop = 0;
            scrollPositionRef.current = 0;
            directionRef.current = 1;
            pauseUntilRef.current = time + 900;
          } else {
            screen.scrollTop = next;
            scrollPositionRef.current = next;
            if (time > toolbarVisibleUntilRef.current) {
              setIsToolbarVisible(false);
            }
          }
        }
      }

      lastTime = time;
      frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isAutoPaused, isLayoutEditing, category.id, activeProjectId]);

  useEffect(() => {
    return () => {
      if (manualResumeTimerRef.current) {
        window.clearTimeout(manualResumeTimerRef.current);
      }
    };
  }, []);

  if (!activeProject) {
    return null;
  }

  const englishCopy = projectEnglishCopy[activeProject.id];
  const currentCopy: EditableProjectCopy = editableCopy ?? {
    name: activeProject.name,
    nameEn: activeProject.nameEn,
    title: activeProject.title,
    subtitle: activeProject.subtitle,
    intro: activeProject.intro,
    introEn: activeProject.introEn,
    keywords: activeProject.keywords,
    hidden: false,
    typography: defaultProjectTypography,
  };
  const activeTypography = currentCopy.typography;
  const brandTypographyFingerprint = [
    activeProject.id,
    currentCopy.name,
    currentCopy.nameEn,
    currentCopy.title,
    currentCopy.subtitle,
  ].join(" ");
  const isBrandTypographyProject =
    category.id === "visual" &&
    /标志|品牌|视觉系统|logo|identity|brand/i.test(brandTypographyFingerprint) &&
    !/扬子江/.test(brandTypographyFingerprint);
  const metricTitle = currentCopy.title;
  const titleLatinChars = (metricTitle.match(/[A-Za-z]/g) ?? []).length;
  const titleCjkChars = (metricTitle.match(/[\u3400-\u9fff]/g) ?? []).length;
  const isLatinTitle = titleLatinChars > 0 && titleLatinChars >= titleCjkChars;
  const copyFontFamily =
    language === "en"
      ? projectFontFamilies[activeTypography?.enFontFamily ?? "system"]
      : projectFontFamilies[activeTypography?.cnFontFamily ?? "system"];
  const titleFontFamily = isLatinTitle
    ? projectFontFamilies[activeTypography?.enFontFamily ?? "system"]
    : projectFontFamilies[activeTypography?.cnFontFamily ?? "system"];
  const rawTitleScale = isLatinTitle
    ? activeTypography?.enTitleSize ?? 1
    : activeTypography?.cnTitleSize ?? 1;
  const titleScale = isLatinTitle
    ? Math.min(Math.max(rawTitleScale, 0.72), 1.12)
    : Math.min(Math.max(rawTitleScale, 0.72), 1.35);
  const projectCopyStyle = {
    "--project-copy-font": copyFontFamily ?? projectFontFamilies.system,
    "--project-title-font": titleFontFamily ?? projectFontFamilies.system,
    "--project-title-scale": titleScale,
    "--project-body-scale":
      language === "en" ? activeTypography?.enBodySize ?? 1 : activeTypography?.cnBodySize ?? 1,
  } as CSSProperties;
  const categoryLabel = language === "en" ? category.labelEn : category.label;
  const activeProjectName = language === "en" ? currentCopy.nameEn : currentCopy.name;
  const activeSubtitle = language === "en" ? englishCopy?.subtitle ?? currentCopy.subtitle : currentCopy.subtitle;
  const activeIntro = language === "en" ? currentCopy.introEn : currentCopy.intro;
  const activeKeywords = language === "en" ? englishCopy?.keywords ?? currentCopy.keywords : currentCopy.keywords;
  const displaySubtitle = activeSubtitle;
  const displayTitle = currentCopy.title;
  const displayIntro = activeIntro;
  const displayKeywords = activeKeywords;
  const currentEditableImages = editableImages ?? getProjectOverride(activeProject).images;
  const visibleEditableImages = currentEditableImages
    .map((image, sourceIndex) => ({ image, sourceIndex }))
    .filter(({ image }) => image.enabled);
  const firstPresentationItem = isLayoutEditing ? undefined : visibleEditableImages[0];
  const flowItems = isLayoutEditing ? visibleEditableImages : visibleEditableImages.slice(1);
  const brandTypeTiles = [
    {
      index: "01",
      title: language === "en" ? "Mark Foundation" : "标志基础",
      body:
        language === "en"
          ? "A clear logo system starts from recognisable geometry, stable rhythm, and repeatable spacing."
          : "清晰的标志系统从可识别的几何、稳定节奏与可复用留白开始。",
    },
    {
      index: "02",
      title: language === "en" ? "Grid Logic" : "网格逻辑",
      body:
        language === "en"
          ? "Construction lines, optical balance, and safe space make the mark usable across formats."
          : "结构线、视觉平衡与安全空间，让标志能在不同媒介中稳定使用。",
    },
    {
      index: "03",
      title: language === "en" ? "Application" : "应用延展",
      body:
        language === "en"
          ? "The logo page reserves space for packaging, interface, posters, and brand touchpoints."
          : "页面预留给包装、界面、海报与品牌触点，方便后续替换你的真实图片。",
    },
    {
      index: "04",
      title: language === "en" ? "Typography" : "字体关系",
      body:
        language === "en"
          ? "Wordmark, Chinese title, and annotation scale form a sharper identity hierarchy."
          : "英文标志、中文标题与注释层级共同建立更鲜明的识别秩序。",
    },
  ];

  const commitLayout = (images = editableImagesRef.current) => {
    void saveProjectOverrideAsync(activeProject.id, images, editableCopyRef.current ?? currentCopy).then((synced) => {
      if (!synced) {
        return;
      }
      editableImagesRef.current = synced.images;
      editableCopyRef.current = synced.copy;
      setEditableImages(synced.images);
      setEditableCopy(synced.copy);
      setProjectCopyMap((current) => ({ ...current, [activeProject.id]: synced.copy }));
    });
  };

  const commitImageLayout = (sourceIndex: number, patch: Partial<EditablePortfolioImage>) => {
    const baseImages = editableImagesRef.current.length ? editableImagesRef.current : currentEditableImages;
    const next = baseImages.map((image, imageIndex) =>
      imageIndex === sourceIndex ? { ...image, ...patch } : image,
    );

    editableImagesRef.current = next;
    setEditableImages(next);
    commitLayout(next);
  };

  const applyImageLayoutPreset = (sourceIndex: number, preset: LayoutPreset) => {
    const baseImages = editableImagesRef.current.length ? editableImagesRef.current : currentEditableImages;
    const visibleSourceIndexes = visibleEditableImages.map((item) => item.sourceIndex);
    const selectedVisibleIndex = visibleSourceIndexes.indexOf(sourceIndex);
    if (selectedVisibleIndex < 0) {
      return;
    }

    const presetLayouts: Record<
      LayoutPreset,
      Array<{ gridSpan: number; layoutRatio: number; gridStart?: number }>
    > = {
      single: [{ gridSpan: 12, layoutRatio: 1.55 }],
      pair: [
        { gridSpan: 6, layoutRatio: 1.08 },
        { gridSpan: 6, layoutRatio: 1.08 },
      ],
      trio: [
        { gridSpan: 4, layoutRatio: 0.92 },
        { gridSpan: 4, layoutRatio: 0.92 },
        { gridSpan: 4, layoutRatio: 0.92 },
      ],
      quad: [
        { gridSpan: 6, layoutRatio: 2.15 },
        { gridSpan: 6, layoutRatio: 2.15 },
        { gridSpan: 6, layoutRatio: 2.15 },
        { gridSpan: 6, layoutRatio: 2.15 },
      ],
      five: [
        { gridSpan: 4, layoutRatio: 1.85 },
        { gridSpan: 4, layoutRatio: 1.85 },
        { gridSpan: 4, layoutRatio: 1.85 },
        { gridStart: 3, gridSpan: 4, layoutRatio: 1.85 },
        { gridStart: 7, gridSpan: 4, layoutRatio: 1.85 },
      ],
      mosaic: [
        { gridSpan: 4, layoutRatio: 1.9 },
        { gridSpan: 4, layoutRatio: 1.9 },
        { gridSpan: 4, layoutRatio: 1.9 },
        { gridSpan: 4, layoutRatio: 1.9 },
        { gridSpan: 4, layoutRatio: 1.9 },
        { gridSpan: 4, layoutRatio: 1.9 },
      ],
      wide: [{ gridSpan: 9, layoutRatio: 1.36 }],
    };
    const layouts = presetLayouts[preset];
    const targetSourceIndexes = new Set(
      visibleSourceIndexes.slice(selectedVisibleIndex, selectedVisibleIndex + layouts.length),
    );

    const next = baseImages.map((image, imageIndex) => {
      if (!targetSourceIndexes.has(imageIndex)) {
        return image;
      }

      const layoutIndex = visibleSourceIndexes
        .slice(selectedVisibleIndex, selectedVisibleIndex + layouts.length)
        .indexOf(imageIndex);
      const layout = layouts[layoutIndex] ?? layouts[0];
      const nextImage: EditablePortfolioImage = {
        ...image,
        fit: "contain",
        gridSpan: layout.gridSpan,
        layoutRatio: layout.layoutRatio,
        span: "auto",
      };
      if (layout.gridStart) {
        nextImage.gridStart = layout.gridStart;
      } else {
        delete nextImage.gridStart;
      }
      return nextImage;
    });

    editableImagesRef.current = next;
    setEditableImages(next);
    commitLayout(next);
  };

  const toggleLayoutEditing = () => {
    const next = !isLayoutEditing;
    setIsLayoutEditing(next);
    setIsAutoPaused(next);
    setIsToolbarVisible(true);
    setIsDeveloperMenuOpen(false);
    if (!next) {
      commitLayout();
    }
  };

  const publishChanges = async () => {
    setIsPublishing(true);
    setPublishMessage(language === "en" ? "Publishing..." : "正在同步上线…");
    const result = await publishEditorChanges();
    setIsPublishing(false);
    setPublishMessage(
      result.ok
        ? result.skipped
          ? language === "en"
            ? "No local editor changes to publish."
            : "没有检测到需要同步上线的编辑改动。"
          : language === "en"
            ? `Pushed. Commit ${result.commit ?? ""}`
            : `已推送上线，提交 ${result.commit ?? ""}`
        : language === "en"
          ? `Publish failed: ${result.error}`
          : `同步失败：${result.error}`,
    );
  };

  return (
    <motion.article
      ref={screenRef}
      key={category.id}
      className={[
        "portfolio-screen",
        `is-project-${activeProject.id}`,
        isManualScrolling ? "is-manual-scroll" : "",
        isLayoutEditing ? "is-layout-editing" : "",
        isBrandTypographyProject && !isLayoutEditing ? "is-brand-typography-study" : "",
      ].filter(Boolean).join(" ")}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (
          target.closest("button, input, textarea, select, label, .portfolio-editor") ||
          (isLayoutEditing && target.closest(".artwork-frame"))
        ) {
          return;
        }
        setIsAutoPaused((current) => !current);
        setIsToolbarVisible((current) => !current);
      }}
      onWheel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        const screen = event.currentTarget;
        const maxScroll = screen.scrollHeight - screen.clientHeight;
        const next = Math.min(Math.max(screen.scrollTop + event.deltaY, 0), maxScroll);

        screen.scrollTop = next;
        scrollPositionRef.current = next;
        directionRef.current = event.deltaY >= 0 ? 1 : -1;
        pauseUntilRef.current = performance.now() + 1200;
        setIsManualScrolling(true);

        if (manualResumeTimerRef.current) {
          window.clearTimeout(manualResumeTimerRef.current);
        }

        manualResumeTimerRef.current = window.setTimeout(() => {
          setIsManualScrolling(false);
        }, 1200);

        if (performance.now() > toolbarVisibleUntilRef.current) {
          setIsToolbarVisible(false);
        }
      }}
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -22 }}
      transition={screenSpring}
    >
      <div className={isToolbarVisible ? "screen-toolbar" : "screen-toolbar is-hidden"}>
        <button type="button" className="back-button" onClick={onBack}>
          {language === "en" ? "Back" : "返回"}
        </button>
        <div
          className="screen-project-tabs"
          aria-label={language === "en" ? `${category.labelEn} project selection` : `${category.label}项目选择`}
        >
          {visibleProjects.map((project) => (
            <motion.button
              key={project.id}
              type="button"
              className={
                project.id === activeProject.id
                  ? "screen-project-tab is-active"
                  : "screen-project-tab"
              }
              onClick={() => setActiveProjectId(project.id)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={screenSpring}
            >
              <span>
                {language === "en"
                  ? projectCopyMap[project.id]?.nameEn ?? project.nameEn
                  : projectCopyMap[project.id]?.name ?? project.name}
              </span>
            </motion.button>
          ))}
        </div>
        <div className="screen-toolbar-actions">
          {isDeveloperMode ? (
            <div className="developer-tools">
              <button
                type="button"
                className={isDeveloperMenuOpen ? "back-button is-active" : "back-button"}
                onClick={() => setIsDeveloperMenuOpen((current) => !current)}
              >
                {language === "en" ? "Edit Entry" : "编辑入口"}
              </button>
              <div className={isDeveloperMenuOpen ? "developer-menu" : "developer-menu is-hidden"}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditorOpen(true);
                    setIsDeveloperMenuOpen(false);
                  }}
                >
                  {language === "en" ? "Manage Projects" : "管理作品"}
                </button>
                <button type="button" onClick={toggleLayoutEditing}>
                  {isLayoutEditing
                    ? language === "en"
                      ? "Finish Layout"
                      : "完成排版"
                    : language === "en"
                      ? "Edit Layout"
                      : "排版拖改"}
                </button>
                <button type="button" onClick={publishChanges} disabled={isPublishing}>
                  {isPublishing
                    ? language === "en"
                      ? "Publishing..."
                      : "同步中…"
                    : language === "en"
                      ? "Publish Online"
                      : "同步上线"}
                </button>
                {publishMessage ? <p className="developer-menu-status">{publishMessage}</p> : null}
              </div>
            </div>
          ) : null}
          {false ? (
            <>
          <button type="button" className="back-button" onClick={() => setIsEditorOpen(true)}>
            {language === "en" ? "Manage" : "管理作品"}
          </button>
          <button
            type="button"
            className={isLayoutEditing ? "back-button is-active" : "back-button"}
            onClick={() => {
              const next = !isLayoutEditing;
              setIsLayoutEditing(next);
              setIsAutoPaused(next);
              setIsToolbarVisible(true);
              if (!next) {
                commitLayout();
              }
            }}
          >
            {language === "en" ? "Layout" : "排版拖改"}
          </button>
            </>
          ) : null}
          <span>{categoryLabel}</span>
        </div>
      </div>

      {isLayoutEditing ? (
        <div className="layout-edit-hint">
          {language === "en"
            ? "Drag an image to shift columns. Pull the corner handle to resize."
            : "拖动图片可横向调整位置，拉右下角手柄可改变宽度和高矮。"}
        </div>
      ) : null}

      {isEditorOpen ? (
        <PortfolioEditor
          projectId={activeProject.id}
          projectName={activeProjectName}
          language={language}
          originalImages={activeProject.images}
          originalCopy={{
            name: activeProject.name,
            nameEn: activeProject.nameEn,
            title: activeProject.title,
            subtitle: activeProject.subtitle,
            intro: activeProject.intro,
            introEn: activeProject.introEn,
            keywords: activeProject.keywords,
          }}
          images={currentEditableImages}
          copy={currentCopy}
          onApply={({ images, copy }) => {
            setEditableImages(images);
            setEditableCopy(copy);
            setProjectCopyMap((current) => ({ ...current, [activeProject.id]: copy }));
            editableImagesRef.current = images;
            editableCopyRef.current = copy;

            // 自动同步保存到 IndexedDB，确保刷新后保留编辑内容
            if (copy.hidden) {
              const nextProject = visibleProjects.find((project) => project.id !== activeProject.id);
              if (nextProject) {
                setActiveProjectId(nextProject.id);
              } else {
                onBack();
              }
            }
          }}
          onClose={() => setIsEditorOpen(false)}
          onReset={() => {
            // 清除该项目的所有编辑覆盖，强制重新从原始数据加载
            setEditableImages(null);
            setEditableCopy(null);
            setProjectCopyMap((current) => {
              const next = { ...current };
              delete next[activeProject.id];
              return next;
            });
            editableImagesRef.current = [];
            editableCopyRef.current = null;
          }}
        />
      ) : null}

      <section className="screen-hero" aria-labelledby={`${activeProject.id}-title`}>
        <motion.div
          key={activeProject.id}
          className={isLatinTitle ? "screen-project-copy is-latin-title" : "screen-project-copy"}
          style={projectCopyStyle}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={screenSpring}
        >
          <p>{displaySubtitle}</p>
          <h1 id={`${activeProject.id}-title`}>{displayTitle}</h1>
          <div>
            <span>{displayIntro}</span>
          </div>
          <div
            className="keyword-chips"
            aria-label={language === "en" ? `${activeProjectName} keywords` : `${activeProject.name}关键词`}
          >
            {displayKeywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </motion.div>
        {firstPresentationItem ? (
          <motion.div
            className="screen-hero-artwork"
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={screenSpring}
          >
            <LazyArtwork
              key={`${activeProject.id}-hero-${firstPresentationItem.image.src}-${firstPresentationItem.sourceIndex}`}
              image={firstPresentationItem.image}
              priority
            />
          </motion.div>
        ) : null}
      </section>

      {isBrandTypographyProject && !isLayoutEditing ? (
        <motion.section
          className="brand-type-manifesto"
          aria-label={language === "en" ? "Logo design typography system" : "标志设计图文系统"}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={screenSpring}
        >
          <div className="brand-type-poster">
            <span>{language === "en" ? "Logo System" : "标志系统"}</span>
            <strong>LOGO</strong>
            <p>
              {language === "en"
                ? "A mark becomes memorable when structure, rhythm, and application speak together."
                : "当结构、节奏与应用场景共同成立，标志才会真正被记住。"}
            </p>
          </div>
          <div className="brand-type-grid">
            {brandTypeTiles.map((tile) => (
              <article className="brand-type-tile" key={tile.index}>
                <small>{tile.index}</small>
                <h2>{tile.title}</h2>
                <p>{tile.body}</p>
              </article>
            ))}
          </div>
          <div className="brand-type-keywords">
            {displayKeywords.slice(0, 6).map((keyword, index) => (
              <span key={`${keyword}-${index}`}>{keyword}</span>
            ))}
          </div>
        </motion.section>
      ) : null}

      <motion.section
        key={activeProject.id}
        className="artwork-flow"
        aria-label={language === "en" ? `${activeProjectName} artwork flow` : `${activeProject.name}作品图流`}
        initial={{ opacity: 0, x: 22 }}
        animate={{ opacity: 1, x: 0 }}
        transition={screenSpring}
      >
        {flowItems.map(({ image, sourceIndex }, index) => (
          <LazyArtwork
            key={`${activeProject.id}-${image.src}-${sourceIndex}`}
            image={image}
            priority={isLayoutEditing && index === 0}
            editable={isLayoutEditing}
            editIndex={index}
            onLayoutCommit={(patch) => commitImageLayout(sourceIndex, patch)}
            onLayoutPreset={(preset) => applyImageLayoutPreset(sourceIndex, preset)}
          />
        ))}
      </motion.section>
    </motion.article>
  );
}
