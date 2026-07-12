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

  useEffect(() => {
    if (isTerminalOpen) {
      setIsMountedVisible(true);
      requestSceneFocus();
    }
  }, [isTerminalOpen, requestSceneFocus]);

  const category = categoryMap.get(activeCategoryId) ?? categoryMap.get("visual");

  return (
    <motion.div
      className={
        isMountedVisible || isTerminalOpen
          ? "terminal-layer is-mounted"
          : "terminal-layer"
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
              <AnimatePresence mode="wait">
                {category ? (
                  <PortfolioScreen
                    key={category.id}
                    category={category}
                    isOpen={isTerminalOpen}
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
