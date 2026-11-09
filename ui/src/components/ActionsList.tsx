// ui/src/components/ActionsList.tsx
import React from "react";
import { Glyph } from "./icons/Glyphs";
import type { Actions } from "../api/types";
import { INVESTIGATE_COPY } from "../copy";

interface ActionsListProps {
  actions: Actions;
}

export const ActionsList: React.FC<ActionsListProps> = ({ actions }) => {
  const safe = actions?.safe || [];
  const forbidden = actions?.forbidden || [];

  return (
    <aside className="actions-panel" aria-labelledby="actions-heading">
      <h2 id="actions-heading" className="sr-only">Actions guidance</h2>

      {safe.length > 0 && (
        <div className="safe-actions-group">
          <div className="actions-group-header">
            <Glyph name="person" size={20} />
            <h3 className="actions-subtitle">
              {INVESTIGATE_COPY.suggestedStepsHeader}
            </h3>
          </div>
          <ul className="actions-list safe-list">
            {safe.map((item, idx) => (
              <li key={item.id || idx} className="action-item safe-item">
                <p className="action-label">{item.label}</p>
                {item.rule && (
                  <span className="action-rule caption muted mono">
                    Rule {item.rule}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {forbidden.length > 0 && (
        <div className="forbidden-actions-group">
          <div className="actions-group-header">
            <Glyph name="stop" size={20} />
            <h3 className="actions-subtitle">
              {INVESTIGATE_COPY.notAllowedHeader}
            </h3>
          </div>
          <ul className="actions-list forbidden-list">
            {forbidden.map((item, idx) => (
              <li key={item.id || idx} className="action-item forbidden-item">
                <span className="mono action-id">{item.id}</span>
                <p className="action-reason">{item.reason}</p>
                {item.rule && (
                  <span className="action-rule caption muted mono">
                    Rule {item.rule}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="actions-note muted">
        {INVESTIGATE_COPY.actionsNote}
      </p>
    </aside>
  );
};
