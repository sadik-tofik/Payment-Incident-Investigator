// ui/src/pages/Kit.tsx
// Component Catalogue and State Workbench (/_kit)
// Renders every component and every key state

import React, { useState } from "react";
import { Glyph, GLYPH_NAMES } from "../components/icons/Glyphs";
import { SourceTag, InjectedBand } from "../components/SourceTag";
import { VerdictCard } from "../components/VerdictCard";
import { IdentityPanel } from "../components/IdentityPanel";
import { SystemPanel } from "../components/SystemPanel";
import { ExplanationBlock } from "../components/ExplanationBlock";
import { EvidenceChip } from "../components/EvidenceChip";
import { EvidenceTable } from "../components/EvidenceTable";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { ActionsList } from "../components/ActionsList";
import { LimitsPanel } from "../components/LimitsPanel";
import { IntegrityPanel, FingerprintLine } from "../components/IntegrityPanel";
import { ErrorPanel } from "../components/ErrorPanel";
import { OrderIdForm } from "../components/OrderIdForm";
import { SkeletonInvestigation } from "../components/SkeletonInvestigation";
import { PipelineDiagram } from "../components/PipelineDiagram";
import { TwoLedgers } from "../scene/TwoLedgers";
import { HonestyTable } from "../components/HonestyTable";
import { FIXTURES } from "../api/mock";
import type { InvestigationResult, EvidenceItem, InvestigationError } from "../api/types";

