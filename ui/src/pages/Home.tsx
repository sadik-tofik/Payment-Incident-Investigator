// ui/src/pages/Home.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TwoLedgers } from "../scene/TwoLedgers";
import { HonestyTable } from "../components/HonestyTable";
import { InvestigationView } from "../components/InvestigationView";
import { HOME_COPY } from "../copy";
import { getMockInvestigation } from "../api/mock";
import type { InvestigationResult } from "../api/types";

export const Home: React.FC = () => {
  const [activeTabIdx, setActiveTabIdx] = useState(1); // Default to tab 2 (Order 20)
  const [tabResults, setTabResults] = useState<Record<string, InvestigationResult>>({});
  const [loadingTab, setLoadingTab] = useState(false);

  const hero = HOME_COPY.hero;
  const statement = HOME_COPY.statementBand;
  const list = HOME_COPY.editorialList;
  const rec = HOME_COPY.recordedCaseComponent;
  const closing = HOME_COPY.closingLine;

  const activeTab = rec.tabs[activeTabIdx];

  useEffect(() => {
    document.title = "Incident Investigator";
  }, []);

  // Preload tab investigation
  useEffect(() => {
    if (tabResults[activeTab.caseKey]) return;

    setLoadingTab(true);
    getMockInvestigation(activeTab.caseKey)
      .then((res) => {
        setTabResults((prev) => ({ ...prev, [activeTab.caseKey]: res }));
      })
      .catch(() => {})
      .finally(() => setLoadingTab(false));
  }, [activeTab.caseKey, tabResults]);

  return (
    <div className="home-page">
      {/* 9.1 Hero */}
      <section className="hero-section" aria-labelledby="hero-h1">
        <div className="container hero-inner">
          <div className="hero-grid">
            <div className="hero-content">
              <span className="caption uppercase eyebrow-tag">{hero.eyebrow}</span>
              <h1 id="hero-h1" className="hero-h1">
                {hero.h1}
              </h1>
              <p className="hero-lead">{hero.lead}</p>
              <p className="hero-fine-print muted caption">{hero.finePrint}</p>

              <div className="hero-actions">
                <Link to="/investigate" className="btn-primary">
                  {hero.primaryAction}
                </Link>
                <Link to="/evidence" className="action-link">
                  {hero.secondaryAction}
                </Link>
              </div>
            </div>

            <div className="hero-scene-wrap">
              <TwoLedgers />
            </div>
          </div>
        </div>
      </section>

      {/* 9.2 Statement Band */}
      <section className="statement-band" aria-labelledby="statement-label">
        <div className="container statement-inner">
          <div className="statement-grid">
            <div className="statement-label-col">
              <span id="statement-label" className="caption uppercase">
                {statement.label}
              </span>
            </div>
            <div className="statement-body-col">
              <p className="statement-text">{statement.body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9.3 Editorial List */}
      <section className="editorial-list-section" aria-labelledby="editorial-heading">
        <div className="container">
          <div className="section-label caption uppercase">{list.sectionLabel}</div>
          <h2 id="editorial-heading" className="sr-only">
            What one investigation gives you
          </h2>

          <div className="editorial-rows">
            {list.rows.map((row) => (
              <div key={row.num} className="editorial-row">
                <div className="row-num mono">{row.num}</div>
                <div className="row-title">
                  <h3>{row.title}</h3>
                </div>
                <div className="row-desc">
                  <p>{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9.4 The Real Component, Live on the Page */}
      <section className="recorded-case-section" aria-labelledby="recorded-h2">
        <div className="container">
          <div className="section-label caption uppercase">{rec.sectionLabel}</div>
          <h2 id="recorded-h2" className="section-h2">
            {rec.h2}
          </h2>

          {/* Segmented text tab control */}
          <div className="segmented-tabs" role="tablist" aria-label="Recorded case examples">
            {rec.tabs.map((tab, idx) => {
              const isSelected = idx === activeTabIdx;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`tab-btn ${isSelected ? "is-active" : ""}`}
                  aria-selected={isSelected}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTabIdx(idx)}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          <p className="tab-intro-text">{activeTab.intro}</p>

          <div
            id={`tabpanel-${activeTab.id}`}
            role="tabpanel"
            className="recorded-case-frame"
          >
            <div className="frame-header-row">
              <span className="frame-label mono caption uppercase">
                {rec.frameHeader}
              </span>
              <Link
                to={`/investigate?case=${encodeURIComponent(activeTab.runCaseId)}`}
                className="action-link mono caption"
              >
                {rec.linkBelow} →
              </Link>
            </div>

            <div className="frame-content">
              {loadingTab && !tabResults[activeTab.caseKey] ? (
                <div className="frame-loading">
                  <p className="caption">Loading recorded case...</p>
                </div>
              ) : tabResults[activeTab.caseKey] ? (
                <InvestigationView
                  investigation={tabResults[activeTab.caseKey]}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* 9.5 What is real table */}
      <div className="container">
        <HonestyTable />
      </div>

      {/* 9.6 Closing line */}
      <section className="closing-section" aria-labelledby="closing-body">
        <div className="container closing-inner">
          <p id="closing-body" className="closing-text">
            {closing.body}
          </p>
          <div className="closing-links">
            <Link to="/investigate" className="action-link">
              {closing.link1}
            </Link>
            <span className="sep" aria-hidden="true">·</span>
            <Link to="/how-it-works" className="action-link">
              {closing.link2}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
