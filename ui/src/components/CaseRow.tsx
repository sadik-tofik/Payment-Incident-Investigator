// ui/src/components/CaseRow.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Glyph } from "./icons/Glyphs";
import type { CaseEntry } from "../api/types";
import { CASES_COPY } from "../copy";

interface CaseRowProps {
  caseEntry: CaseEntry;
  onSelect?: (caseId: string) => void;
}

export const CaseRow: React.FC<CaseRowProps> = ({ caseEntry, onSelect }) => {
  const isInjected = caseEntry.mode === "injected";
  const desc =
    CASES_COPY.descriptions[caseEntry.id] || caseEntry.title;

  return (
    <article className={`case-row ${isInjected ? "is-injected-case" : ""}`}>
      <div className="case-row-main">
        <div className="case-row-header">
          <h3 className="case-title mono">{caseEntry.id}</h3>
          <div className="case-tag-badge">
            <Glyph name={isInjected ? "injected" : "replay"} size={14} />
            <span className="caption uppercase mono">
              {isInjected ? "Injected" : "Replay"}
            </span>
          </div>
        </div>
        <p className="case-desc">{desc}</p>
      </div>

      <div className="case-row-action">
        {onSelect ? (
          <button
            type="button"
            className="text-btn run-case-btn"
            onClick={() => onSelect(caseEntry.id)}
          >
            {CASES_COPY.runLink}
          </button>
        ) : (
          <Link
            to={`/investigate?case=${encodeURIComponent(caseEntry.id)}`}
            className="run-case-link"
          >
            {CASES_COPY.runLink}
          </Link>
        )}
      </div>
    </article>
  );
};
