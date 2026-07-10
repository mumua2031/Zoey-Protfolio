import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { PortfolioImage } from "../../data/portfolio";
import {
  defaultProjectTypography,
  listPortfolioHistoryVersions,
  rollbackPortfolioHistoryVersion,
  resetProjectOverrideAsync,
  saveProjectOverrideAsync,
  type EditablePortfolioImage,
  type EditableProjectCopy,
} from "../../utils/portfolioOverrides";

type HistoryVersion = {
  archiveName: string;
  createdAt: string;
  action: string;
  kind?: string;
  projectId?: string;
};

type PortfolioEditorProps = {
  projectId: string;
  projectName: string;
  language: "cn" | "en";
  originalImages: PortfolioImage[];
  originalCopy: EditableProjectCopy;
  images: EditablePortfolioImage[];
  copy: EditableProjectCopy;
  onApply: (payload: { images: EditablePortfolioImage[]; copy: EditableProjectCopy }) => void;
  onReset: () => void;
  onClose: () => void;
};

const fontOptions = [
  { value: "system", cn: "默认无衬线", en: "System Sans" },
  { value: "heiti", cn: "现代黑体", en: "Modern Sans" },
  { value: "songti", cn: "宋体衬线", en: "Chinese Serif" },
  { value: "serif", cn: "英文衬线", en: "English Serif" },
  { value: "mono", cn: "等宽字体", en: "Monospace" },
];

const spanOptions: Array<{ value: NonNullable<PortfolioImage["span"]>; cn: string; en: string }> = [
  { value: "auto", cn: "自动", en: "Auto" },
  { value: "full", cn: "全宽", en: "Full" },
  { value: "wide", cn: "宽幅", en: "Wide" },
  { value: "half", cn: "半宽", en: "Half" },
  { value: "tall", cn: "竖图", en: "Tall" },
  { value: "square", cn: "方图", en: "Square" },
];

const splitKeywords = (value: string) =>
  value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const readOptimizedImageAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxEdge = 2400;
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { alpha: true });
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas is not available."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/webp", 0.88));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image optimization failed."));
    };

    image.src = objectUrl;
  });

const readMediaFileAsDataUrl = (file: File) => {
  const shouldOptimize =
    file.type.startsWith("image/") &&
    file.type !== "image/gif" &&
    file.type !== "image/svg+xml";

  return shouldOptimize ? readOptimizedImageAsDataUrl(file) : readFileAsDataUrl(file);
};

const EditorMediaPreview = memo(function EditorMediaPreview({
  image,
  index,
}: {
  image: EditablePortfolioImage;
  index: number;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(index < 8);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(preview);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div className="editor-media-preview" ref={previewRef}>
      {isVisible && image.type === "video" ? (
        <video src={image.src} muted playsInline preload="metadata" />
      ) : isVisible && image.src ? (
        <img src={image.src} alt={image.alt} loading="lazy" decoding="async" />
      ) : (
        <span>{index + 1}</span>
      )}
    </div>
  );
});

