import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useGesture } from "@use-gesture/react";
import "./DomeGallery.css";

type DomeGalleryImage = string | { src: string; alt?: string };

type DomeGalleryProps = {
  images?: DomeGalleryImage[];
  fit?: number;
  fitBasis?: "auto" | "min" | "max" | "width" | "height";
  minRadius?: number;
  maxRadius?: number;
  padFactor?: number;
  overlayBlurColor?: string;
  maxVerticalRotationDeg?: number;
  dragSensitivity?: number;
  segments?: number;
  dragDampening?: number;
  imageBorderRadius?: string;
  grayscale?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

type DomeItem = {
  x: number;
  y: number;
  sizeX: number;
  sizeY: number;
  src: string;
  alt: string;
};

const DEFAULT_IMAGES: DomeGalleryImage[] = [
  { src: "/assets/about/zoey-profile.jpg", alt: "Zoey profile" },
  { src: "/assets/visual-design.svg", alt: "Visual Design" },
  { src: "/assets/aigc-design.svg", alt: "AIGC Design" },
  { src: "/assets/fashion-design.svg", alt: "Fashion Design" },
  { src: "/assets/interior-design.svg", alt: "Interior Design" },
  { src: "/assets/painting-work.svg", alt: "Painting" },
  { src: "/assets/photography-work.svg", alt: "Other Works" },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const wrapAngleSigned = (deg: number) => {
  const angle = (((deg + 180) % 360) + 360) % 360;
  return angle - 180;
};

function buildItems(pool: DomeGalleryImage[], segments: number): DomeItem[] {
  const xCols = Array.from({ length: segments }, (_, index) => -37 + index * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];
  const coords = xCols.flatMap((x, column) => {
    const ys = column % 2 === 0 ? evenYs : oddYs;
    return ys.map((y) => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const normalizedImages = pool.map((image) =>
    typeof image === "string" ? { src: image, alt: "" } : { src: image.src || "", alt: image.alt || "" },
  );
  const sourceImages = normalizedImages.length ? normalizedImages : [{ src: "", alt: "" }];
  const usedImages = Array.from({ length: coords.length }, (_, index) => sourceImages[index % sourceImages.length]);

  for (let index = 1; index < usedImages.length; index += 1) {
    if (usedImages[index].src === usedImages[index - 1].src) {
      const swapIndex = usedImages.findIndex((image, candidateIndex) => candidateIndex > index && image.src !== usedImages[index].src);
      if (swapIndex > index) {
        [usedImages[index], usedImages[swapIndex]] = [usedImages[swapIndex], usedImages[index]];
      }
    }
  }

  return coords.map((coord, index) => ({
    ...coord,
    src: usedImages[index].src,
    alt: usedImages[index].alt,
  }));
}

export default function DomeGallery({
  images = DEFAULT_IMAGES,
  fit = 0.48,
  fitBasis = "auto",
  minRadius = 520,
  maxRadius = Infinity,
  padFactor = 0.22,
  overlayBlurColor = "#f4f4f4",
  maxVerticalRotationDeg = 5,
  dragSensitivity = 20,
  segments = 35,
  dragDampening = 0.82,
  imageBorderRadius = "18px",
  grayscale = false,
  autoRotate = true,
  autoRotateSpeed = 2.4,
}: DomeGalleryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const sphereRef = useRef<HTMLDivElement | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const inertiaRef = useRef<number | null>(null);
  const autoRotateRef = useRef<number | null>(null);

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  const applyTransform = useCallback((xDeg: number, yDeg: number) => {
    if (sphereRef.current) {
      sphereRef.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  }, []);

  const stopInertia = useCallback(() => {
    if (inertiaRef.current) {
      window.cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
  }, []);

  const startInertia = useCallback(
    (velocityX: number, velocityY: number) => {
      let vx = clamp(velocityX, -1.4, 1.4) * 78;
      let vy = clamp(velocityY, -1.4, 1.4) * 78;
      const friction = 0.94 + 0.055 * clamp(dragDampening, 0, 1);
      let frames = 0;

      const step = () => {
        vx *= friction;
        vy *= friction;
        if ((Math.abs(vx) < 0.012 && Math.abs(vy) < 0.012) || frames > 260) {
          inertiaRef.current = null;
          return;
        }

        const nextX = clamp(rotationRef.current.x - vy / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg);
        const nextY = wrapAngleSigned(rotationRef.current.y + vx / 200);
        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);
        frames += 1;
        inertiaRef.current = window.requestAnimationFrame(step);
      };

      stopInertia();
      inertiaRef.current = window.requestAnimationFrame(step);
    },
    [applyTransform, dragDampening, maxVerticalRotationDeg, stopInertia],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const minDim = Math.min(width, height);
      const maxDim = Math.max(width, height);
      const aspect = width / height;
      const basis =
        fitBasis === "min"
          ? minDim
          : fitBasis === "max"
            ? maxDim
            : fitBasis === "width"
              ? width
              : fitBasis === "height"
                ? height
                : aspect >= 1.3
                  ? width
                  : minDim;
      const radius = Math.round(clamp(Math.min(basis * fit, height * 1.35), minRadius, maxRadius));
      const viewerPad = Math.max(8, Math.round(minDim * padFactor));

      root.style.setProperty("--radius", `${radius}px`);
      root.style.setProperty("--viewer-pad", `${viewerPad}px`);
      root.style.setProperty("--overlay-blur-color", overlayBlurColor);
      root.style.setProperty("--tile-radius", imageBorderRadius);
      root.style.setProperty("--image-filter", grayscale ? "grayscale(1)" : "none");
      applyTransform(rotationRef.current.x, rotationRef.current.y);
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, [applyTransform, fit, fitBasis, grayscale, imageBorderRadius, maxRadius, minRadius, overlayBlurColor, padFactor]);

  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y);
    return () => {
      stopInertia();
      if (autoRotateRef.current) {
        window.cancelAnimationFrame(autoRotateRef.current);
      }
    };
  }, [applyTransform, stopInertia]);

  useEffect(() => {
    if (!autoRotate) {
      return undefined;
    }

    let lastTime = performance.now();
    const step = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (!draggingRef.current && !inertiaRef.current) {
        const nextY = wrapAngleSigned(rotationRef.current.y + delta * autoRotateSpeed);
        rotationRef.current = { ...rotationRef.current, y: nextY };
        applyTransform(rotationRef.current.x, nextY);
      }

      autoRotateRef.current = window.requestAnimationFrame(step);
    };

    autoRotateRef.current = window.requestAnimationFrame(step);
    return () => {
      if (autoRotateRef.current) {
        window.cancelAnimationFrame(autoRotateRef.current);
        autoRotateRef.current = null;
      }
    };
  }, [applyTransform, autoRotate, autoRotateSpeed]);

  useGesture(
    {
      onDragStart: ({ event }) => {
        stopInertia();
        const pointerEvent = event as PointerEvent;
        draggingRef.current = true;
        startRotRef.current = { ...rotationRef.current };
        startPosRef.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
      },
      onDrag: ({ event, last, velocity = [0, 0], direction = [0, 0], movement }) => {
        if (!draggingRef.current || !startPosRef.current) {
          return;
        }

        const pointerEvent = event as PointerEvent;
        const dxTotal = pointerEvent.clientX - startPosRef.current.x;
        const dyTotal = pointerEvent.clientY - startPosRef.current.y;
        const nextX = clamp(startRotRef.current.x - dyTotal / dragSensitivity, -maxVerticalRotationDeg, maxVerticalRotationDeg);
        const nextY = wrapAngleSigned(startRotRef.current.y + dxTotal / dragSensitivity);
        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);

        if (last) {
          draggingRef.current = false;
          let [velocityX, velocityY] = velocity;
          const [directionX, directionY] = direction;
          velocityX *= directionX;
          velocityY *= directionY;

          if (Math.abs(velocityX) < 0.001 && Math.abs(velocityY) < 0.001 && Array.isArray(movement)) {
            const [movementX, movementY] = movement;
            velocityX = clamp((movementX / dragSensitivity) * 0.02, -1.2, 1.2);
            velocityY = clamp((movementY / dragSensitivity) * 0.02, -1.2, 1.2);
          }

          startInertia(velocityX, velocityY);
        }
      },
    },
    { target: mainRef, eventOptions: { passive: true } },
  );

  return (
    <div ref={rootRef} className="dg-root" style={{ "--segments-x": segments, "--segments-y": segments } as CSSProperties}>
      <main ref={mainRef} className="dg-main" aria-label="Awards dome gallery">
        <div className="dg-stage">
          <div ref={sphereRef} className="dg-sphere">
            {items.map((item, index) => (
              <div
                key={`${item.x},${item.y},${index}`}
                className="dg-item"
                style={
                  {
                    "--offset-x": item.x,
                    "--offset-y": item.y,
                    "--item-size-x": item.sizeX,
                    "--item-size-y": item.sizeY,
                  } as CSSProperties
                }
              >
                <div className="dg-item-image">
                  <img src={item.src} draggable={false} alt={item.alt} loading="lazy" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dg-overlay" />
        <div className="dg-overlay dg-overlay-blur" />
        <div className="dg-edge-fade dg-edge-fade-top" />
        <div className="dg-edge-fade dg-edge-fade-bottom" />
      </main>
    </div>
  );
}
