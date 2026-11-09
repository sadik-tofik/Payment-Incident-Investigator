// ui/src/components/ExplanationBlock.tsx
import React from "react";
import type { Explanation, EvidenceItem } from "../api/types";
import { EvidenceChip } from "./EvidenceChip";
import { INVESTIGATE_COPY } from "../copy";

interface ExplanationBlockProps {
  explanation: Explanation;
  allEvidence: EvidenceItem[];
  onEvidenceClick: (id: string, el: HTMLElement) => void;
  selectedEvidenceId?: string;
}

export const ExplanationBlock: React.FC<ExplanationBlockProps> = ({
  explanation,
  allEvidence,
  onEvidenceClick,
  selectedEvidenceId,
}) => {
  const isAi = explanation.kind === "ai_validated";
  const showAiConfigured = explanation.aiStatus !== "not_configured";

  const tagLabel = isAi
    ? INVESTIGATE_COPY.explanationTagAi
    : INVESTIGATE_COPY.explanationTagTemplate;

  // Build a map of evidence items
  const evMap = new Map<string, EvidenceItem>();
  for (const item of allEvidence) {
    evMap.set(item.id, item);
  }

  return (
    <section className="explanation-block" aria-labelledby="explanation-heading">
      <div className="explanation-header">
        <h2 id="explanation-heading" className="section-title">
          {INVESTIGATE_COPY.explanationHeader}
        </h2>
        {showAiConfigured && (
          <div className="explanation-kind-tag">
            <span className="caption uppercase">{tagLabel}</span>
          </div>
        )}
      </div>

      {isAi && (
        <p className="explanation-ai-note muted">
          {INVESTIGATE_COPY.explanationAiNote}
        </p>
      )}

      {explanation.aiRejected && (
        <p className="explanation-ai-rejected muted">
          {INVESTIGATE_COPY.explanationAiRejected}
        </p>
      )}

      <div className="statements-list">
        {explanation.statements && explanation.statements.length > 0 ? (
          explanation.statements.map((stmt, idx) => (
            <div key={idx} className="statement-item">
              <p className="statement-text">{stmt.text}</p>
              {stmt.evidenceIds && stmt.evidenceIds.length > 0 && (
                <div className="statement-chips" aria-label="Cited evidence">
                  {stmt.evidenceIds.map((evId) => (
                    <EvidenceChip
                      key={evId}
                      evidenceId={evId}
                      item={evMap.get(evId)}
                      onClick={onEvidenceClick}
                      isSelected={selectedEvidenceId === evId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="statement-text">{explanation.text}</p>
        )}
      </div>
    </section>
  );
};
