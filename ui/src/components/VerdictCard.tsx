// ui/src/components/VerdictCard.tsx
import React from "react";
import { Glyph } from "./icons/Glyphs";
import type { Decision } from "../api/types";
import { INVESTIGATE_COPY } from "../copy";

interface VerdictCardProps {
  decision: Decision;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({ decision }) => {
  const headline =
    INVESTIGATE_COPY.verdictHeadlines[decision.verdict] || decision.verdict;
  const statusLabel =
    INVESTIGATE_COPY.decisionStatusLabels[decision.decisionStatus] || decision.decisionStatus;

  const isNeutral =
    decision.verdict === "unknown" || decision.decisionStatus === "abstain";

  // Glyph selection
  const glyphName = isNeutral
    ? "inferred"
    : decision.verdict === "ok"
    ? "observed"
    : "derived";

  return (
    <section className={`verdict-card ${isNeutral ? "is-neutral" : ""}`} aria-labelledby="verdict-heading">
      <div className="verdict-header-row">
        <span className="caption uppercase">Verdict</span>
        {decision.ruleRow > 0 && (
          <span className="rule-row mono caption">
            Rule row {decision.ruleRow} of 14
          </span>
        )}
      </div>

      <div className="verdict-main-row">
        <div className="verdict-glyph-wrap" aria-hidden="true">
          <Glyph name={glyphName} size={24} />
        </div>
        <div className="verdict-text-block">
          <h2 id="verdict-heading" className="verdict-headline">
            {headline}
          </h2>
          <div className="verdict-meta-row">
            <span className="raw-verdict mono">{decision.verdict}</span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <span className="decision-status">{statusLabel}</span>
          </div>
        </div>
      </div>

      {isNeutral && (
        <p className="verdict-neutral-note">The evidence is not enough to say.</p>
      )}

      {decision.finding && (
        <div className="verdict-finding">
          <span className="caption uppercase">Finding</span>
          <p className="finding-text">{decision.finding}</p>
        </div>
      )}

      {decision.reason && (
        <div className="verdict-reason">
          <span className="caption uppercase">Reason</span>
          <p className="reason-text">{decision.reason}</p>
        </div>
      )}
    </section>
  );
};
