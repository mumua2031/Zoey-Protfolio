import { useCallback, useRef } from "react";
import { categoryMap, type ProjectCategoryId } from "../data/portfolio";

export function usePortfolioPrefetch() {
  const prefetched = useRef(new Set<ProjectCategoryId>());

  return useCallback((categoryId: ProjectCategoryId) => {
    if (prefetched.current.has(categoryId)) {
      return;
    }

    const category = categoryMap.get(categoryId);
    if (!category) {
      return;
    }

    prefetched.current.add(categoryId);
    const preload = () => {
      category.projects
        .flatMap((project) => project.images)
        .filter((image) => image.type !== "video")
        .slice(0, 8)
        .forEach((image) => {
          const preview = new Image();
          preview.decoding = "async";
          preview.loading = "eager";
          preview.src = image.src;
          void preview.decode?.().catch(() => undefined);
        });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preload, { timeout: 900 });
    } else {
      globalThis.setTimeout(preload, 0);
    }
  }, []);
}

export function prefetchPortfolioCategory(categoryId: ProjectCategoryId) {
  const category = categoryMap.get(categoryId);
  if (!category) {
    return;
  }

  category.projects
    .flatMap((project) => project.images)
    .filter((image) => image.type !== "video")
    .slice(0, 8)
    .forEach((image) => {
        const preview = new Image();
        preview.decoding = "async";
        preview.loading = "eager";
        preview.src = image.src;
        void preview.decode?.().catch(() => undefined);
      });
}
