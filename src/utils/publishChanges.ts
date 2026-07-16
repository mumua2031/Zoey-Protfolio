export type PublishResult = {
  ok: boolean;
  skipped?: boolean;
  commit?: string;
  message?: string;
  error?: string;
  changedFiles?: string[];
};

export const publishEditorChanges = async (): Promise<PublishResult> => {
  try {
    const response = await fetch("/api/portfolio/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "editor-publish" }),
    });

    const payload = (await response.json()) as PublishResult;
    if (!response.ok) {
      return { ok: false, error: payload.error ?? "同步上线失败。" };
    }

    return payload;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "当前页面无法连接本地发布接口。",
    };
  }
};
