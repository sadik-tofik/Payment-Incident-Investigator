// ui/src/pages/Terms.tsx
import React, { useEffect } from "react";
import { TERMS_COPY } from "../copy";

export const Terms: React.FC = () => {
  useEffect(() => {
    document.title = "Prototype terms · Incident Investigator";
  }, []);

  const c = TERMS_COPY;

  return (
    <div className="legal-page container" id="main-content">
      <header className="page-header">
        <span className="caption uppercase eyebrow-tag">{c.eyebrow}</span>
        <h1 className="page-h1">{c.h1}</h1>
      </header>

      <div className="terms-list">
        {c.items.map((item) => (
          <article key={item.num} className="terms-item">
            <div className="terms-num-col">
              <span className="mono terms-num">{item.num}</span>
              <h2 className="terms-title">{item.title}</h2>
            </div>
            <div className="terms-desc-col">
              <p className="legal-body">{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
