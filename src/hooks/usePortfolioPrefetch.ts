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
    category.projects
      .flatMap((project) => project.images)
      .slice(0, 3)
      .forEach((image) => {
        const preview = new Image();
        preview.decoding = "async";
        preview.loading = "eager";
        preview.src = image.src;
      });
  }, []);
}
