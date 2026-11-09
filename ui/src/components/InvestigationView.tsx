// ui/src/components/InvestigationView.tsx
import React, { useState } from "react";
import type { InvestigationResult, EvidenceItem, InvestigationError } from "../api/types";
import { SourceTag, InjectedBand } from "./SourceTag";
import { VerdictCard } from "./VerdictCard";
import { IdentityPanel } from "./IdentityPanel";
import { SystemPanel } from "./SystemPanel";
import { ExplanationBlock } from "./ExplanationBlock";
import { EvidenceTable } from "./EvidenceTable";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { ActionsList } from "./ActionsList";
import { LimitsPanel } from "./LimitsPanel";
import { IntegrityPanel, FingerprintLine } from "./IntegrityPanel";
import { INVESTIGATE_COPY } from "../copy";
import { getEvidenceItem } from "../api/client";

interface InvestigationViewProps {
  investigation: InvestigationResult;
  onNewInvestigation?: () => void;
  onEnterPaypalId?: () => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  investigation,
  onNewInvestigation,
  onEnterPaypalId,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeEvidenceItem, setActiveEvidenceItem] = useState<EvidenceItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<InvestigationError | null>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const isInjected = investigation.source.mode === "injected";

  async function handleOpenEvidence(id: string, el: HTMLElement) {
    setTriggerEl(el);
    setDrawerOpen(true);
    setDrawerError(null);

    // First check local list
    const found = investigation.evidence.find((e) => e.id === id);
    if (found) {
      setActiveEvidenceItem(found);
      setDrawerLoading(false);
      return;
    }

    // Try fetching from API
    setDrawerLoading(true);
    try {
      const item = await getEvidenceItem(investigation.id, id);
      setActiveEvidenceItem(item);
    } catch (err) {
      setDrawerError(err as InvestigationError);
    } finally {
      setDrawerLoading(false);
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setActiveEvidenceItem(null);
    setDrawerError(null);
  }

  return (
    <div className={`investigation-view ${isInjected ? "is-injected-view" : ""}`}>
      {/* Top Source Tag or Injected Band */}
      {isInjected ? (
        <InjectedBand />
      ) : (
        <div className="container">
          <SourceTag source={investigation.source} />
        </div>
      )}

      <div className="container investigation-body">
        <div className="investigation-grid">
          {/* Main Column (cols 1 to 8) */}
          <main className="investigation-main-col" id="main-content">
            {/* Verdict */}
            <VerdictCard decision={investigation.decision} />

            {/* Systems section */}
            <section className="systems-section" aria-labelledby="systems-heading">
              <div className="systems-header">
                <h2 id="systems-heading" className="section-title">
                  {INVESTIGATE_COPY.systemsHeader}
                </h2>
                <p className="systems-subhead muted">
                  {INVESTIGATE_COPY.systemsSubhead}
                </p>
              </div>

              <div className="systems-grid">
                <SystemPanel
                  systemName="PayPal"
                  facts={investigation.systems.paypal}
                  nullReason={
                    investigation.identity.reason
                      ? INVESTIGATE_COPY.identityReasonMap[investigation.identity.reason]
                      : undefined
                  }
                  isInjected={isInjected}
                />
                <SystemPanel
                  systemName="Store"
                  facts={investigation.systems.store}
                  nullReason={
                    investigation.identity.reason
                      ? INVESTIGATE_COPY.identityReasonMap[investigation.identity.reason]
                      : undefined
                  }
                  isInjected={isInjected}
                />
              </div>
            </section>

            {/* Explanation */}
            <ExplanationBlock
              explanation={investigation.explanation}
              allEvidence={investigation.evidence}
              onEvidenceClick={handleOpenEvidence}
              selectedEvidenceId={activeEvidenceItem?.id}
            />

            {/* Evidence table */}
            <EvidenceTable
              evidence={investigation.evidence}
              onEvidenceClick={handleOpenEvidence}
              selectedEvidenceId={activeEvidenceItem?.id}
            />

            {/* Limits */}
            <LimitsPanel limits={investigation.limits} />

            {/* Integrity & Fingerprint */}
            <div className="integrity-wrap">
              <IntegrityPanel integrity={investigation.integrity} />
              <FingerprintLine
                fingerprint={investigation.decision.stateFingerprint}
                auditId={investigation.auditId}
              />
            </div>

            {/* Raw JSON viewer */}
            <div className="raw-json-section">
              <button
                type="button"
                className="text-btn toggle-raw-btn mono caption"
                onClick={() => setShowRawJson((x) => !x)}
                aria-expanded={showRawJson}
              >
                {showRawJson ? INVESTIGATE_COPY.hideRawJson : INVESTIGATE_COPY.rawJsonToggle}
              </button>
              {showRawJson && (
                <pre className="raw-json-block mono" tabIndex={0}>
                  {JSON.stringify(investigation, null, 2)}
                </pre>
              )}
            </div>
          </main>

          {/* Side Column (cols 9 to 12) */}
          <aside className="investigation-side-col">
            <div className="side-sticky-wrap">
              {/* Identity */}
              <IdentityPanel
                identity={investigation.identity}
                needs={investigation.needs}
                onEnterPaypalId={onEnterPaypalId}
              />

              {/* Next Steps & Not Allowed */}
              <ActionsList actions={investigation.actions} />

              {/* Navigation Action */}
              {onNewInvestigation && (
                <div className="new-investigation-row">
                  <button
                    type="button"
                    className="text-btn new-inv-link"
                    onClick={onNewInvestigation}
                  >
                    {INVESTIGATE_COPY.newInvestigation}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        item={activeEvidenceItem}
        error={drawerError}
        isLoading={drawerLoading}
        onClose={handleCloseDrawer}
        triggerElement={triggerEl}
      />
    </div>
  );
};
