import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { categoryMap } from "../../data/portfolio";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { PortfolioScreen } from "./PortfolioScreen";

const terminalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

export function PortfolioContainer() {
  const isTerminalOpen = usePortfolioStore((state) => state.isTerminalOpen);
  const activeCategoryId = usePortfolioStore((state) => state.activeCategoryId);
  const closeTerminal = usePortfolioStore((state) => state.closeTerminal);
  const requestSceneFocus = usePortfolioStore((state) => state.requestSceneFocus);
  const [isMountedVisible, setIsMountedVisible] = useState(false);
  const [isOpeningIntro, setIsOpeningIntro] = useState(false);

  useEffect(() => {
    if (isTerminalOpen) {
      setIsMountedVisible(true);
      setIsOpeningIntro(true);
      requestSceneFocus();
    }
  }, [isTerminalOpen, requestSceneFocus]);

  useEffect(() => {
    if (!isTerminalOpen) {
      setIsOpeningIntro(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const introTimer = window.setTimeout(
      () => setIsOpeningIntro(false),
      prefersReducedMotion ? 0 : 1700,
    );

    return () => window.clearTimeout(introTimer);
  }, [isTerminalOpen]);

  const category = categoryMap.get(activeCategoryId) ?? categoryMap.get("visual");

  return (
    <motion.div
      className={
        [
          "terminal-layer",
          isMountedVisible || isTerminalOpen ? "is-mounted" : "",
          isTerminalOpen && isOpeningIntro ? "is-opening-intro" : "",
        ].filter(Boolean).join(" ")
      }
      aria-hidden={!isTerminalOpen}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          closeTerminal();
        }
      }}
      initial={false}
      animate={{
        opacity: isTerminalOpen ? 1 : 0,
        scale: isTerminalOpen ? 1 : 0.94,
        y: isTerminalOpen ? 0 : 36,
      }}
      transition={terminalSpring}
      onAnimationComplete={() => {
        if (!isTerminalOpen) {
          setIsMountedVisible(false);
        }
      }}
    >
      <motion.div className="laptop-shell" transition={terminalSpring}>
        <div className="laptop-lid">
          <span className="laptop-logo" aria-hidden="true">Zoey</span>
          <div className="screen-bezel">
            <div className="screen-glass">
              <AnimatePresence initial={false}>
                {category ? (
                  <PortfolioScreen
                    key={category.id}
                    category={category}
                    isOpen={isTerminalOpen}
                    isIntroPlaying={isOpeningIntro}
                    onBack={closeTerminal}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="laptop-base" aria-hidden="true">
          <span>MacBook Pro</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
