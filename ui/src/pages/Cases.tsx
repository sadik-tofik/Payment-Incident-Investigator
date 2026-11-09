// ui/src/pages/Cases.tsx
import React, { useState, useEffect } from "react";
import { CaseRow } from "../components/CaseRow";
import { CASES_COPY } from "../copy";
import { getCases } from "../api/client";
import type { CaseEntry } from "../api/types";

export const Cases: React.FC = () => {
  const [cases, setCases] = useState<CaseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Cases · Incident Investigator";
    getCases()
      .then((res) => setCases(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const replayCases = cases.filter((c) => c.mode === "replay");
  const injectedCases = cases.filter((c) => c.mode === "injected");

  const header = CASES_COPY.header;

  return (
    <div className="cases-page container" id="main-content">
      <header className="cases-header">
        <span className="caption uppercase eyebrow-tag">{header.eyebrow}</span>
        <h1 className="cases-h1">{header.h1}</h1>
        <p className="cases-lead">{header.lead}</p>
      </header>

      {loading ? (
        <div className="cases-loading" aria-busy="true">
          <p className="caption">Loading cases...</p>
        </div>
      ) : (
        <div className="cases-groups">
          {/* Recorded real sandbox captures */}
          <section className="cases-group" aria-labelledby="group-replay">
            <h2 id="group-replay" className="group-title">
              {CASES_COPY.groupReplay}
            </h2>
            <div className="cases-list-wrap">
              {replayCases.map((cs) => (
                <CaseRow key={cs.id} caseEntry={cs} />
              ))}
            </div>
          </section>

          {/* Injected cases */}
          <section className="cases-group" aria-labelledby="group-injected">
            <h2 id="group-injected" className="group-title">
              {CASES_COPY.groupInjected}
            </h2>
            <div className="cases-list-wrap">
              {injectedCases.map((cs) => (
                <CaseRow key={cs.id} caseEntry={cs} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
