import { ArrowLeft, ImagePlus, RotateCcw, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import DomeGallery from "./DomeGallery";
import Lanyard from "./Lanyard";
import ScrollReveal from "./ScrollReveal";
import latestInfoTextOverrides from "../data/infoTextOverrides.latest.json";
import { SITE_COPY } from "../data/siteCopy";
import { usePortfolioStore, type PrimarySection } from "../store/usePortfolioStore";

const overlaySpring = { type: "spring" as const, stiffness: 280, damping: 32 };
const infoTextStorageKey = "zoey-info-page-text-overrides-v1";
const isMobileInfoViewport = () => typeof window !== "undefined" && window.matchMedia("(max-width: 992px)").matches;

type OverlayCopy = {
  eyebrow: string;
  title: string;
  body: string;
  meta: string[];
};

type InfoElementOffset = {
  x?: number;
  y?: number;
};

type InfoTextOverrideEntry = {
  title?: string;
  body?: string;
  mediaSrc?: string;
  mediaAlt?: string;
  mediaHidden?: boolean;
  copyOffset?: InfoElementOffset;
  mediaOffset?: InfoElementOffset;
};

type InfoTextOverrides = Record<string, InfoTextOverrideEntry>;
type ZoomedInfoMedia = { src: string; alt: string };
type LatestInfoTextOverrideStore = {
  version: number;
  updatedAt: string;
  overrides: InfoTextOverrides;
};
type TimelineMedia = "lanyard" | "image" | "text" | "dome" | "footer-services" | "footer-contact" | "signature";
type TimelineItem = { index: string; title: string; body: string; media: TimelineMedia; mediaSrc?: string; mediaAlt?: string };

const sourceInfoTextOverrides = (latestInfoTextOverrides as LatestInfoTextOverrideStore).overrides ?? {};

const isDeveloperUrl = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("dev") === "1" || params.get("edit") === "1";
};

const readInitialInfoTextOverrides = (): InfoTextOverrides => sourceInfoTextOverrides;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const clampOffset = (value: number) => Math.round(Math.max(-900, Math.min(900, value)));

const infoFooterServices = {
  cn: [
    ["(01)", "\u54c1\u724c\u89c6\u89c9", "\u5efa\u7acb\u6807\u5fd7\u3001\u8272\u5f69\u3001\u5b57\u4f53\u4e0e\u7248\u5f0f\u7cfb\u7edf\uff0c\u8ba9\u4f5c\u54c1\u548c\u54c1\u724c\u5728\u4e0d\u540c\u89e6\u70b9\u4fdd\u6301\u6e05\u6670\u8bc6\u522b\u3002"],
    ["(02)", "网站系统", "搭建全流程沉浸式浏览体验，以故事化动线串联全品类创作，细腻交互动效，同时预留轻量化模块化结构，降低长期迭代维护成本。"],
    ["(03)", "\u6570\u5b57\u5185\u5bb9", "\u6574\u5408\u7f51\u9875\u5185\u5bb9\u3001\u89c6\u89c9\u8d44\u4ea7\u3001\u56fe\u50cf\u751f\u6210\u3001\u6570\u636e\u5e93\u6574\u7406\u4e0e\u5185\u5bb9\u8fed\u4ee3\uff0c\u5f62\u6210\u53ef\u5c55\u793a\u3001\u53ef\u7ef4\u62a4\u7684\u6570\u5b57\u9879\u76ee\u3002"],
    ["(04)", "\u7a7a\u95f4\u53d9\u4e8b", "\u4ee5\u573a\u666f\u3001\u52a8\u7ebf\u3001\u6750\u8d28\u4e0e\u5c55\u793a\u5173\u7cfb\u7ec4\u7ec7\u7a7a\u95f4\u89c6\u89c9\uff0c\u4f7f\u6982\u5ff5\u66f4\u5bb9\u6613\u88ab\u7406\u89e3\u3002"],
    ["(05)", "\u670d\u88c5\u642d\u914d", "\u56f4\u7ed5\u5ed3\u5f62\u3001\u6750\u8d28\u3001\u8272\u5f69\u4e0e\u573a\u666f\u5efa\u7acb\u9020\u578b\u65b9\u5411\uff0c\u5f62\u6210\u5b8c\u6574\u89c6\u89c9\u8868\u8fbe\u3002"],
  ],
  en: [
    ["(01)", "Brand Identity", "Logo, color, typography, and layout systems for consistent recognition across touchpoints."],
    ["(02)", "Portfolio Website", "Immersive portfolio systems balancing narrative, clarity, motion, and future maintenance."],
    ["(03)", "Digital Content", "Web content, visual assets, generated imagery, database organization, and iterative content workflows."],
    ["(04)", "Spatial Storytelling", "Scenes, circulation, materials, and display logic shaped into readable spatial narratives."],
    ["(05)", "Fashion Styling", "Silhouette, material, color, and scene direction organized as complete visual expression."],
  ],
};

const infoFooterServicesDisplay = {
  cn: [
    ["(01)", "\u54c1\u724c\u89c6\u89c9", "\u5efa\u7acb\u6807\u5fd7\u3001\u8272\u5f69\u3001\u5b57\u4f53\u4e0e\u7248\u5f0f\u7cfb\u7edf\uff0c\u8ba9\u4f5c\u54c1\u548c\u54c1\u724c\u5728\u4e0d\u540c\u89e6\u70b9\u4fdd\u6301\u6e05\u6670\u8bc6\u522b\u3002"],
    ["(02)", "网站系统", "搭建全流程沉浸式浏览体验，以故事化动线串联全品类创作，细腻交互动效，同时预留轻量化模块化结构，降低长期迭代维护成本。"],
    ["(03)", "\u6570\u5b57\u5185\u5bb9", "\u6574\u5408\u7f51\u9875\u5185\u5bb9\u3001\u89c6\u89c9\u8d44\u4ea7\u3001\u56fe\u50cf\u751f\u6210\u3001\u6570\u636e\u5e93\u6574\u7406\u4e0e\u5185\u5bb9\u8fed\u4ee3\uff0c\u5f62\u6210\u53ef\u5c55\u793a\u3001\u53ef\u7ef4\u62a4\u7684\u6570\u5b57\u9879\u76ee\u3002"],
    ["(04)", "\u7a7a\u95f4\u53d9\u4e8b", "\u4ee5\u573a\u666f\u3001\u52a8\u7ebf\u3001\u6750\u8d28\u4e0e\u5c55\u793a\u5173\u7cfb\u7ec4\u7ec7\u7a7a\u95f4\u89c6\u89c9\uff0c\u4f7f\u6982\u5ff5\u66f4\u5bb9\u6613\u88ab\u7406\u89e3\u3002"],
    ["(05)", "\u670d\u88c5\u642d\u914d", "\u56f4\u7ed5\u5ed3\u5f62\u3001\u6750\u8d28\u3001\u8272\u5f69\u4e0e\u573a\u666f\u5efa\u7acb\u9020\u578b\u65b9\u5411\uff0c\u5f62\u6210\u5b8c\u6574\u89c6\u89c9\u8868\u8fbe\u3002"],
  ],
  en: [
    ["(01)", "Brand Identity", "Logo, color, typography, and layout systems for consistent recognition across touchpoints."],
    ["(02)", "Portfolio Website", "Immersive portfolio systems balancing narrative, clarity, motion, and future maintenance."],
    ["(03)", "Digital Content", "Web content, visual assets, generated imagery, database organization, and iterative content workflows."],
    ["(04)", "Spatial Storytelling", "Scenes, circulation, materials, and display logic shaped into readable spatial narratives."],
    ["(05)", "Fashion Styling", "Silhouette, material, color, and scene direction organized as complete visual expression."],
  ],
} as const;

