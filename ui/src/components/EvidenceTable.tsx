// ui/src/components/EvidenceTable.tsx
import React, { useState } from "react";
import type { EvidenceItem } from "../api/types";
import { EvidenceChip } from "./EvidenceChip";
import { Glyph } from "./icons/Glyphs";
import { getEvidenceClass } from "./EvidenceChip";
import { INVESTIGATE_COPY } from "../copy";

interface EvidenceTableProps {
  evidence: EvidenceItem[];
  onEvidenceClick: (id: string, el: HTMLElement) => void;
  selectedEvidenceId?: string;
}

export const EvidenceTable: React.FC<EvidenceTableProps> = ({
  evidence,
  onEvidenceClick,
  selectedEvidenceId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  if (!evidence || evidence.length === 0) {
    return (
      <section className="evidence-table-section" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="section-title">
          {INVESTIGATE_COPY.evidenceHeader}
        </h2>
        <p className="evidence-empty muted">No evidence items were returned.</p>
      </section>
    );
  }

  // Sort by id only
  const sorted = [...evidence].sort((a, b) => {
    return sortAsc ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
  });

  const displayed = expanded ? sorted : sorted.slice(0, 5);

  return (
    <section className="evidence-table-section" aria-labelledby="evidence-heading">
      <div className="evidence-table-header">
        <h2 id="evidence-heading" className="section-title">
          {INVESTIGATE_COPY.evidenceHeader}
        </h2>
        <button
          type="button"
          className="text-btn sort-btn mono caption"
          onClick={() => setSortAsc((s) => !s)}
          aria-label={`Sort evidence by ID ${sortAsc ? "descending" : "ascending"}`}
        >
          Sort by ID {sortAsc ? "↑" : "↓"}
        </button>
      </div>

      <div className="table-wrapper desktop-only">
        <table className="evidence-table">
          <thead>
            <tr>
              <th scope="col" className="caption uppercase">Item ID</th>
              <th scope="col" className="caption uppercase">Class</th>
              <th scope="col" className="caption uppercase">Source</th>
              <th scope="col" className="caption uppercase">Field</th>
              <th scope="col" className="caption uppercase">Value</th>
              <th scope="col" className="caption uppercase">Stored Hash</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((item) => {
              const { className, glyph } = getEvidenceClass(item);
              const valStr =
                typeof item.value === "object"
                  ? JSON.stringify(item.value)
                  : String(item.value);

              return (
                <tr
                  key={item.id}
                  className={selectedEvidenceId === item.id ? "is-selected-row" : ""}
                >
                  <td className="cell-id">
                    <EvidenceChip
                      evidenceId={item.id}
                      item={item}
                      onClick={onEvidenceClick}
                      isSelected={selectedEvidenceId === item.id}
                    />
                  </td>
                  <td className="cell-class">
                    <span className="class-label">
                      <Glyph name={glyph} size={14} />
                      <span>{className}</span>
                    </span>
                  </td>
                  <td className="cell-source mono">{item.source}</td>
                  <td className="cell-field mono">{item.field}</td>
                  <td className="cell-value mono" title={valStr}>
                    {valStr.length > 40 ? `${valStr.slice(0, 38)}…` : valStr}
                  </td>
                  <td className="cell-hash mono" title={item.rawHash || ""}>
                    {item.rawHash ? `${item.rawHash.slice(0, 8)}…` : "None"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile definition list view */}
      <div className="mobile-evidence-list mobile-only">
        {displayed.map((item) => {
          const { className, glyph } = getEvidenceClass(item);
          return (
            <div key={item.id} className="mobile-evidence-card">
              <div className="mobile-card-top">
                <EvidenceChip
                  evidenceId={item.id}
                  item={item}
                  onClick={onEvidenceClick}
                  isSelected={selectedEvidenceId === item.id}
                />
                <span className="class-label">
                  <Glyph name={glyph} size={14} />
                  <span>{className}</span>
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="caption uppercase">Source:</span>
                <span className="mono">{item.source}</span>
              </div>
              <div className="mobile-card-row">
                <span className="caption uppercase">Field:</span>
                <span className="mono">{item.field}</span>
              </div>
              <div className="mobile-card-row">
                <span className="caption uppercase">Value:</span>
                <span className="mono truncate">{String(item.value)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {evidence.length > 5 && (
        <div className="evidence-table-footer">
          <button
            type="button"
            className="text-btn toggle-expand-btn"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? "Show fewer items" : `Show all ${evidence.length} items`}
          </button>
        </div>
      )}
    </section>
  );
};