export function PortfolioEditor({
  projectId,
  projectName,
  language,
  images,
  copy,
  onApply,
  onReset,
  onClose,
}: PortfolioEditorProps) {
  const [draftImages, setDraftImages] = useState<EditablePortfolioImage[]>(images);
  const [draftCopy, setDraftCopy] = useState<EditableProjectCopy>(copy);
  const [message, setMessage] = useState("");
  const [historyVersions, setHistoryVersions] = useState<HistoryVersion[]>([]);
  const onApplyRef = useRef(onApply);
  const hasUserEditRef = useRef(false);

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    setDraftImages(images);
    setDraftCopy(copy);
    setMessage("");
    hasUserEditRef.current = false;
  }, [projectId, images, copy]);

  useEffect(() => {
    void listPortfolioHistoryVersions().then(setHistoryVersions);
  }, []);

  const refreshHistory = async () => {
    setHistoryVersions(await listPortfolioHistoryVersions());
  };

  const syncToParent = () => {
    onApplyRef.current({ images: draftImages, copy: draftCopy });
  };

  const enabledCount = useMemo(
    () => draftImages.filter((image) => image.enabled).length,
    [draftImages],
  );

  const updateCopy = (patch: Partial<EditableProjectCopy>) => {
    setDraftCopy((current) => {
      const next = { ...current, ...patch };
      // 同步到父组件（使用 setTimeout 确保状态已更新）
      setTimeout(() => onApplyRef.current({ images: draftImages, copy: next }), 0);
      return next;
    });
  };

  const updateTypography = (
    patch: Partial<NonNullable<EditableProjectCopy["typography"]>>,
  ) => {
    setDraftCopy((current) => {
      const next = {
        ...current,
        typography: {
          ...defaultProjectTypography,
          ...(current.typography ?? {}),
          ...patch,
        },
      };
      setTimeout(() => onApplyRef.current({ images: draftImages, copy: next }), 0);
      return next;
    });
  };

  const updateItem = (index: number, patch: Partial<EditablePortfolioImage>) => {
    setDraftImages((current) => {
      const next = current.map((image, imageIndex) => (imageIndex === index ? { ...image, ...patch } : image));
      setTimeout(() => onApplyRef.current({ images: next, copy: draftCopy }), 0);
      return next;
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setDraftImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      setTimeout(() => onApplyRef.current({ images: next, copy: draftCopy }), 0);
      return next;
    });
  };

  const removeItem = (index: number) => {
    setDraftImages((current) => {
      const next = current.filter((_, imageIndex) => imageIndex !== index);
      setTimeout(() => onApplyRef.current({ images: next, copy: draftCopy }), 0);
      return next;
    });
    setMessage(language === "en" ? "Removed. Save to keep this change." : "已删除，点击保存后永久生效。");
  };

  const addItem = () => {
    setDraftImages((current) => {
      const next = [
        ...current,
        {
          src: "",
          alt: projectName,
          caption: language === "en" ? "New media" : "新图片",
          type: "image",
          enabled: true,
          fit: "contain",
          objectPosition: "center center",
          span: "auto",
          zoom: 1,
        },
      ] as EditablePortfolioImage[];
      setTimeout(() => onApplyRef.current({ images: next, copy: draftCopy }), 0);
      return next;
    });
  };

  const replaceWithFile = async (index: number, file?: File) => {
    if (!file) {
      return;
    }

    try {
      const src = await readMediaFileAsDataUrl(file);
      setDraftImages((current) => {
        const next = current.map((image, imageIndex) =>
          imageIndex === index
            ? {
                ...image,
                src,
                type: file.type.startsWith("video/") ? "video" as const : "image" as const,
                caption: current[index]?.caption || file.name.replace(/\.[^.]+$/, ""),
                alt: `${projectName} ${file.name}`,
              }
            : image,
        );
        setTimeout(() => onApplyRef.current({ images: next, copy: draftCopy }), 0);
        return next;
      });
      setMessage(language === "en" ? "Loaded. Save to keep it." : "已载入，点击保存后永久生效。");
    } catch {
      setMessage(language === "en" ? "Failed to read this file." : "读取文件失败。");
    }
  };

  const saveDraft = async () => {
    try {
      const synced = await saveProjectOverrideAsync(projectId, draftImages, draftCopy);
      const payload = synced ?? { images: draftImages, copy: draftCopy };
      setDraftImages(payload.images);
      setDraftCopy(payload.copy);
      onApplyRef.current(payload);
      await refreshHistory();
      setMessage(language === "en" ? "Saved." : "已保存。");
    } catch {
      setMessage(language === "en" ? "Live preview applied, but storage failed." : "预览已应用，但浏览器保存失败。");
    }
  };

  const deleteProject = async () => {
    const hiddenCopy: EditableProjectCopy = { ...draftCopy, hidden: true };
    setDraftCopy(hiddenCopy);
    onApplyRef.current({ images: draftImages, copy: hiddenCopy });

    try {
      await saveProjectOverrideAsync(projectId, draftImages, hiddenCopy);
      await refreshHistory();
      setMessage(language === "en" ? "Project removed." : "项目已隐藏。");
    } catch {
      setMessage(language === "en" ? "Removed in preview, but storage failed." : "预览已隐藏，但浏览器保存失败。");
    }
  };

  const rollbackVersion = async (archiveName: string) => {
    const confirmed = window.confirm(
      language === "en"
        ? `Rollback to ${archiveName}? The current state will be archived first.`
        : `回滚到 ${archiveName}？当前状态会先被归档。`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await rollbackPortfolioHistoryVersion(archiveName);
      await refreshHistory();
      window.location.reload();
    } catch {
      setMessage(language === "en" ? "Rollback failed." : "回滚失败。");
    }
  };

  const resetProject = async () => {
    try {
      await resetProjectOverrideAsync(projectId);
      setMessage(language === "en" ? "Project reset to original." : "已恢复为初始状态。");
      onReset();
    } catch {
      setMessage(language === "en" ? "Reset failed." : "重置失败。");
    }
  };

  return (
    <div className="portfolio-editor" onClick={(event) => event.stopPropagation()}>
      <div className="portfolio-editor-panel">
        <header className="portfolio-editor-head">
          <div>
            <p>{language === "en" ? "Project manager" : "项目管理"}</p>
            <h2>{language === "en" ? draftCopy.nameEn : draftCopy.name}</h2>
          </div>
          <button type="button" className="editor-icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="portfolio-editor-actions">
          <button type="button" onClick={addItem}>
            <Plus size={14} />
            <span>{language === "en" ? "Add media" : "添加图片"}</span>
          </button>
          <button type="button" onClick={saveDraft}>
            <Save size={14} />
            <span>{language === "en" ? "Save" : "保存"}</span>
          </button>
          <button type="button" onClick={resetProject}>
            <Trash2 size={14} />
            <span>{language === "en" ? "Reset" : "重置"}</span>
          </button>
          <button type="button" className="editor-danger-action" onClick={deleteProject}>
            <Trash2 size={14} />
            <span>{language === "en" ? "Delete project" : "删除项目"}</span>
          </button>
        </div>

        <div className="portfolio-editor-note">
          <span>{enabledCount} / {draftImages.length}</span>
          <p>
            {language === "en"
              ? "Edits preview instantly. Press Save to keep them after refresh."
              : "修改会立即预览，点击保存后刷新也会保留。"}
          </p>
        </div>

        <div className="portfolio-editor-scroll">
          <section className="editor-history-panel" aria-label={language === "en" ? "History versions" : "历史版本"}>
            <div className="editor-history-head">
              <div>
                <span>{language === "en" ? "History" : "历史版本"}</span>
                <small>{language === "en" ? "D drive archives" : "D盘归档"}</small>
              </div>
              <button type="button" onClick={refreshHistory}>
                {language === "en" ? "Refresh" : "刷新"}
              </button>
            </div>
            <div className="editor-history-list">
              {historyVersions.length ? (
                historyVersions.slice(0, 20).map((version) => (
                  <button
                    type="button"
                    key={`${version.archiveName}-${version.action}`}
                    onClick={() => rollbackVersion(version.archiveName)}
                    title={version.createdAt}
                  >
                    <span>{version.archiveName}</span>
                    <small>{version.kind ? `${version.kind} / ` : ""}{version.action}{version.projectId ? ` / ${version.projectId}` : ""}</small>
                  </button>
                ))
              ) : (
                <p>{language === "en" ? "No archived versions yet." : "暂无历史归档。"}</p>
              )}
            </div>
          </section>

          <section className="editor-copy-grid" aria-label={language === "en" ? "Project copy" : "项目文案"}>
            <label>
              <span>{language === "en" ? "Chinese project name" : "项目中文名"}</span>
              <input value={draftCopy.name} onChange={(event) => updateCopy({ name: event.target.value })} />
            </label>
            <label>
              <span>{language === "en" ? "English project name" : "项目英文名"}</span>
              <input value={draftCopy.nameEn} onChange={(event) => updateCopy({ nameEn: event.target.value })} />
            </label>
            <label>
              <span>{language === "en" ? "Display title" : "大标题"}</span>
              <input value={draftCopy.title} onChange={(event) => updateCopy({ title: event.target.value })} />
            </label>
            <label>
              <span>{language === "en" ? "Subtitle" : "副标题"}</span>
              <input value={draftCopy.subtitle} onChange={(event) => updateCopy({ subtitle: event.target.value })} />
            </label>
            <label className="editor-wide-field">
              <span>{language === "en" ? "Chinese intro" : "中文简介"}</span>
              <textarea value={draftCopy.intro} onChange={(event) => updateCopy({ intro: event.target.value })} />
            </label>
            <label className="editor-wide-field">
              <span>{language === "en" ? "English intro" : "英文简介"}</span>
              <textarea value={draftCopy.introEn} onChange={(event) => updateCopy({ introEn: event.target.value })} />
            </label>
            <label className="editor-wide-field">
              <span>{language === "en" ? "Keywords" : "关键词"}</span>
              <input
                value={draftCopy.keywords.join("，")}
                onChange={(event) => updateCopy({ keywords: splitKeywords(event.target.value) })}
                placeholder={language === "en" ? "Separate with commas" : "用逗号分隔"}
              />
            </label>

            <div className="editor-wide-field editor-type-grid">
              <label>
                <span>{language === "en" ? "Chinese font" : "中文字体"}</span>
                <select
                  value={draftCopy.typography?.cnFontFamily ?? defaultProjectTypography.cnFontFamily}
                  onChange={(event) => updateTypography({ cnFontFamily: event.target.value })}
                >
                  {fontOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === "en" ? option.en : option.cn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{language === "en" ? "English font" : "英文字体"}</span>
                <select
                  value={draftCopy.typography?.enFontFamily ?? defaultProjectTypography.enFontFamily}
                  onChange={(event) => updateTypography({ enFontFamily: event.target.value })}
                >
                  {fontOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === "en" ? option.en : option.cn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="editor-range-field">
                <span>{language === "en" ? "Chinese title size" : "中文标题大小"}</span>
                <input
                  type="range"
                  min="0.72"
                  max="1.35"
                  step="0.01"
                  value={draftCopy.typography?.cnTitleSize ?? defaultProjectTypography.cnTitleSize}
                  onChange={(event) => updateTypography({ cnTitleSize: Number(event.target.value) })}
                />
              </label>
              <label className="editor-range-field">
                <span>{language === "en" ? "English title size" : "英文标题大小"}</span>
                <input
                  type="range"
                  min="0.72"
                  max="1.12"
                  step="0.01"
                  value={draftCopy.typography?.enTitleSize ?? defaultProjectTypography.enTitleSize}
                  onChange={(event) => updateTypography({ enTitleSize: Number(event.target.value) })}
                />
              </label>
              <label className="editor-range-field">
                <span>{language === "en" ? "Chinese body size" : "中文正文大小"}</span>
                <input
                  type="range"
                  min="0.78"
                  max="1.28"
                  step="0.01"
                  value={draftCopy.typography?.cnBodySize ?? defaultProjectTypography.cnBodySize}
                  onChange={(event) => updateTypography({ cnBodySize: Number(event.target.value) })}
                />
              </label>
              <label className="editor-range-field">
                <span>{language === "en" ? "English body size" : "英文正文大小"}</span>
                <input
                  type="range"
                  min="0.78"
                  max="1.28"
                  step="0.01"
                  value={draftCopy.typography?.enBodySize ?? defaultProjectTypography.enBodySize}
                  onChange={(event) => updateTypography({ enBodySize: Number(event.target.value) })}
                />
              </label>
            </div>
          </section>

          <div className="portfolio-editor-list">
            {draftImages.map((image, index) => (
              <article
                className={image.enabled ? "editor-media-row" : "editor-media-row is-disabled"}
                key={`${index}-${image.type ?? "image"}-${image.caption}`}
              >
                <EditorMediaPreview image={image} index={index} />

                <div className="editor-media-fields">
                  <input
                    value={image.caption}
                    onChange={(event) => updateItem(index, { caption: event.target.value })}
                    placeholder={language === "en" ? "Internal note" : "内部备注"}
                  />
                  <div className="editor-field-row">
                    <select
                      value={image.span ?? "auto"}
                      onChange={(event) => updateItem(index, { span: event.target.value as PortfolioImage["span"] })}
                    >
                      {spanOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {language === "en" ? option.en : option.cn}
                        </option>
                      ))}
                    </select>
                    <select
                      value={image.fit ?? "contain"}
                      onChange={(event) => updateItem(index, { fit: event.target.value as "cover" | "contain" })}
                    >
                      <option value="contain">{language === "en" ? "Fit" : "完整显示"}</option>
                      <option value="cover">{language === "en" ? "Crop" : "裁切填充"}</option>
                    </select>
                  </div>
                  <div className="editor-field-row">
                    <label className="editor-range-field">
                      <span>{language === "en" ? "Zoom" : "缩放"}</span>
                      <input
                        type="range"
                        min="1"
                        max="1.8"
                        step="0.05"
                        value={image.zoom ?? 1}
                        onChange={(event) => updateItem(index, { zoom: Number(event.target.value) })}
                      />
                    </label>
                    <label className="editor-file-button">
                      <Upload size={13} />
                      <span>{language === "en" ? "Replace" : "替换"}</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(event) => replaceWithFile(index, event.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>

                <div className="editor-media-controls">
                  <button type="button" onClick={() => moveItem(index, -1)} aria-label="Move up">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveItem(index, 1)} aria-label="Move down">
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" onClick={() => updateItem(index, { enabled: !image.enabled })}>
                    {image.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    type="button"
                    className="editor-danger-button"
                    onClick={() => removeItem(index)}
                    aria-label={language === "en" ? "Delete media" : "删除图片"}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {message ? <p className="portfolio-editor-message">{message}</p> : null}
      </div>
    </div>
  );
}
