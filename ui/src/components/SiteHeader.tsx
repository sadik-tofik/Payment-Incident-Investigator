// ui/src/components/SiteHeader.tsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeSwitch } from "./ThemeSwitch";
import { SHELL_COPY } from "../copy";
import { isMockMode } from "../api/client";

export const SiteHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {isMockMode && (
        <div className="mock-strip" role="status">
          <span>{SHELL_COPY.mockStrip}</span>
        </div>
      )}
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="container header-inner">
          <div className="header-left">
            <Link to="/" className="wordmark">
              {SHELL_COPY.wordmark}
            </Link>
          </div>

          <nav className="header-nav desktop-only" aria-label="Primary navigation">
            <ul className="nav-list">
              {SHELL_COPY.nav.map((item) => {
                const isCurrent = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`nav-link ${isCurrent ? "is-current" : ""}`}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="header-right desktop-only">
            <ThemeSwitch />
          </div>

          <div className="header-mobile-toggle mobile-only">
            <button
              type="button"
              className="text-btn menu-toggle-btn"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-sheet"
            >
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-navigation-sheet"
            className="mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="mobile-sheet-inner">
              <nav aria-label="Mobile primary navigation">
                <ul className="mobile-nav-list">
                  {SHELL_COPY.nav.map((item) => {
                    const isCurrent = location.pathname === item.path;
                    return (
                      <li key={item.path} className="mobile-nav-item">
                        <Link
                          to={item.path}
                          className={`mobile-nav-link ${isCurrent ? "is-current" : ""}`}
                          aria-current={isCurrent ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="mobile-theme-row">
                <ThemeSwitch />
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
