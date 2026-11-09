// ui/src/pages/HowItWorks.tsx
import React, { useEffect } from "react";
import { PipelineDiagram } from "../components/PipelineDiagram";
import { TwoLedgers } from "../scene/TwoLedgers";
import { HOW_IT_WORKS_COPY } from "../copy";

export const HowItWorks: React.FC = () => {
  useEffect(() => {
    document.title = "How it works · Incident Investigator";
  }, []);

  const c = HOW_IT_WORKS_COPY;

  return (
    <div className="how-it-works-page container" id="main-content">
      {/* 10.1 Header */}
      <header className="page-header">
        <span className="caption uppercase eyebrow-tag">{c.header.eyebrow}</span>
        <h1 className="page-h1">{c.header.h1}</h1>
        <p className="page-lead">{c.header.lead}</p>
      </header>

      {/* 10.2 Pipeline Diagram */}
      <section className="pipeline-section" aria-label="Investigation pipeline process">
        <PipelineDiagram />
      </section>

      {/* 8.3 Smaller reuse: 3 static states side by side */}
      <section className="static-states-section" aria-labelledby="static-states-heading">
        <div className="section-label caption uppercase">Visual Model</div>
        <h2 id="static-states-heading" className="section-h2">
          Three identity states
        </h2>
        <div className="three-states-grid">
          <div className="state-panel">
            <h3 className="caption uppercase">Confirmed</h3>
            <TwoLedgers staticState="confirmed" isSmall={true} />
          </div>
          <div className="state-panel">
            <h3 className="caption uppercase">Provisional</h3>
            <TwoLedgers staticState="provisional" isSmall={true} />
          </div>
          <div className="state-panel">
            <h3 className="caption uppercase">Unresolved</h3>
            <TwoLedgers staticState="unresolved" isSmall={true} />
          </div>
        </div>
      </section>

      {/* 10.3 Steps + 10.4 Aside */}
      <div className="steps-and-aside-grid">
        <div className="steps-col">
          <h2 className="sr-only">Pipeline steps in detail</h2>
          <ol className="steps-list">
            {c.steps.map((step) => (
              <li key={step.num} className="step-item">
                <div className="step-num-col">
                  <span className="mono step-number">{step.num}</span>
                  <h3 className="step-title">{step.title}</h3>
                </div>
                <div className="step-desc-col">
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* 10.4 Aside */}
        <aside className="what-it-writes-aside" aria-labelledby="aside-title">
          <h2 id="aside-title" className="aside-title">
            {c.aside.title}
          </h2>
          <p className="aside-body">{c.aside.body}</p>
        </aside>
      </div>
    </div>
  );
};