const infoContactColumns = {
  cn: {
    profileTitle: "\u7b80\u4ecb",
    contactTitle: "\u63a5\u89e6",
    profile: [
      ["GitHub", "mumua2031"],
      ["LinkedIn", "www.linkedin.com/in/牧希-邹-ba2403419"],
    ],
    contact: [
      ["\u7535\u5b50\u90ae\u7bb1", "mumua2031@gmail.com"],
      ["ins", "mumu_ua"],
    ],
    footer: {
      copyright: "\u00a9 Zoey Portfolio 2026",
      address: "",
      timezoneLabel: "\u4e2d\u56fd\u9999\u6e2f",
    },
  },
  en: {
    profileTitle: "Profile",
    contactTitle: "Contact",
    profile: [
      ["GitHub", "mumua2031"],
      ["LinkedIn", "www.linkedin.com/in/牧希-邹-ba2403419"],
    ],
    contact: [
      ["Email", "mumua2031@gmail.com"],
      ["ins", "mumu_ua"],
    ],
    footer: {
      copyright: "\u00a9 Zoey Portfolio 2026",
      address: "",
      timezoneLabel: "Hong Kong",
    },
  },
} as const;

const hongKongClockFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Hong_Kong",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

const experienceDomeImages = [
  { src: "/assets/about/zoey-profile.jpg", alt: "Zoey profile" },
  { src: "/assets/visual-design.svg", alt: "Visual Design" },
  { src: "/assets/aigc-design.svg", alt: "Digital Content" },
  { src: "/assets/fashion-design.svg", alt: "Fashion Design" },
  { src: "/assets/interior-design.svg", alt: "Interior Design" },
  { src: "/assets/painting-work.svg", alt: "Painting" },
  { src: "/assets/photography-work.svg", alt: "Other Works" },
];

const certificateDomeImages = Array.from({ length: 22 }, (_, index) => ({
  src: `/assets/certificates/certificate-${String(index + 1).padStart(2, "0")}.png`,
  alt: `Certificate ${index + 1}`,
}));

const aboutChineseCopy: OverlayCopy = {
  eyebrow: "About Zoey",
  title: "\u4ece\u89c6\u89c9\u5230\u7a7a\u95f4\uff0c\u4ece\u5c40\u90e8\u5230\u6574\u4f53\uff0c\u6784\u5efa\u8bbe\u8ba1\u7684\u591a\u91cd\u53ef\u80fd\u3002",
  body:
    "\u90b9\u7267\u5e0c / Zoey\n\u590d\u5408\u578b\u8bbe\u8ba1\u5e08 \u00b7 \u6570\u5b57\u5185\u5bb9\u521b\u4f5c\u8005 \u00b7 \u8bbe\u8ba1\u5b66\u7855\u58eb\u7814\u7a76\u751f\n\n\u81ea\u5e7c\u7684\u827a\u672f\u4e0e\u7ed8\u753b\u8bad\u7ec3\uff0c\u57f9\u517b\u4e86\u6211\u5bf9\u8272\u5f69\u3001\u6784\u56fe\u3001\u5f62\u6001\u4e0e\u7ec6\u8282\u7684\u654f\u9510\u611f\u77e5\uff0c\u4e5f\u6210\u4e3a\u6211\u63a2\u7d22\u4e0d\u540c\u8bbe\u8ba1\u9886\u57df\u7684\u8d77\u70b9\u3002\n\n\u6211\u62e5\u6709\u89c6\u89c9\u3001\u670d\u88c5\u4e0e\u73af\u5883\u8bbe\u8ba1\u7684\u590d\u5408\u80cc\u666f\u3002\u591a\u4e13\u4e1a\u8bad\u7ec3\u5171\u540c\u5851\u9020\u4e86\u6211\u5bf9\u5c3a\u5ea6\u3001\u7ed3\u6784\u3001\u6750\u8d28\u4e0e\u53d9\u4e8b\u7684\u7406\u89e3\uff0c\u5e76\u6c89\u6dc0\u4e3a\u4e00\u5957\u8fde\u8d2f\u7684\u8bbe\u8ba1\u65b9\u6cd5\u3002\n\n\u6211\u7684\u5b9e\u8df5\u8986\u76d6\u54c1\u724c\u89c6\u89c9\u3001UI\u4e0e\u7f51\u9875\u3001\u6570\u5b57\u5185\u5bb9\u3001\u7a7a\u95f4\u53d9\u4e8b\u3001\u670d\u88c5\u8bbe\u8ba1\u4e0e\u642d\u914d\u53ca\u591a\u6e20\u9053\u5185\u5bb9\u4f20\u64ad\uff0c\u80fd\u591f\u8d2f\u901a\u4ece\u7814\u7a76\u7b56\u5212\u3001\u89c6\u89c9\u7cfb\u7edf\u6784\u5efa\u5230\u5185\u5bb9\u5236\u4f5c\u3001\u7f51\u9875\u642d\u5efa\u4e0e\u53d1\u5e03\u7684\u5b8c\u6574\u6d41\u7a0b\uff0c\u5f62\u6210\u7edf\u4e00\u3001\u6e05\u6670\u4e14\u5177\u5546\u4e1a\u4f20\u64ad\u529b\u7684\u8bbe\u8ba1\u8868\u8fbe\u3002",
  meta: ["Integrated Visual Design", "Digital Experience & Content", "Spatial & Fashion Design"],
};

