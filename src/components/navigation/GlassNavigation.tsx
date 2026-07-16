import { BriefcaseBusiness, Handshake, History, MonitorUp, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useState, type ComponentType } from "react";
import { categories, type ProjectCategoryId } from "../../data/portfolio";
import { SITE_COPY } from "../../data/siteCopy";
import { prefetchPortfolioCategory, usePortfolioPrefetch } from "../../hooks/usePortfolioPrefetch";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileProjectsOpen, setIsMobileProjectsOpen] = useState(false);

  const openSection = (section: PrimarySection) => {
    if (!section) {
      return;
    }
    if (section === "projects") {
      prefetchPortfolioCategory(activeCategoryId);
    }
    openPrimary(section);
    setIsMobileMenuOpen(false);
    setIsMobileProjectsOpen(false);
  };

  const openMobileProject = (categoryId: ProjectCategoryId) => {
    prefetchPortfolioCategory(categoryId);
    openProject(categoryId);
    setIsMobileMenuOpen(false);
    setIsMobileProjectsOpen(false);
  };

  const toggleMobileLanguage = () => {
    toggleLanguage();
    setIsMobileMenuOpen(false);
    setIsMobileProjectsOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((current) => {
      if (current) {
        setIsMobileProjectsOpen(false);
      }
      return !current;
    });
  };

  const handleMobilePrimary = (section: PrimarySection) => {
    if (section === "projects") {
      setIsMobileProjectsOpen((current) => !current);
      return;
    }
    openSection(section);
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

      <div className="mobile-nav-shell" aria-label={language === "en" ? "Mobile navigation" : "移动端导航"}>
        <button
          type="button"
          className="mobile-brand-pill"
          onClick={() => openSection("about")}
          aria-label={language === "en" ? "Open About" : "打开关于我"}
        >
          <UserRound size={17} strokeWidth={1.8} />
          <span>{"\u90b9\u7267\u5e0c / Zoey"}</span>
        </button>
        <button
          type="button"
          className={isMobileMenuOpen ? "mobile-menu-toggle is-open" : "mobile-menu-toggle"}
          onClick={toggleMobileMenu}
          aria-label={language === "en" ? "Toggle menu" : "打开菜单"}
          aria-expanded={isMobileMenuOpen}
        >
          <span />
          <span />
        </button>
      </div>

      <div className={isMobileMenuOpen ? "mobile-nav-menu is-open" : "mobile-nav-menu"}>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id ?? "home"} className="mobile-nav-group">
              <button
                type="button"
                className={item.id === "projects" && isMobileProjectsOpen ? "mobile-projects-toggle is-expanded" : ""}
                onClick={() => handleMobilePrimary(item.id)}
                aria-expanded={item.id === "projects" ? isMobileProjectsOpen : undefined}
              >
                <Icon size={15} strokeWidth={1.8} />
                <span>{language === "en" ? item.labelEn : item.label}</span>
              </button>
              {item.id === "projects" && isMobileProjectsOpen ? (
                <div className="mobile-project-list" aria-label={language === "en" ? "Project categories" : "项目分类"}>
                  {categories.map((category) => (
                    <button key={category.id} type="button" onClick={() => openMobileProject(category.id as ProjectCategoryId)}>
                      <MonitorUp size={14} strokeWidth={1.8} />
                      <span>{language === "en" ? category.labelEn : category.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        <button type="button" onClick={toggleMobileLanguage}>
          <span>CN/EN</span>
        </button>
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
              onClick={() => {
                prefetchPortfolioCategory(category.id);
                openProject(category.id as ProjectCategoryId);
              }}
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
