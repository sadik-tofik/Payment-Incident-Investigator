// ui/src/pages/Evidence.tsx
import React, { useEffect } from "react";
import { EVIDENCE_COPY } from "../copy";

export const Evidence: React.FC = () => {
  useEffect(() => {
    document.title = "Evidence and limits · Incident Investigator";
  }, []);

  const c = EVIDENCE_COPY;

  return (
    <div className="evidence-page container" id="main-content">
      {/* 11.1 Header */}
      <header className="page-header">
        <span className="caption uppercase eyebrow-tag">{c.header.eyebrow}</span>
        <h1 className="page-h1">{c.header.h1}</h1>
        <p className="page-lead">{c.header.lead}</p>
      </header>

      <div className="evidence-layout-grid">
        {/* Sticky in-page contents list on desktop (cols 1 to 3) */}
        <nav className="in-page-nav desktop-only" aria-label="Evidence page contents">
          <ul className="in-page-links">
            <li>
              <a href="#what-covered">What the evidence covers</a>
            </li>
            <li>
              <a href="#what-not-known">What this tool does not know</a>
            </li>
            <li>
              <a href="#how-to-read-labels">How to read the labels</a>
            </li>
          </ul>
        </nav>

        {/* Content column (cols 4 to 12) */}
        <div className="evidence-content-col">
          {/* What the evidence covers */}
          <section id="what-covered" className="evidence-section" aria-labelledby="h2-coverage">
            <h2 id="h2-coverage" className="section-h2">
              {c.header.h2Coverage}
            </h2>
            <div className="table-responsive">
              <table className="coverage-table">
                <thead>
                  <tr>
                    <th scope="col" className="caption uppercase">Observation / Case</th>
                    <th scope="col" className="caption uppercase">Details and Limits</th>
                  </tr>
                </thead>
                <tbody>
                  {c.header.coverageRows.map((row, idx) => (
                    <tr key={idx}>
                      <th scope="row" className="row-label">
                        {row.label}
                      </th>
                      <td className="row-text">{row.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 11.2 Limits */}
          <section id="what-not-known" className="evidence-section" aria-labelledby="h2-limits">
            <h2 id="h2-limits" className="section-h2">
              {c.limits.h2}
            </h2>
            <ol className="numbered-limits-list">
              {c.limits.items.map((item, idx) => (
                <li key={idx} className="limit-list-item">
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* 11.3 How to read labels */}
          <section id="how-to-read-labels" className="evidence-section" aria-labelledby="h2-labels">
            <h2 id="h2-labels" className="section-h2">
              {c.labels.h2}
            </h2>
            <dl className="labels-definition-list">
              {c.labels.definitions.map((d, idx) => (
                <div key={idx} className="definition-pair">
                  <dt className="term-heading">
                    <h3>{d.term}</h3>
                  </dt>
                  <dd className="def-text">
                    <p>{d.def}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 11.4 Footer line */}
          <div className="evidence-footer-line">
            <p className="caption muted">{c.footerLine}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