const aboutChineseDisplayCopy: OverlayCopy = {
  ...aboutChineseCopy,
  title: "\u4ece\u89c6\u89c9\u5230\u7a7a\u95f4\uff0c\n\u4ece\u5c40\u90e8\u5230\u6574\u4f53\uff0c\n\u6784\u5efa\u8bbe\u8ba1\u7684\u591a\u91cd\u53ef\u80fd",
};

const copy: Record<Exclude<PrimarySection, "projects" | null>, { cn: OverlayCopy; en: OverlayCopy }> = {
  about: {
    cn: {
      eyebrow: "About Zoey",
      title: "\u6211\u628a\u521b\u610f\u3001\u89c6\u89c9\u4e0e\u6545\u4e8b\u653e\u5728\u540c\u4e00\u4e2a\u5b89\u9759\u7684\u7cfb\u7edf\u91cc\u3002",
      body: `${SITE_COPY.brand.name}锛屼笓娉ㄨ瑙夎璁°€佹暟瀛楄壓鏈€佹湇瑁呬笌绌洪棿鏂瑰悜銆?{SITE_COPY.hero.description}`,
      meta: ["Visual Direction", "Digital Content", "Spatial Storytelling"],
    },
    en: {
      eyebrow: "About Zoey",
      title: "I place creativity,\nvisual language,\nand storytelling\ninto one quiet system.",
      body: `${SITE_COPY.brand.nameEn} focuses on visual design, digital art, fashion, and spatial direction. ${SITE_COPY.hero.descriptionEn}`,
      meta: ["Visual Direction", "Digital Content", "Spatial Storytelling"],
    },
  },
  experience: {
    cn: {
      eyebrow: "Experience",
      title: "从概念草图到可交互作品，\n保持完整的创作闭环",
      body:
        "\u64c5\u957f\u5c06\u7075\u611f\u3001\u8c03\u7814\u3001\u98ce\u683c\u677f\u3001\u751f\u6210\u5f0f\u56fe\u50cf\u4e0e\u6700\u7ec8\u5c55\u793a\u754c\u9762\u4e32\u8054\u8d77\u6765\uff0c\u8ba9\u9879\u76ee\u65e2\u80fd\u88ab\u7406\u89e3\uff0c\u4e5f\u80fd\u88ab\u4f53\u9a8c\u3002",
      meta: ["Concept Research", "Portfolio Curation", "Cross-media Design"],
    },
    en: {
      eyebrow: "Experience",
      title: "From concept sketches\nto interactive portfolios,\nI keep the creative\nloop complete.",
      body:
        "I connect inspiration, research, moodboards, generative imagery, and final interfaces so each project can be both understood and experienced.",
      meta: ["Concept Research", "Portfolio Curation", "Cross-media Design"],
    },
  },
  services: {
    cn: {
      eyebrow: "Services",
      title: "提供完整、清晰、\n适合长期使用的\n设计协作方式",
      body:
        "品牌、企业与商业项目提供从策略规划到视觉落地的一体化设计服务，涵盖品牌视觉、数字体验、营销内容、空间展示与创新视觉解决方案。",
      meta: ["Brand System", "Portfolio Website", "Digital Content"],
    },
    en: {
      eyebrow: "Services",
      title: "I offer restrained,\nclear design collaboration\nbuilt for long-term use.",
      body:
        "Collaboration can include brand visuals, portfolio curation, digital art direction, spatial proposals, and portfolio website experiences.",
      meta: ["Brand System", "Portfolio Website", "Digital Content"],
    },
  },
};

function NarrativeAutoScroll({
  content,
  language,
  section,
}: {
  content: OverlayCopy;
  language: "cn" | "en";
  section: Exclude<PrimarySection, "projects" | null>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const manualResumeTimerRef = useRef<number | null>(null);
  const mobilePointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const scrollPositionRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isPageEditing, setIsPageEditing] = useState(false);
  const [zoomedMedia, setZoomedMedia] = useState<ZoomedInfoMedia | null>(null);
  const [textOverrides, setTextOverrides] = useState<InfoTextOverrides>(readInitialInfoTextOverrides);
  const [hongKongTime, setHongKongTime] = useState(() => hongKongClockFormatter.format(new Date()));
  const closeOverlay = usePortfolioStore((state) => state.closeOverlay);

  useEffect(() => {
    setIsDeveloperMode(isDeveloperUrl());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (!isDeveloperUrl()) {
          setIsDeveloperMode(false);
          setIsPageEditing(false);
          return;
        }
        setIsDeveloperMode((current) => !current);
        setIsPageEditing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isDeveloperMode) {
      setIsPageEditing(false);
    }
  }, [isDeveloperMode]);

  
  useEffect(() => {
    setIsPaused(false);
    setIsManualScrolling(false);
    directionRef.current = 1;
    pauseUntilRef.current = 0;
    setZoomedMedia(null);
    if (scrollRef.current) {
      scrollPositionRef.current = scrollRef.current.scrollTop;
    }
  }, [language, section]);

  useEffect(() => {
    if (section !== "about") {
      return;
    }

    const scroller = scrollRef.current;
    const contactPanel = scroller?.querySelector<HTMLElement>(
      ".about-axis-entry.is-footer-contact-entry .info-footer-panel",
    );
    const signatureEntry = scroller?.querySelector<HTMLElement>(
      ".about-axis-entry.is-signature-entry",
    );

    if (!contactPanel || !signatureEntry) {
      return;
    }

    const syncSignatureCardHeight = () => {
      signatureEntry.style.setProperty(
        "--about-signature-card-height",
        `${contactPanel.getBoundingClientRect().height}px`,
      );
    };

    syncSignatureCardHeight();
    const resizeObserver = new ResizeObserver(syncSignatureCardHeight);
    resizeObserver.observe(contactPanel, { box: "border-box" });
    const settledLayoutTimer = window.setTimeout(syncSignatureCardHeight, 750);

    return () => {
      window.clearTimeout(settledLayoutTimer);
      resizeObserver.disconnect();
      signatureEntry.style.removeProperty("--about-signature-card-height");
    };
  }, [language, section, textOverrides]);