export const Kit: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvItem, setSelectedEvItem] = useState<EvidenceItem | null>(null);

  const sampleOk = FIXTURES["investigation-confirmed-ok"].body as InvestigationResult;
  const sampleProvisional = FIXTURES["investigation-provisional-approved-not-captured"].body as InvestigationResult;
  const sampleUnresolved = FIXTURES["investigation-unresolved-needs-paypal-id"].body as InvestigationResult;
  const sampleInjected = FIXTURES["investigation-injected-amount-mismatch"].body as InvestigationResult;
  const sample502 = FIXTURES["error-502-upstream-unreachable"].body as InvestigationError;

  function handleOpenEvidence(id: string) {
    const item = sampleOk.evidence.find((e) => e.id === id) || sampleOk.evidence[0];
    setSelectedEvItem(item);
    setDrawerOpen(true);
  }

  return (
    <div className="kit-page container" id="main-content">
      <header className="kit-header">
        <span className="caption uppercase eyebrow-tag">Component Workbench</span>
        <h1 className="kit-h1">UI Kit &amp; Component States</h1>
        <p className="kit-lead">
          Visual test harness verifying every component state across light and dark themes.
        </p>
      </header>

      {/* 1. Custom Glyph Set (20x20 grid, 1.5px stroke, square caps) */}
      <section className="kit-section" aria-labelledby="kit-glyphs">
        <h2 id="kit-glyphs" className="kit-section-title">
          1. Custom Glyph Set (14 glyphs)
        </h2>
        <div className="glyphs-grid">
          {GLYPH_NAMES.map((name) => (
            <div key={name} className="glyph-cell">
              <div className="glyph-sizes">
                <Glyph name={name} size={16} />
                <Glyph name={name} size={20} />
                <Glyph name={name} size={24} />
              </div>
              <span className="mono caption">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Buttons and Links */}
      <section className="kit-section" aria-labelledby="kit-buttons">
        <h2 id="kit-buttons" className="kit-section-title">
          2. Buttons and Links
        </h2>
        <div className="kit-demo-row">
          <button type="button" className="btn-primary">
            Primary button
          </button>
          <button type="button" className="btn-secondary">
            Secondary button
          </button>
          <button type="button" className="btn-primary" disabled>
            Disabled button
          </button>
          <a href="#test" className="action-link">
            Text link underline
          </a>
          <button type="button" className="text-btn">
            Text button
          </button>
        </div>
      </section>

      {/* 3. Form Controls */}
      <section className="kit-section" aria-labelledby="kit-forms">
        <h2 id="kit-forms" className="kit-section-title">
          3. OrderIdForm
        </h2>
        <div className="kit-panel-box">
          <OrderIdForm onSubmit={() => {}} />
        </div>
      </section>

      {/* 4. SourceTag & InjectedBand */}
      <section className="kit-section" aria-labelledby="kit-tags">
        <h2 id="kit-tags" className="kit-section-title">
          4. SourceTag and InjectedBand
        </h2>
        <div className="kit-demo-stack">
          <SourceTag source={{ mode: "replay", label: "recorded real sandbox capture" }} />
          <InjectedBand />
        </div>
      </section>

      {/* 5. VerdictCard States */}
      <section className="kit-section" aria-labelledby="kit-verdicts">
        <h2 id="kit-verdicts" className="kit-section-title">
          5. VerdictCard (ok, rule_matched, unknown / abstain)
        </h2>
        <div className="kit-demo-stack">
          <VerdictCard decision={sampleOk.decision} />
          <VerdictCard decision={sampleInjected.decision} />
          <VerdictCard decision={sampleUnresolved.decision} />
        </div>
      </section>

      {/* 6. IdentityPanel (Confirmed, Provisional, Unresolved) */}
      <section className="kit-section" aria-labelledby="kit-identity">
        <h2 id="kit-identity" className="kit-section-title">
          6. IdentityPanel (Confirmed, Provisional, Unresolved)
        </h2>
        <div className="kit-demo-grid-3">
          <IdentityPanel identity={sampleOk.identity} />
          <IdentityPanel identity={sampleProvisional.identity} />
          <IdentityPanel
            identity={sampleUnresolved.identity}
            needs={sampleUnresolved.needs}
            onEnterPaypalId={() => {}}
          />
        </div>
      </section>

      {/* 7. SystemPanels */}
      <section className="kit-section" aria-labelledby="kit-systems">
        <h2 id="kit-systems" className="kit-section-title">
          7. SystemPanel (PayPal with Captures, Store, Null/Not-Read)
        </h2>
        <div className="kit-demo-grid-2">
          <SystemPanel
            systemName="PayPal"
            facts={sampleOk.systems.paypal}
          />
          <SystemPanel
            systemName="Store"
            facts={sampleOk.systems.store}
          />
          <SystemPanel
            systemName="PayPal"
            facts={null}
            nullReason="PayPal order ID missing"
          />
          <SystemPanel
            systemName="Store"
            facts={sampleInjected.systems.store}
            isInjected={true}
          />
        </div>
      </section>

      {/* 8. ExplanationBlock */}
      <section className="kit-section" aria-labelledby="kit-explanation">
        <h2 id="kit-explanation" className="kit-section-title">
          8. ExplanationBlock
        </h2>
        <div className="kit-panel-box">
          <ExplanationBlock
            explanation={sampleOk.explanation}
            allEvidence={sampleOk.evidence}
            onEvidenceClick={(id) => handleOpenEvidence(id)}
          />
        </div>
      </section>

      {/* 9. Evidence Chips & Table */}
      <section className="kit-section" aria-labelledby="kit-evidence">
        <h2 id="kit-evidence" className="kit-section-title">
          9. Evidence Chips &amp; Table
        </h2>
        <div className="kit-demo-row">
          <EvidenceChip
            evidenceId="EV-0001"
            item={{ id: "EV-0001", source: "paypal", field: "status", value: "COMPLETED", observedAt: null, rawHash: null }}
            onClick={(id) => handleOpenEvidence(id)}
          />
          <EvidenceChip
            evidenceId="EV-0002"
            item={{ id: "EV-0002", source: "store", field: "status", value: "processing", observedAt: null, rawHash: null }}
            onClick={(id) => handleOpenEvidence(id)}
          />
          <EvidenceChip
            evidenceId="EV-0003"
            item={{ id: "EV-0003", source: "engine", field: "identity.basis", value: "inferred", observedAt: null, rawHash: null }}
            onClick={(id) => handleOpenEvidence(id)}
          />
          <EvidenceChip
            evidenceId="EV-0004"
            item={{ id: "EV-0004", source: "store", field: "plugin_version", value: "4.2.0", observedAt: null, rawHash: null }}
            onClick={(id) => handleOpenEvidence(id)}
          />
        </div>
        <div className="kit-panel-box">
          <EvidenceTable
            evidence={sampleOk.evidence}
            onEvidenceClick={(id) => handleOpenEvidence(id)}
          />
        </div>
      </section>

      {/* 10. ActionsList */}
      <section className="kit-section" aria-labelledby="kit-actions">
        <h2 id="kit-actions" className="kit-section-title">
          10. ActionsList
        </h2>
        <div className="kit-panel-box">
          <ActionsList actions={sampleOk.actions} />
        </div>
      </section>

      {/* 11. LimitsPanel */}
      <section className="kit-section" aria-labelledby="kit-limits">
        <h2 id="kit-limits" className="kit-section-title">
          11. LimitsPanel
        </h2>
        <div className="kit-panel-box">
          <LimitsPanel limits={sampleOk.limits} />
        </div>
      </section>

      {/* 12. Integrity & FingerprintLine */}
      <section className="kit-section" aria-labelledby="kit-integrity">
        <h2 id="kit-integrity" className="kit-section-title">
          12. IntegrityPanel &amp; FingerprintLine
        </h2>
        <div className="kit-panel-box">
          <IntegrityPanel integrity={sampleOk.integrity} />
          <FingerprintLine
            fingerprint={sampleOk.decision.stateFingerprint}
            auditId={sampleOk.auditId}
          />
        </div>
      </section>

      {/* 13. ErrorPanel */}
      <section className="kit-section" aria-labelledby="kit-error">
        <h2 id="kit-error" className="kit-section-title">
          13. ErrorPanel (502 Upstream Unreachable)
        </h2>
        <div className="kit-panel-box">
          <ErrorPanel error={sample502} onRetry={() => {}} onBack={() => {}} />
        </div>
      </section>

      {/* 14. SkeletonInvestigation */}
      <section className="kit-section" aria-labelledby="kit-skeleton">
        <h2 id="kit-skeleton" className="kit-section-title">
          14. SkeletonInvestigation
        </h2>
        <div className="kit-panel-box">
          <SkeletonInvestigation />
        </div>
      </section>

      {/* 15. PipelineDiagram */}
      <section className="kit-section" aria-labelledby="kit-pipeline">
        <h2 id="kit-pipeline" className="kit-section-title">
          15. PipelineDiagram
        </h2>
        <div className="kit-panel-box">
          <PipelineDiagram />
        </div>
      </section>

      {/* 16. TwoLedgers Scene */}
      <section className="kit-section" aria-labelledby="kit-scene">
        <h2 id="kit-scene" className="kit-section-title">
          16. TwoLedgers Scene (Animated &amp; Static)
        </h2>
        <div className="kit-demo-grid-2">
          <TwoLedgers />
          <TwoLedgers staticState="provisional" />
        </div>
      </section>

      {/* 17. HonestyTable */}
      <section className="kit-section" aria-labelledby="kit-honesty">
        <h2 id="kit-honesty" className="kit-section-title">
          17. HonestyTable
        </h2>
        <div className="kit-panel-box">
          <HonestyTable />
        </div>
      </section>

      {/* Evidence Drawer overlay */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        item={selectedEvItem}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
