import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { PortfolioImage } from "../../data/portfolio";

export type LayoutPreset = "single" | "pair" | "trio" | "quad" | "pairScreens" | "five" | "mosaic" | "wide";

type LazyArtworkProps = {
  image: PortfolioImage;
  priority?: boolean;
  editable?: boolean;
  editIndex?: number;
  onLayoutChange?: (patch: Partial<PortfolioImage>) => void;
  onLayoutCommit?: (patch: Partial<PortfolioImage>) => void;
  onLayoutPreset?: (preset: LayoutPreset) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const spanToColumns = (span?: PortfolioImage["span"]) => {
  if (span === "full") return 12;
  if (span === "wide") return 9;
  if (span === "tall" || span === "square") return 5;
  return 6;
};

export function LazyArtwork({
  image,
  priority = false,
  editable = false,
  editIndex,
  onLayoutChange,
  onLayoutCommit,
  onLayoutPreset,
}: LazyArtworkProps) {
  const frameRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const isVideo = image.type === "video";
  const frameStyle = {
    "--artwork-fit": image.fit ?? "cover",
    "--artwork-position": image.objectPosition ?? "center center",
    "--artwork-zoom": image.zoom ?? 1,
    "--grid-start": image.gridStart,
    "--grid-span": image.gridSpan,
    "--artwork-ratio": image.layoutRatio,
    "--free-x": `${image.freeX ?? 0}px`,
    "--free-y": `${image.freeY ?? 0}px`,
    "--free-scale": image.freeScale ?? 1,
  } as CSSProperties;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );

    observer.observe(frame);
    return () => observer.disconnect();
  }, [isVisible]);

  const beginLayoutDrag = (event: ReactPointerEvent<HTMLElement>, mode: "move" | "resize") => {
    if (!editable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    frame.setPointerCapture(event.pointerId);

    const baseSpan = image.gridSpan ?? spanToColumns(image.span);
    const baseStart = image.gridStart ?? 1;
    const baseRatio = image.layoutRatio ?? 1.6;
    const baseFreeX = image.freeX ?? 0;
    const baseFreeY = image.freeY ?? 0;
    const baseFreeScale = image.freeScale ?? 1;
    const startX = event.clientX;
    const startY = event.clientY;
    let latestPatch: Partial<PortfolioImage> = {
      gridStart: baseStart,
      gridSpan: baseSpan,
      layoutRatio: baseRatio,
      span: "auto",
      freeX: baseFreeX,
      freeY: baseFreeY,
      freeScale: baseFreeScale,
    };

    frame.style.setProperty("--grid-start", String(baseStart));
    frame.style.setProperty("--grid-span", String(baseSpan));
    frame.style.setProperty("--artwork-ratio", String(baseRatio));
    frame.style.setProperty("--free-x", `${baseFreeX}px`);
    frame.style.setProperty("--free-y", `${baseFreeY}px`);
    frame.style.setProperty("--free-scale", String(baseFreeScale));

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (mode === "move") {
        const nextX = Math.round(baseFreeX + deltaX);
        const nextY = Math.round(baseFreeY + deltaY);
        latestPatch = { freeX: nextX, freeY: nextY, freeScale: baseFreeScale };
        frame.style.setProperty("--free-x", `${nextX}px`);
        frame.style.setProperty("--free-y", `${nextY}px`);
        return;
      }

      const diagonalDelta = (deltaX + deltaY) / 2;
      const nextScale = Number(clamp(baseFreeScale + diagonalDelta / 320, 0.35, 2.4).toFixed(2));
      latestPatch = {
        freeX: baseFreeX,
        freeY: baseFreeY,
        freeScale: nextScale,
      };
      frame.style.setProperty("--free-scale", String(nextScale));
    };

    const onUp = () => {
      frame.releasePointerCapture(event.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onLayoutChange?.(latestPatch);
      onLayoutCommit?.(latestPatch);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const applyPreset = (
    event: ReactPointerEvent<HTMLButtonElement>,
    preset: LayoutPreset,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onLayoutPreset?.(preset);
  };

  return (
    <figure
      ref={frameRef}
      className={[
        "artwork-frame",
        isLoaded ? "is-loaded" : "",
        isVideo ? "is-video" : "",
        editable ? "is-editable" : "",
        image.gridSpan ? "has-direct-layout" : "",
        image.freeX || image.freeY || image.freeScale && image.freeScale !== 1 ? "has-free-layout" : "",
        image.span && image.span !== "auto" ? `is-${image.span}` : "",
      ].filter(Boolean).join(" ")}
      style={frameStyle}
      onPointerDown={(event) => beginLayoutDrag(event, "move")}
    >
      {editable ? (
        <div className="artwork-edit-badge">
          <span>{typeof editIndex === "number" ? editIndex + 1 : ""}</span>
          <small>拖动</small>
        </div>
      ) : null}
      {editable ? (
        <div className="artwork-layout-presets" aria-label="Quick layout presets">
          <button type="button" onPointerDown={(event) => applyPreset(event, "single")}>
            单图
          </button>
          <button type="button" onPointerDown={(event) => applyPreset(event, "pair")}>
            双图
          </button>
          <button type="button" onPointerDown={(event) => applyPreset(event, "trio")}>
            三图
          </button>
          <button type="button" onPointerDown={(event) => applyPreset(event, "quad")}>
            四图
          </button>
          <button type="button" onPointerDown={(event) => applyPreset(event, "pairScreens")}>
            2x2
          </button>
          <button type="button" onPointerDown={(event) => applyPreset(event, "five")}>
            五图
          </button>
          <button type="button" onPointerDown={(event) => applyPreset(event, "mosaic")}>
            多图
          </button>
          <button type="button" onPointerDown={(event) => applyPreset(event, "wide")}>
            宽图
          </button>
        </div>
      ) : null}
      {isVisible && isVideo ? (
        <video
          src={image.src}
          aria-label={image.alt}
          muted
          loop
          playsInline
          autoPlay
          preload={priority ? "auto" : "metadata"}
          onLoadedData={() => setIsLoaded(true)}
        />
      ) : isVisible ? (
        <img
          src={image.src}
          alt={image.alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setIsLoaded(true)}
        />
      ) : null}
      {editable ? (
        <button
          type="button"
          className="artwork-resize-handle"
          aria-label="Resize artwork"
          onPointerDown={(event) => beginLayoutDrag(event, "resize")}
        />
      ) : null}
    </figure>
  );
}