useEffect(() => {
    const updateHongKongTime = () => setHongKongTime(hongKongClockFormatter.format(new Date()));
    updateHongKongTime();
    const timer = window.setInterval(updateHongKongTime, 1000 * 30);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadLatest = async () => {
      try {
        const response = await fetch(`/api/info-page/overrides/latest?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const latest = await response.json() as LatestInfoTextOverrideStore;
        if (latest?.overrides) {
          setTextOverrides((current) => (
            isDeveloperUrl()
              ? latest.overrides
              : latest.overrides
          ));
        }
      } catch {
        // The imported source JSON remains the fallback.
      }
    };

    void loadLatest();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isDeveloperMode) {
      window.localStorage.setItem(infoTextStorageKey, JSON.stringify(textOverrides));
    }

    if (!isDeveloperMode) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/info-page/overrides/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: textOverrides }),
      })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }
          const payload = await response.json() as { latest?: LatestInfoTextOverrideStore };
          if (payload.latest?.overrides) {
            const normalized = JSON.stringify(payload.latest.overrides);
            if (normalized !== JSON.stringify(textOverrides)) {
              setTextOverrides(payload.latest.overrides);
            }
            window.localStorage.setItem(infoTextStorageKey, normalized);
          }
        })
        .catch(() => {
          // Keep the local editing cache if the development server is not available.
        });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [isDeveloperMode, textOverrides]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) {
      scrollPositionRef.current = scroller.scrollTop;
    }

    const speed = 72;
    let lastTime = performance.now();

    const step = (time: number) => {
      const scroller = scrollRef.current;
      if (scroller && !isPaused && !isPageEditing && !isManualScrolling && time > pauseUntilRef.current) {
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        if (maxScroll > 0) {
          const currentTop = scroller.scrollTop;
          const frameSeconds = Math.min(time - lastTime, 48) / 1000;
          const delta = frameSeconds * speed;
          const next = currentTop + delta;

          if (next >= maxScroll) {
            scroller.scrollTop = 0;
            scrollPositionRef.current = 0;
            directionRef.current = 1;
            pauseUntilRef.current = time + 900;
          } else {
            scroller.scrollTop = next;
            scrollPositionRef.current = next;
            directionRef.current = 1;
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
  }, [isManualScrolling, isPageEditing, isPaused]);

  useEffect(() => {
    return () => {
      if (manualResumeTimerRef.current) {
        window.clearTimeout(manualResumeTimerRef.current);
      }
    };
  }, []);
const timelinePresets: Record<
    Exclude<PrimarySection, "projects" | null>,
    {
      cn: TimelineItem[];
      en: TimelineItem[];
    }
  > = {
    about: {
      en: [
          {
            index: "00",
            title: content.title,
            body: content.body,
            media: "lanyard" as const,
          },
          {
            index: "01",
            title: "01 Creative\nDirection",
            body: "I do not want to define one fixed style, but to create a design language that can move across media, time, and scenes.",
            media: "image" as const,
            mediaSrc: "/assets/about/creative-direction.png",
            mediaAlt: "Creative direction diagram",
          },
          {
            index: "02",
            title: "02 Working\nMethod",
            body: "Research, moodboards, generative imagery, layout, and interactive display are connected so each project can be read as a complete process.",
            media: "image" as const,
            mediaSrc: "/assets/about/working-method.png",
            mediaAlt: "Working method diagram",
          },
        ],
      cn: [
          {
            index: "00",
            title: content.title,
            body: content.body,
            media: "lanyard" as const,
          },
          {
            index: "01",
            title: "01 \u521b\u4f5c\u65b9\u5411",
            body: "\u6211\u4e0d\u60f3\u5b9a\u4e49\u4e00\u79cd\u98ce\u683c\uff0c\u800c\u662f\u521b\u9020\u4e00\u79cd\u80fd\u591f\u8de8\u8d8a\u5a92\u4ecb\u3001\u65f6\u95f4\u4e0e\u573a\u666f\u7684\u8bbe\u8ba1\u8bed\u8a00\u3002",
            media: "image" as const,
            mediaSrc: "/assets/about/creative-direction.png",
            mediaAlt: "\u521b\u4f5c\u65b9\u5411\u793a\u610f\u56fe",
          },
          {
            index: "02",
            title: "02 \u5de5\u4f5c\u65b9\u5f0f",
            body: "\u4ece\u8c03\u7814\u3001\u98ce\u683c\u677f\u3001\u751f\u6210\u5f0f\u56fe\u50cf\u5230\u677f\u5f0f\u4e0e\u4ea4\u4e92\u5c55\u793a\uff0c\u8ba9\u6bcf\u4e2a\u9879\u76ee\u90fd\u80fd\u88ab\u5b8c\u6574\u9605\u8bfb\u3002",
            media: "image" as const,
            mediaSrc: "/assets/about/working-method.png",
            mediaAlt: "\u5de5\u4f5c\u65b9\u5f0f\u793a\u610f\u56fe",
          },
        ],
    },
    experience: {
      en: [
        {
          index: "00",
          title: content.title,
          body: content.body,
          media: "text",
        },
        {
          index: "01",
          title: "Concept to Interface",
          body: "Each project begins with a clear concept, then moves through research, visual testing, and a final interactive presentation.",
          media: "image",
          mediaSrc: "/assets/experience/concept-to-interface.jpg",
          mediaAlt: "Concept to interface image",
        },
        {
          index: "02",
          title: "Cross-media Practice",
          body: "The working process connects editorial layout, generative imagery, fashion references, spatial mood, and web interaction.",
          media: "image",
          mediaSrc: "/assets/experience/cross-media-practice.jpg",
          mediaAlt: "Cross-media practice image",
        },
        {
          index: "03",
          title: "Portfolio Archive",
          body: "This area is prepared for future timeline details, studio notes, process photographs, and selected experience records.",
          media: "image",
          mediaSrc: "/assets/experience/experience-archive.jpg",
          mediaAlt: "Experience archive image",
        },
        {
          index: "04",
          title: "Awards Dome",
          body: "This dome gallery is prepared for certificates, awards, honors, and selected records. Upload the images later and they can rotate here as an experience archive.",
          media: "dome",
        },
      ],
      cn: [
        {
          index: "00",
          title: content.title,
          body: content.body,
          media: "text",
        },
        {
          index: "01",
          title: "\u4ece\u6982\u5ff5\u5230\u754c\u9762",
          body: "\u6bcf\u4e2a\u9879\u76ee\u4ece\u660e\u786e\u7684\u6982\u5ff5\u51fa\u53d1\uff0c\u7ecf\u8fc7\u8c03\u7814\u3001\u89c6\u89c9\u6d4b\u8bd5\uff0c\u518d\u8fdb\u5165\u6700\u7ec8\u7684\u4ea4\u4e92\u5f0f\u5c55\u793a\u3002",
          media: "image",
          mediaSrc: "/assets/experience/concept-to-interface.jpg",
          mediaAlt: "\u4ece\u6982\u5ff5\u5230\u754c\u9762\u56fe\u7247",
        },
        {
          index: "02",
          title: "\u8de8\u5a92\u4ecb\u5b9e\u8df5",
          body: "\u89e3\u6784\u4f20\u7edf\u5b66\u79d1\u4e0e\u5a92\u4ecb\u7684\u8fb9\u754c\uff0c\u4ee5\u89c6\u89c9\u7684\u91cd\u5851\u3001\u5b9e\u4f53\u7684\u53d9\u4e8b\u4e0e\u6570\u5b57\u7684\u6d41\u52a8\u5173\u7cfb\u3002",
          media: "image",
          mediaSrc: "/assets/experience/cross-media-practice.jpg",
          mediaAlt: "\u8de8\u5a92\u4ecb\u5b9e\u8df5\u56fe\u7247",
        },
        {
          index: "03",
          title: "\u7ecf\u5386\u6863\u6848",
          body: "\u8fd9\u91cc\u9884\u7559\u7ed9\u540e\u7eed\u65f6\u95f4\u7ebf\u3001\u5de5\u4f5c\u5ba4\u8bb0\u5f55\u3001\u8fc7\u7a0b\u7167\u7247\u4e0e\u4e2a\u4eba\u7ecf\u5386\u4fe1\u606f\u3002",
          media: "image",
          mediaSrc: "/assets/experience/experience-archive.jpg",
          mediaAlt: "\u7ecf\u5386\u6863\u6848\u56fe\u7247",
        },
      ],
    },
    services: {
      en: [
        {
          index: "00",
          title: content.title,
          body: content.body,
          media: "text",
        },
        {
          index: "01",
          title: "Visual Direction",
          body: "Brand visuals, editorial systems, and portfolio pages can be organized into a quiet and durable design language.",
          media: "image",
          mediaSrc: "/assets/services/visual-direction.jpg",
          mediaAlt: "Visual direction image",
        },
        {
          index: "02",
          title: "Digital Content",
          body: "Digital content direction can connect web systems, visual assets, database structure, and iterative presentation workflows.",
          media: "image",
          mediaSrc: "/assets/services/aigc-workflow.png",
          mediaAlt: "Digital content workflow image",
        },
        {
          index: "03",
          title: "Website Experience",
          body: "Portfolio websites can be built as immersive but restrained viewing systems, balancing narrative, clarity, and motion.",
          media: "image",
          mediaSrc: "/assets/services/website-experience.jpg",
          mediaAlt: "Website experience image",
        },
      ],
      cn: [
        {
          index: "00",
          title: content.title,
          body: content.body,
          media: "text",
        },
        {
          index: "01",
          title: "\u89c6\u89c9\u65b9\u5411",
          body: "\u54c1\u724c\u89c6\u89c9\u3001\u7248\u5f0f\u7cfb\u7edf\u4e0e\u4f5c\u54c1\u96c6\u9875\u9762\u53ef\u4ee5\u88ab\u6574\u7406\u6210\u5b89\u9759\u3001\u8010\u770b\u7684\u8bbe\u8ba1\u8bed\u8a00\u3002",
          media: "image",
          mediaSrc: "/assets/services/visual-direction.jpg",
          mediaAlt: "\u89c6\u89c9\u65b9\u5411\u56fe\u7247",
        },
        {
          index: "02",
          title: "\u6570\u5b57\u5185\u5bb9",
          body: "\u6570\u5b57\u5185\u5bb9\u65b9\u5411\u53ef\u4ee5\u4e32\u8054\u7f51\u9875\u7cfb\u7edf\u3001\u89c6\u89c9\u8d44\u4ea7\u3001\u6570\u636e\u5e93\u7ed3\u6784\u4e0e\u6301\u7eed\u8fed\u4ee3\u7684\u5c55\u793a\u6d41\u7a0b\u3002",
          media: "image",
          mediaSrc: "/assets/services/aigc-workflow.png",
          mediaAlt: "\u6570\u5b57\u5185\u5bb9\u5de5\u4f5c\u6d41\u56fe\u7247",
        },
        {
          index: "03",
          title: "\u7f51\u9875\u4f53\u9a8c",
          body: "打造富有氛围感的沉浸式作品观看系统，让内容叙事、信息层级与灵动动效相辅相成，形成完整饱满的浏览体验。",
          media: "image",
          mediaSrc: "/assets/services/website-experience.jpg",
          mediaAlt: "\u7f51\u9875\u4f53\u9a8c\u56fe\u7247",
        },
      ],
    },
  };

  const timelineItems = timelinePresets[section][language];
  const footerItems: TimelineItem[] = [
    {
      index: "F1",
      title: language === "en" ? "Services" : "服务",
      body: language === "en" ? "Selected ways of working with Zoey." : "围绕品牌、数字体验、影像、空间与内容传播展开的合作方式。",
      media: "footer-services",
    },
    {
      index: "F2",
      title: language === "en" ? "Profile / Contact" : "简介 / 接触",
      body:
        language === "en"
          ? "Zoey Portfolio profile, contact links, and Hong Kong time."
          : "Zoey Portfolio 的简介、联系信息与香港时区页脚信息。",
      media: "footer-contact",
    },
    {
      index: "END",
      title: "Zoey",
      body: language === "en" ? "End mark" : "缁撳熬钀芥",
      media: "signature",
    },
  ];
  const displayTimelineItems: TimelineItem[] =
    section === "about"
      ? [...timelineItems, ...footerItems]
      : section === "experience" && language === "cn"
      ? [
          ...timelineItems,
          {
            index: "04",
            title: "奖项证书",
            body: "这里预留给奖状、奖项、荣誉记录与证书图片。后续上传图片后，会在这个穹顶画廊里旋转展示，作为个人经历的视觉档案。",
            media: "dome" as const,
          },
          ...footerItems,
        ]
      : [...timelineItems, ...footerItems];
  const resolvedTimelineItems = displayTimelineItems.map((item) => {
    const overrideKey = `${section}:${language}:${item.index}`;
    const override = textOverrides[overrideKey];
    const domeCopy =
      item.media === "dome"
        ? {
            title: language === "en" ? "Certificates & Awards" : "奖项证书",
            body:
              language === "en"
                ? "Certificates, awards, honors, and selected records are collected here as a visual archive."
                : "这里用于展示奖状、奖项、荣誉记录与证书图片，作为个人经历的视觉档案。",
          }
        : null;
    return {
      ...item,
      title: domeCopy?.title ?? override?.title ?? item.title,
      body: override?.body ?? domeCopy?.body ?? item.body,
    };
  });


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setZoomedMedia(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openMediaZoom = (event: MouseEvent, src: string, alt: string) => {
    if (isPageEditing) {
      return;
    }

    event.stopPropagation();
    setIsPaused(true);
    setZoomedMedia({ src, alt });
  };

  const handleStoryPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    mobilePointerStartRef.current = null;

    if (!isMobileInfoViewport() || isPageEditing || zoomedMedia) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        "button, a, input, textarea, select, [contenteditable='true'], .mobile-info-back-button, .info-edit-toggle, .info-media-lightbox",
      )
    ) {
      return;
    }

    mobilePointerStartRef.current = { x: event.clientX, y: event.clientY };
    window.getSelection()?.removeAllRanges();
    setIsPaused((current) => !current);
  };

  const handleStoryPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isMobileInfoViewport() || isPageEditing || !mobilePointerStartRef.current) {
      return;
    }

    const deltaX = Math.abs(event.clientX - mobilePointerStartRef.current.x);
    const deltaY = Math.abs(event.clientY - mobilePointerStartRef.current.y);
    if (deltaX < 8 && deltaY < 8) {
      return;
    }

    mobilePointerStartRef.current = null;
    setIsPaused(false);
    setIsManualScrolling(true);

    if (manualResumeTimerRef.current) {
      window.clearTimeout(manualResumeTimerRef.current);
    }
    manualResumeTimerRef.current = window.setTimeout(() => {
      setIsManualScrolling(false);
    }, 900);
  };

  const updateTextOverride = (index: string, patch: { title?: string; body?: string }) => {
    const overrideKey = `${section}:${language}:${index}`;
    setTextOverrides((current) => ({
      ...current,
      [overrideKey]: {
        ...current[overrideKey],
        ...patch,
      },
    }));
  };

  const updateElementOverride = (index: string, patch: InfoTextOverrideEntry) => {
    const overrideKey = `${section}:${language}:${index}`;
    setTextOverrides((current) => ({
      ...current,
      [overrideKey]: {
        ...current[overrideKey],
        ...patch,
      },
    }));
  };

  const moveElement = (index: string, target: "copyOffset" | "mediaOffset", delta: { x: number; y: number }) => {
    const overrideKey = `${section}:${language}:${index}`;
    setTextOverrides((current) => {
      const currentOffset = current[overrideKey]?.[target] ?? { x: 0, y: 0 };
      return {
        ...current,
        [overrideKey]: {
          ...current[overrideKey],
          [target]: {
            x: clampOffset((currentOffset.x ?? 0) + delta.x),
            y: clampOffset((currentOffset.y ?? 0) + delta.y),
          },
        },
      };
    });
  };

  const replaceMedia = async (index: string, file?: File) => {
    if (!file || !(file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      return;
    }

    const src = await readFileAsDataUrl(file);
    updateElementOverride(index, {
      mediaSrc: src,
      mediaAlt: file.name.replace(/\.[^.]+$/, ""),
      mediaHidden: false,
    });
  };

  const removeMedia = (index: string) => {
    updateElementOverride(index, { mediaHidden: true });
  };

  const restoreMedia = (index: string) => {
    updateElementOverride(index, { mediaHidden: false, mediaSrc: undefined, mediaAlt: undefined });
  };

  const clearText = (index: string) => {
    updateTextOverride(index, { title: "", body: "" });
  };

  const resetPosition = (index: string) => {
    updateElementOverride(index, {
      copyOffset: { x: 0, y: 0 },
      mediaOffset: { x: 0, y: 0 },
    });
  };

  return (
    <div
      ref={scrollRef}
      className={[
        "about-scroll",
        "immersive-story-scroll",
        `is-${section}-story`,
        `is-${language}-story`,
        isPaused ? "is-paused" : "",
        isManualScrolling ? "is-manual-scroll" : "",
        isPageEditing ? "is-page-editing" : "",
      ].filter(Boolean).join(" ")}
      onPointerDownCapture={handleStoryPointerDown}
      onPointerMoveCapture={handleStoryPointerMove}
      onPointerUpCapture={() => {
        mobilePointerStartRef.current = null;
      }}
      onPointerCancelCapture={() => {
        mobilePointerStartRef.current = null;
      }}
      onClick={() => {
        if (!isMobileInfoViewport()) {
          setIsPaused((current) => !current);
        }
      }}
      onScroll={(event) => {
        scrollPositionRef.current = event.currentTarget.scrollTop;
      }}
      onWheel={(event) => {
        event.stopPropagation();
        const scroller = event.currentTarget;
        directionRef.current = event.deltaY >= 0 ? 1 : -1;
        pauseUntilRef.current = performance.now() + 900;
        if (isMobileInfoViewport()) {
          setIsPaused(false);
        }
        setIsManualScrolling(true);
        if (manualResumeTimerRef.current) {
          window.clearTimeout(manualResumeTimerRef.current);
        }

        manualResumeTimerRef.current = window.setTimeout(() => {
          scrollPositionRef.current = scroller.scrollTop;
          setIsManualScrolling(false);
        }, 900);
      }}
      role="button"
      tabIndex={0}
      aria-label={isPaused ? "Auto scroll paused. Click to continue." : "Auto scroll playing. Click to pause."}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsPaused((current) => !current);
        }
      }}
    >
      <div className="about-axis">
        {resolvedTimelineItems.map((item, index) => {
          const overrideKey = `${section}:${language}:${item.index}`;
          const override = textOverrides[overrideKey] ?? {};
          const copyOffset = override.copyOffset ?? { x: 0, y: 0 };
          const mediaOffset = override.mediaOffset ?? { x: 0, y: 0 };
          const mediaHidden = override.mediaHidden === true;
          const mediaSrc = (override.mediaSrc ?? item.mediaSrc)?.trim();
          const hasCustomMedia = Boolean(mediaSrc);
          const isCustomVideo = Boolean(
            mediaSrc && (mediaSrc.startsWith("data:video/") || /\.(mp4|webm)(\?|#)?$/i.test(mediaSrc)),
          );
          const customMedia = hasCustomMedia ? (
            isCustomVideo ? (
              <video src={mediaSrc} controls playsInline preload="metadata" />
            ) : (
              <img
                src={mediaSrc}
                alt={override.mediaAlt ?? item.mediaAlt ?? item.title}
                loading="lazy"
                className="info-zoomable-media"
                onClick={(event) => openMediaZoom(event, mediaSrc ?? "", override.mediaAlt ?? item.mediaAlt ?? item.title)}
              />
            )
          ) : null;

          return (
          <div
            className={[
              "about-axis-entry",
              index === 0 ? "is-immersive-hero" : "",
              item.media === "dome" ? "is-dome-entry" : "",
              item.media === "footer-services" ? "is-footer-services-entry" : "",
              item.media === "footer-contact" ? "is-footer-contact-entry" : "",
              item.media === "signature" ? "is-signature-entry" : "",
              item.media === "text" ? "is-text-only-entry" : "",
              section === "about" && item.index === "00" ? "is-about-intro-entry" : "",
              section === "about" && item.index === "01" ? "is-about-direction-entry" : "",
              section === "about" && item.index === "02" ? "is-about-method-entry" : "",
            ].filter(Boolean).join(" ")}
            key={`${item.index}-${item.title}`}
          >
            <motion.div
              className={[
                "about-axis-copy",
                isPageEditing ? "info-free-box info-free-copy" : "",
              ].filter(Boolean).join(" ")}
              drag={isPageEditing}
              dragMomentum={false}
              style={{ x: copyOffset.x ?? 0, y: copyOffset.y ?? 0 }}
              onDragEnd={(_, info) => moveElement(item.index, "copyOffset", info.offset)}
              onPointerDown={(event) => {
                if (isPageEditing) {
                  event.stopPropagation();
                }
              }}
              onClick={(event) => {
                if (isPageEditing) {
                  event.stopPropagation();
                }
              }}
            >
              {isPageEditing ? (
                <div
                  className="info-edit-toolbar"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span>{language === "en" ? "Text" : "\u6587\u5b57"}</span>
                  <button type="button" onClick={(event) => { event.stopPropagation(); clearText(item.index); }} title={language === "en" ? "Clear text" : "\u6e05\u7a7a\u6587\u5b57"}>
                    <Trash2 size={13} />
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); resetPosition(item.index); }} title={language === "en" ? "Reset position" : "\u91cd\u7f6e\u4f4d\u7f6e"}>
                    <RotateCcw size={13} />
                  </button>
                </div>
              ) : null}
              <span className="about-axis-index">{item.index}</span>
              {isPageEditing ? (
                <>
                  <textarea
                    className={index === 0 ? "info-edit-title is-hero" : "info-edit-title"}
                    value={item.title}
                    onChange={(event) => updateTextOverride(item.index, { title: event.target.value })}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <textarea
                    className="info-edit-body"
                    value={item.body}
                    onChange={(event) => updateTextOverride(item.index, { body: event.target.value })}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  />
                </>
              ) : (
                <>
              <ScrollReveal
                scrollContainerRef={scrollRef}
                splitMode="characters"
                baseOpacity={0}
                baseRotation={index === 0 ? 7.5 : 6}
                blurStrength={index === 0 ? 18 : 15}
                containerClassName={index === 0 ? "about-title-reveal is-hero" : "about-title-reveal"}
                textClassName="about-title-reveal-text"
                rotationEnd="center center+=20%"
                wordAnimationEnd="center center+=18%"
                playOnMount={index === 0}
              >
                {item.title}
              </ScrollReveal>
              <div className="about-reveal about-reveal-body">
                <p className="about-reveal-paragraph about-static-body">{item.body}</p>
              </div>
                </>
              )}
              {index === 0 ? (
                <div className="about-meta-row">
                  {content.meta.map((meta) => (
                    <small key={meta}>{meta}</small>
                  ))}
                </div>
              ) : null}
            </motion.div>
            <span className="about-axis-line" aria-hidden="true">
              <span />
            </span>
            {item.media === "text" && !isPageEditing && !hasCustomMedia ? null : mediaHidden ? (
              isPageEditing ? (
                <motion.div
                  className="about-axis-media info-free-box info-free-media is-media-hidden"
                  drag
                  dragMomentum={false}
                  style={{ x: mediaOffset.x ?? 0, y: mediaOffset.y ?? 0 }}
                  onDragEnd={(_, info) => moveElement(item.index, "mediaOffset", info.offset)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void replaceMedia(item.index, event.dataTransfer.files?.[0]);
                  }}
                >
                  <div className="info-media-empty">
                    <span>{language === "en" ? "Media hidden" : "图片已隐藏"}</span>
                    <label title={language === "en" ? "Upload media" : "Upload media"}>
                      <ImagePlus size={14} />
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void replaceMedia(item.index, event.target.files?.[0])}
                      />
                    </label>
                    <button type="button" onClick={(event) => { event.stopPropagation(); restoreMedia(item.index); }}>
                      <RotateCcw size={14} />
                      <span>{language === "en" ? "Restore" : "\u6062\u590d"}</span>
                    </button>
                  </div>
                </motion.div>
              ) : null
            ) : (
            <motion.div
              className={[
                "about-axis-media",
                isPageEditing ? "info-free-box info-free-media" : "",
              ].filter(Boolean).join(" ")}
              drag={isPageEditing}
              dragMomentum={false}
              style={{ x: mediaOffset.x ?? 0, y: mediaOffset.y ?? 0 }}
              onDragEnd={(_, info) => moveElement(item.index, "mediaOffset", info.offset)}
              onPointerDown={(event) => {
                if (isPageEditing) {
                  event.stopPropagation();
                }
              }}
              onClick={(event) => event.stopPropagation()}
              onDragOver={(event) => {
                if (!isPageEditing) return;
                event.preventDefault();
                event.stopPropagation();
              }}
              onDrop={(event) => {
                if (!isPageEditing) return;
                event.preventDefault();
                event.stopPropagation();
                void replaceMedia(item.index, event.dataTransfer.files?.[0]);
              }}
            >
              {isPageEditing ? (
                <div
                  className="info-edit-toolbar info-edit-toolbar-media"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span>{language === "en" ? "Media" : "\u56fe\u7247"}</span>
                  <label title={language === "en" ? "Replace media" : "\u66ff\u6362\u56fe\u7247"}>
                    <ImagePlus size={13} />
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => void replaceMedia(item.index, event.target.files?.[0])}
                    />
                  </label>
                  <button type="button" onClick={(event) => { event.stopPropagation(); removeMedia(item.index); }} title={language === "en" ? "Delete media" : "\u5220\u9664\u56fe\u7247"}>
                    <Trash2 size={13} />
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); resetPosition(item.index); }} title={language === "en" ? "Reset position" : "\u91cd\u7f6e\u4f4d\u7f6e"}>
                    <RotateCcw size={13} />
                  </button>
                </div>
              ) : null}
              {item.media === "footer-services" ? (
                customMedia ? (
                  <div className="about-image-slot has-custom-media">{customMedia}</div>
                ) : (
                <div className="info-footer-panel info-footer-services">
                  <h3>{language === "en" ? "Services" : "服务"}</h3>
                  <div>
                    {infoFooterServicesDisplay[language].map(([number, label, description]) => (
                      <article key={`${number}-${label}`}>
                        <strong>{number}</strong>
                        <b>{label}</b>
                        <p>{description}</p>
                      </article>
                    ))}
                  </div>
                </div>
                )
              ) : item.media === "footer-contact" ? (
                customMedia ? (
                  <div className="about-image-slot has-custom-media">{customMedia}</div>
                ) : (
                <div className="info-footer-panel info-footer-contact">
                  <section className="info-footer-contact-row">
                    <h3>{infoContactColumns[language].profileTitle}</h3>
                    <div className="info-footer-contact-links">
                      {infoContactColumns[language].profile.map(([label, value]) => (
                        <article key={label}>
                          <span>{label}</span>
                          <p>{value}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section className="info-footer-contact-row">
                    <h3>{infoContactColumns[language].contactTitle}</h3>
                    <div className="info-footer-contact-links">
                      {infoContactColumns[language].contact.map(([label, value]) => (
                        <article key={label}>
                          <span>{label}</span>
                          <p>{value}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                  <footer className="info-footer-contact-meta">
                    <div>
                      <span>{infoContactColumns[language].footer.copyright}</span>
                      {infoContactColumns[language].footer.address ? <p>{infoContactColumns[language].footer.address}</p> : null}
                    </div>
                    <div className="info-footer-time">
                      <strong>{hongKongTime}</strong>
                      <span>{infoContactColumns[language].footer.timezoneLabel}</span>
                    </div>
                  </footer>
                </div>
                )
              ) : item.media === "signature" ? (
                <div className="info-signature-ending">
                  {customMedia ?? (
                    <img
                      src="/assets/ambient/zoey-signature-transparent.png"
                      alt="Zoey"
                      loading="lazy"
                      className="info-zoomable-media"
                      onClick={(event) => openMediaZoom(event, "/assets/ambient/zoey-signature-transparent.png", "Zoey")}
                    />
                  )}
                </div>
              ) : item.media === "lanyard" ? (
                customMedia ? (
                  <div className="about-image-slot has-custom-media">{customMedia}</div>
                ) : (
                  <Lanyard
                    position={[0, 0, 20]}
                    gravity={[0, -40, 0]}
                    frontImage="/assets/about/zoey-profile.jpg"
                    imageFit="cover"
                    lanyardWidth={0.82}
                  />
                )
              ) : item.media === "dome" ? (
                <div className="experience-dome-panel">
                  {customMedia ?? (
                    <DomeGallery
                      images={certificateDomeImages}
                      minRadius={570}
                      maxRadius={980}
                      fit={0.68}
                      dragDampening={0.86}
                      overlayBlurColor="transparent"
                      imageBorderRadius="16px"
                      grayscale={false}
                      autoRotate
                      autoRotateSpeed={2.8}
                    />
                  )}
                </div>
              ) : (
                <div className={hasCustomMedia ? "about-image-slot has-custom-media" : "about-image-slot"}>
                  {customMedia ?? <span>{language === "en" ? "Image Area" : "\u56fe\u7247\u533a\u57df"}</span>}
                </div>
              )}
            </motion.div>
            )}
          </div>
          );
        })}
      </div>
      {typeof document !== "undefined" && zoomedMedia ? createPortal(
        <motion.div
          className="info-media-lightbox"
          role="button"
          tabIndex={0}
          aria-label={language === "en" ? "Close enlarged image" : "关闭放大图片"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={overlaySpring}
          onClick={(event) => {
            event.stopPropagation();
            setZoomedMedia(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setZoomedMedia(null);
            }
          }}
        >
          <motion.img
            src={zoomedMedia.src}
            alt={zoomedMedia.alt}
            draggable={false}
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 2, opacity: 1 }}
            transition={{ type: "spring", stiffness: 170, damping: 24 }}
            onClick={(event) => {
              event.stopPropagation();
              setZoomedMedia(null);
            }}
          />
        </motion.div>,
        document.body,
      ) : null}
      {isDeveloperMode ? (
        <button
          type="button"
          className={isPageEditing ? "info-edit-toggle is-active" : "info-edit-toggle"}
          onClick={(event) => {
            event.stopPropagation();
            setIsPageEditing((current) => !current);
            setIsPaused(true);
          }}
        >
          {isPageEditing
            ? language === "en"
              ? "Finish Page Edit"
              : "\u5b8c\u6210\u9875\u9762\u7f16\u8f91"
            : language === "en"
              ? "Page Edit"
              : "\u9875\u9762\u7f16\u8f91"}
        </button>
      ) : null}
    </div>
  );
}

export function InfoOverlay() {
  const activePrimary = usePortfolioStore((state) => state.activePrimary);
  const closeOverlay = usePortfolioStore((state) => state.closeOverlay);
  const language = usePortfolioStore((state) => state.language);
  const isOpen = activePrimary !== null && activePrimary !== "projects";
  const content = isOpen
    ? activePrimary === "about" && language === "cn"
      ? aboutChineseDisplayCopy
      : copy[activePrimary][language]
    : null;
  const isAbout = activePrimary === "about";
  const timelineSection = isOpen ? activePrimary : null;

  return (
    <motion.aside
      className={[
        "info-overlay",
        isOpen ? "is-open" : "",
        isAbout ? "is-about" : "",
      ].filter(Boolean).join(" ")}
      aria-hidden={!isOpen}
      initial={false}
      animate={{
        opacity: isOpen ? 1 : 0,
        scale: isOpen ? 1 : 0.985,
      }}
      transition={overlaySpring}
      onClick={closeOverlay}
    >
      <button
        type="button"
        className="overlay-close"
        onPointerDown={(event) => {
          event.stopPropagation();
          closeOverlay();
        }}
        onClick={(event) => {
          event.stopPropagation();
          closeOverlay();
        }}
        aria-label={language === "en" ? "Close" : "关闭"}
      >
        <X size={18} strokeWidth={1.6} />
      </button>
      {isOpen ? (
        <button
          type="button"
          className="mobile-info-back-button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            closeOverlay();
          }}
          aria-label={language === "en" ? "Back" : "返回"}
        >
          <ArrowLeft size={22} strokeWidth={1.8} />
        </button>
      ) : null}

      {content ? (
        <motion.div
          className={[
            "overlay-content",
            isOpen ? "is-timeline" : "",
            isAbout ? "is-about" : "",
          ].filter(Boolean).join(" ")}
          key={activePrimary}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={overlaySpring}
          onClick={(event) => event.stopPropagation()}
        >
          {timelineSection ? (
            <NarrativeAutoScroll content={content} language={language} section={timelineSection} />
          ) : null}
        </motion.div>
      ) : null}
    </motion.aside>
  );
}










