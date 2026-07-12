import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { categories, type ProjectCategoryId } from "../data/portfolio";
import rawHotspots from "../data/studioHotspots.json";
import { usePortfolioPrefetch } from "../hooks/usePortfolioPrefetch";
import { usePortfolioStore } from "../store/usePortfolioStore";

type StudioHotspot = {
  id: string;
  name: string;
  categoryId: ProjectCategoryId;
  x: number;
  y: number;
  labelOffsetX: number;
  labelOffsetY: number;
};

type ScreenPoint = {
  left: number;
  top: number;
};

const hotspots = rawHotspots as StudioHotspot[];
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const roamSpring = { stiffness: 70, damping: 22, mass: 0.82 };
const zoomSpring = { stiffness: 95, damping: 24, mass: 0.9 };
const parallaxRatio = 0.05;

function computeCoverPoint(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  xPercent: number,
  yPercent: number,
): ScreenPoint {
  const scale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;

  return {
    left: offsetX + renderedWidth * (xPercent / 100),
    top: offsetY + renderedHeight * (yPercent / 100),
  };
}

export function PanoramaStudio() {
  const layerRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressConsumedRef = useRef(false);
  const [imageSize, setImageSize] = useState({ width: 1920, height: 848 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const hasStarted = usePortfolioStore((state) => state.hasStarted);
  const isHomeCopyVisible = usePortfolioStore((state) => state.isHomeCopyVisible);
  const areHotspotsVisible = usePortfolioStore((state) => state.areHotspotsVisible);
  const activeCategoryId = usePortfolioStore((state) => state.activeCategoryId);
  const activePrimary = usePortfolioStore((state) => state.activePrimary);
  const isTerminalOpen = usePortfolioStore((state) => state.isTerminalOpen);
  const language = usePortfolioStore((state) => state.language);
  const openProject = usePortfolioStore((state) => state.openProject);
  const dismissHomeCopy = usePortfolioStore((state) => state.dismissHomeCopy);
  const showHomeCopy = usePortfolioStore((state) => state.showHomeCopy);
  const toggleHotspots = usePortfolioStore((state) => state.toggleHotspots);
  const resetExperience = usePortfolioStore((state) => state.resetExperience);
  const prefetch = usePortfolioPrefetch();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const targetScale = useMotionValue(1);
  const springX = useSpring(targetX, roamSpring);
  const springY = useSpring(targetY, roamSpring);
  const springScale = useSpring(targetScale, zoomSpring);

  const categoryLabels = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.id,
          language === "en" ? category.labelEn : category.label,
        ]),
      ),
    [language],
  );
  const categorySubLabels = useMemo(
    () => new Map(categories.map((category) => [category.id, category.labelEn])),
    [],
  );

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    setStageSize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (stageRef.current) {
      observer.observe(stageRef.current);
    }
    return () => observer.disconnect();
  }, [measure]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!hasStarted) {
        return;
      }
      const layer = layerRef.current;
      if (!layer) {
        return;
      }
      const rect = layer.getBoundingClientRect();
      const deltaX = event.clientX - (rect.left + rect.width / 2);
      const deltaY = event.clientY - (rect.top + rect.height / 2);
      targetX.set(-deltaX * parallaxRatio);
      targetY.set(-deltaY * parallaxRatio);
    },
    [hasStarted, targetX, targetY],
  );

  const handlePointerLeave = useCallback(() => {
    targetX.set(0);
    targetY.set(0);
  }, [targetX, targetY]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      if (!hasStarted) {
        return;
      }
      const current = targetScale.get();
      const next = Math.min(1.08, Math.max(0.98, current - event.deltaY * 0.00045));
      targetScale.set(next);
    },
    [hasStarted, targetScale],
  );

  const handleSceneClick = useCallback(() => {
    if (!hasStarted) {
      return;
    }
    if (longPressConsumedRef.current) {
      longPressConsumedRef.current = false;
      return;
    }
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      if (window.matchMedia("(max-width: 992px)").matches) {
        if (isHomeCopyVisible) {
          dismissHomeCopy();
          return;
        }
        if (areHotspotsVisible) {
          showHomeCopy();
          return;
        }
        toggleHotspots();
        return;
      }
      if (isHomeCopyVisible) {
        dismissHomeCopy();
        return;
      }
      toggleHotspots();
    }, 230);
  }, [areHotspotsVisible, dismissHomeCopy, hasStarted, isHomeCopyVisible, showHomeCopy, toggleHotspots]);

  const handleSceneDoubleClick = useCallback(() => {
    if (!hasStarted) {
      return;
    }
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    showHomeCopy();
  }, [hasStarted, showHomeCopy]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!hasStarted || activePrimary || isTerminalOpen) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest(".studio-hotspot, .intro-viewfinder")) {
        return;
      }
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressConsumedRef.current = true;
        if (clickTimerRef.current) {
          window.clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        resetExperience();
      }, 900);
    },
    [activePrimary, hasStarted, isTerminalOpen, resetExperience],
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleScenePointerLeave = useCallback(() => {
    handlePointerLeave();
    clearLongPress();
  }, [clearLongPress, handlePointerLeave]);

  useEffect(
    () => () => {
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
      }
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    [],
  );

  const positionedHotspots = hotspots.map((hotspot) => ({
    ...hotspot,
    point: computeCoverPoint(
      stageSize.width || 1,
      stageSize.height || 1,
      imageSize.width,
      imageSize.height,
      hotspot.x,
      hotspot.y,
    ),
  }));

  return (
    <section
      ref={layerRef}
      className={hasStarted ? "panorama-layer is-focused" : "panorama-layer"}
      aria-label={language === "en" ? "Portfolio studio panoramic background" : "作品集工作室全景背景"}
      onPointerMove={handlePointerMove}
      onPointerLeave={handleScenePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onWheel={handleWheel}
      onClick={handleSceneClick}
      onDoubleClick={handleSceneDoubleClick}
    >
      <motion.div
        ref={stageRef}
        className="panorama-stage"
        style={{ x: springX, y: springY, scale: springScale }}
      >
        <motion.img
          className="panorama-image"
          src="/assets/studio-panorama.png"
          alt=""
          decoding="async"
          draggable={false}
          initial={false}
          animate={{
            filter: hasStarted ? "blur(0px)" : "blur(20px)",
            scale: hasStarted ? 1 : 1.035,
          }}
          transition={spring}
          onLoad={(event) => {
            setImageSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
            measure();
          }}
        />
        <div className="panorama-shade" aria-hidden="true" />

        <motion.div
          className="hotspot-layer"
          initial={false}
          animate={{
            opacity: hasStarted && areHotspotsVisible ? 1 : 0,
            y: hasStarted && areHotspotsVisible ? 0 : 10,
          }}
          transition={spring}
          aria-hidden={!hasStarted || !areHotspotsVisible}
        >
          {positionedHotspots.map((hotspot) => {
            const dx = hotspot.labelOffsetX;
            const dy = hotspot.labelOffsetY;
            const length = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
              <div
                key={hotspot.id}
                className="hotspot-anchor"
                style={{
                  transform: `translate3d(${hotspot.point.left}px, ${hotspot.point.top}px, 0)`,
                  ["--line-length" as string]: `${length}px`,
                  ["--line-angle" as string]: `${angle}deg`,
                }}
              >
                <span className="hotspot-pin" aria-hidden="true" />
                <div
                  className="hotspot-card"
                  style={{
                    transform: `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`,
                  }}
                >
                  <motion.button
                    type="button"
                    className={
                      activeCategoryId === hotspot.categoryId
                        ? "studio-hotspot is-active"
                        : "studio-hotspot"
                    }
                    onMouseEnter={() => prefetch(hotspot.categoryId)}
                    onFocus={() => prefetch(hotspot.categoryId)}
                    onClick={(event) => {
                      event.stopPropagation();
                      openProject(hotspot.categoryId);
                    }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={spring}
                    aria-label={
                      language === "en"
                        ? `Open ${categoryLabels.get(hotspot.categoryId)}`
                        : `打开${hotspot.name}`
                    }
                  >
                    <span>{language === "en" ? categoryLabels.get(hotspot.categoryId) : hotspot.name}</span>
                    <small>{language === "en" ? "Portfolio" : categorySubLabels.get(hotspot.categoryId)}</small>
                  </motion.button>
                </div>
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
