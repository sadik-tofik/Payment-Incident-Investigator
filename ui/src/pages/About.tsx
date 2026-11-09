// ui/src/pages/About.tsx
import React, { useEffect } from "react";
import { ABOUT_COPY } from "../copy";

export const About: React.FC = () => {
  useEffect(() => {
    document.title = "About · Incident Investigator";
  }, []);

  const c = ABOUT_COPY;

  return (
    <div className="about-page container" id="main-content">
      <header className="page-header">
        <span className="caption uppercase eyebrow-tag">{c.eyebrow}</span>
        <h1 className="page-h1">{c.h1}</h1>
      </header>

      <div className="about-content">
        <p className="about-body">{c.body1}</p>
        <p className="about-body">{c.body2}</p>
      </div>
    </div>
  );
};
