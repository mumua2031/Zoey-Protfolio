import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GlassNavigation } from "./components/navigation/GlassNavigation";
import { PortfolioContainer } from "./components/terminal/PortfolioContainer";
import { InfoOverlay } from "./components/InfoOverlay";
import { PanoramaStudio } from "./components/PanoramaStudio";
import { categoryMap } from "./data/portfolio";
import { SITE_COPY } from "./data/siteCopy";
import { usePortfolioStore } from "./store/usePortfolioStore";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const homeCopySpring = { type: "spring" as const, stiffness: 95, damping: 24, mass: 1.15 };

function HomeCopy() {
  const hasStarted = usePortfolioStore((state) => state.hasStarted);
  const isHomeCopyVisible = usePortfolioStore((state) => state.isHomeCopyVisible);
  const language = usePortfolioStore((state) => state.language);
  const heroLines = language === "en" ? SITE_COPY.hero.linesEn : SITE_COPY.hero.lines;
  const artLines = language === "en" ? SITE_COPY.artLinesEn : SITE_COPY.artLines;

  return (
    <section className="home-copy-layer" aria-hidden={!hasStarted || !isHomeCopyVisible}>
      <motion.h1
        className="home-slogan"
        initial={false}
        animate={{
          opacity: hasStarted && isHomeCopyVisible ? 1 : 0,
          y: hasStarted && isHomeCopyVisible ? "0vh" : "-82vh",
        }}
        transition={homeCopySpring}
      >
        <span>My space</span>
        <span>begins here</span>
      </motion.h1>
      <motion.div
        className="home-description"
        initial={false}
        animate={{
          opacity: hasStarted && isHomeCopyVisible ? 1 : 0,
          x: hasStarted && isHomeCopyVisible ? "0vw" : "58vw",
        }}
        transition={homeCopySpring}
      >
        {heroLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </motion.div>
      <motion.div
        className="home-art-note"
        initial={false}
        animate={{
          opacity: hasStarted && isHomeCopyVisible ? 1 : 0,
          x: hasStarted && isHomeCopyVisible ? "0vw" : "38vw",
        }}
        transition={homeCopySpring}
      >
        {artLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </motion.div>
    </section>
  );
}

function IntroViewfinder() {
  const hasStarted = usePortfolioStore((state) => state.hasStarted);
  const startExperience = usePortfolioStore((state) => state.startExperience);
  const [isShuttering, setIsShuttering] = useState(false);

  const begin = () => {
    if (isShuttering || hasStarted) {
      return;
    }
    setIsShuttering(true);
    startExperience();
  };

  return (
    <motion.section
      className={[
        "intro-viewfinder",
        hasStarted ? "is-hidden" : "",
        isShuttering ? "is-shuttering" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={hasStarted}
      initial={false}
      animate={{ opacity: hasStarted ? 0 : 1, scale: hasStarted ? 0.92 : 1 }}
      transition={spring}
      onClick={begin}
    >
      <button
        type="button"
        className="viewfinder-button"
        onClick={(event) => {
          event.stopPropagation();
          begin();
        }}
        aria-label="Enter Studio"
      >
        <span className="camera-body" aria-hidden="true" />
        <span className="viewfinder-frame" aria-hidden="true" />
        <span className="focus-reticle" aria-hidden="true" />
        <span className="transparent-enter" aria-hidden="true">Enter</span>
        <span className="shutter-flash" aria-hidden="true" />
      </button>
    </motion.section>
  );
}

export default function App() {
  const hasStarted = usePortfolioStore((state) => state.hasStarted);
  const language = usePortfolioStore((state) => state.language);
  const activePrimary = usePortfolioStore((state) => state.activePrimary);
  const activeCategoryId = usePortfolioStore((state) => state.activeCategoryId);
  const isTerminalOpen = usePortfolioStore((state) => state.isTerminalOpen);
  const startExperience = usePortfolioStore((state) => state.startExperience);
  const openProject = usePortfolioStore((state) => state.openProject);

  useEffect(() => {
    const isModalOpen = isTerminalOpen || (activePrimary !== null && activePrimary !== "projects");
    document.body.classList.toggle("zoey-mobile-modal-open", isModalOpen);

    return () => {
      document.body.classList.remove("zoey-mobile-modal-open");
    };
  }, [activePrimary, isTerminalOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isDeveloperEntry = params.get("dev") === "1" || params.get("edit") === "1";
    if (!isDeveloperEntry) {
      return;
    }

    const requestedCategory = params.get("category");
    const categoryId =
      requestedCategory && categoryMap.has(requestedCategory as Parameters<typeof openProject>[0])
        ? (requestedCategory as Parameters<typeof openProject>[0])
        : "visual";

    startExperience();
    openProject(categoryId);
  }, [openProject, startExperience]);

  useEffect(() => {
    const category = categoryMap.get(activeCategoryId);
    const primaryTitles = {
      about: language === "en" ? "About" : "关于我",
      projects: language === "en" ? "Projects" : "项目作品",
      experience: language === "en" ? "Experience" : "个人经历",
      services: language === "en" ? "Services" : "服务方式",
    } as const;

    const currentPage =
      isTerminalOpen && category
        ? `${category.label} ${category.labelEn}`
        : activePrimary
          ? primaryTitles[activePrimary]
          : "Zoey Portfolio";

    document.title = currentPage === "Zoey Portfolio" ? "Zoey Portfolio" : `${currentPage} | Zoey Portfolio`;
  }, [activeCategoryId, activePrimary, isTerminalOpen, language]);

  return (
    <main className={hasStarted ? "app-shell is-started" : "app-shell"}>
      <PanoramaStudio />
      <div className="soft-vignette" aria-hidden="true" />
      <HomeCopy />
      {hasStarted ? <GlassNavigation /> : null}
      <PortfolioContainer />
      <InfoOverlay />
      <IntroViewfinder />
    </main>
  );
}
