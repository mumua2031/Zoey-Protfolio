import { BriefcaseBusiness, Handshake, History, MonitorUp, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { categories, type ProjectCategoryId } from "../../data/portfolio";
import { SITE_COPY } from "../../data/siteCopy";
import { usePortfolioPrefetch } from "../../hooks/usePortfolioPrefetch";
import { usePortfolioStore, type PrimarySection } from "../../store/usePortfolioStore";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const primaryItems: Array<{
  id: PrimarySection;
  label: string;
  labelEn: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: "about", label: "关于我", labelEn: "About", icon: UserRound },
  { id: "projects", label: "项目作品", labelEn: "Projects", icon: BriefcaseBusiness },
  { id: "experience", label: "个人经历", labelEn: "Experience", icon: History },
  { id: "services", label: "服务方式", labelEn: "Services", icon: Handshake },
];

export function GlassNavigation() {
  const prefetch = usePortfolioPrefetch();
  const activePrimary = usePortfolioStore((state) => state.activePrimary);
  const activeCategoryId = usePortfolioStore((state) => state.activeCategoryId);
  const isTerminalOpen = usePortfolioStore((state) => state.isTerminalOpen);
  const language = usePortfolioStore((state) => state.language);
  const openPrimary = usePortfolioStore((state) => state.openPrimary);
  const openProject = usePortfolioStore((state) => state.openProject);
  const toggleLanguage = usePortfolioStore((state) => state.toggleLanguage);
  const isProjectStripVisible = activePrimary === "projects" || isTerminalOpen;

  const openSection = (section: PrimarySection) => {
    if (!section) {
      return;
    }
    openPrimary(section);
  };

  return (
    <motion.header
      className={isTerminalOpen ? "global-nav is-terminal-mode" : "global-nav"}
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div className="brand-lockup" aria-label={`${SITE_COPY.brand.nameEn} personal portfolio`}>
        <strong>{language === "en" ? SITE_COPY.brand.nameEn : SITE_COPY.brand.name}</strong>
        <span>{language === "en" ? SITE_COPY.brand.subEn : SITE_COPY.brand.sub}</span>
      </div>

      <nav className="nav-cluster" aria-label={language === "en" ? "Primary navigation" : "主导航"}>
        <div className="primary-tabs">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePrimary === item.id;
            return (
              <motion.button
                key={item.id}
                className={isActive ? "nav-button is-active" : "nav-button"}
                type="button"
                onClick={() => openSection(item.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={spring}
              >
                <Icon size={15} strokeWidth={1.8} />
                <span>{language === "en" ? item.labelEn : item.label}</span>
              </motion.button>
            );
          })}
          <motion.button
            className="nav-button language-toggle"
            type="button"
            onClick={toggleLanguage}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
            aria-label={language === "en" ? "Switch to Chinese" : "切换英文"}
          >
            <span>CN/EN</span>
          </motion.button>
        </div>

        <motion.div
          className="project-tabs"
          aria-label={language === "en" ? "Project categories" : "项目分类"}
          style={{ transformOrigin: "top center" }}
          initial={false}
          animate={{
            opacity: isProjectStripVisible ? 1 : 0,
            scaleY: isProjectStripVisible ? 1 : 0.82,
            y: isProjectStripVisible ? 0 : -8,
          }}
          transition={spring}
          aria-hidden={!isProjectStripVisible}
        >
          {categories.map((category) => (
            <motion.button
              key={category.id}
              type="button"
              className={
                activeCategoryId === category.id
                  ? "project-tab is-active"
                  : "project-tab"
              }
              onMouseEnter={() => prefetch(category.id)}
              onFocus={() => prefetch(category.id)}
              onClick={() => openProject(category.id as ProjectCategoryId)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
            >
              <MonitorUp size={14} strokeWidth={1.8} />
              <span>{language === "en" ? category.labelEn : category.label}</span>
              <small>{language === "en" ? "Portfolio" : category.labelEn}</small>
            </motion.button>
          ))}
        </motion.div>
      </nav>
    </motion.header>
  );
}
