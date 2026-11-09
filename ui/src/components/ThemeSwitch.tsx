// ui/src/components/ThemeSwitch.tsx
import React, { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

export const ThemeSwitch: React.FC = () => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("pii-theme") as ThemeMode | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
      }
    } catch {
      // storage blocked fallback
    }
    return "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme(currentMode: ThemeMode) {
      if (currentMode === "system") {
        root.setAttribute("data-theme", mq.matches ? "dark" : "light");
      } else {
        root.setAttribute("data-theme", currentMode);
      }
    }

    applyTheme(mode);

    try {
      localStorage.setItem("pii-theme", mode);
    } catch {
      // ignore
    }

    const handler = () => {
      if (mode === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  function cycle() {
    setMode((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }

  const label =
    mode === "light"
      ? "Theme: light (click for dark)"
      : mode === "dark"
      ? "Theme: dark (click for system)"
      : "Theme: system match (click for light)";

  return (
    <button
      type="button"
      onClick={cycle}
      className="theme-switch-btn"
      aria-label={label}
      title={label}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span
          className={`theme-indicator ${
            mode === "light" ? "is-light" : mode === "dark" ? "is-dark" : "is-system"
          }`}
        />
      </span>
      <span className="theme-text mono" aria-hidden="true">
        {mode === "light" ? "Light" : mode === "dark" ? "Dark" : "Auto"}
      </span>
    </button>
  );
};
