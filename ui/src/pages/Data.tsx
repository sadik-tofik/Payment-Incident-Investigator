// ui/src/pages/Data.tsx
import React, { useEffect } from "react";
import { DATA_COPY } from "../copy";

export const Data: React.FC = () => {
  useEffect(() => {
    document.title = "Data and privacy · Incident Investigator";
  }, []);

  const c = DATA_COPY;

  return (
    <div className="legal-page container" id="main-content">
      <header className="page-header">
        <span className="caption uppercase eyebrow-tag">{c.eyebrow}</span>
        <h1 className="page-h1">{c.h1}</h1>
        <p className="page-lead">{c.lead}</p>
      </header>

      <div className="legal-sections">
        {c.sections.map((sec, idx) => (
          <section key={idx} className="legal-section">
            <h2 className="section-h2">{sec.h2}</h2>
            <p className="legal-body">{sec.body}</p>
          </section>
        ))}
      </div>

      <div className="legal-note-box" role="note">
        <p className="caption muted">{c.note}</p>
      </div>
    </div>
  );
};
