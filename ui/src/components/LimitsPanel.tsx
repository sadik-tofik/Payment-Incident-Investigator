// ui/src/components/LimitsPanel.tsx
import React from "react";
import { INVESTIGATE_COPY } from "../copy";

interface LimitsPanelProps {
  limits: string[];
}

export const LimitsPanel: React.FC<LimitsPanelProps> = ({ limits }) => {
  if (!limits || limits.length === 0) return null;

  return (
    <section className="limits-panel" aria-labelledby="limits-heading">
      <h2 id="limits-heading" className="section-title">
        {INVESTIGATE_COPY.limitsHeader}
      </h2>
      <ul className="limits-list">
        {limits.map((limit, idx) => (
          <li key={idx} className="limit-item">
            {limit}
          </li>
        ))}
      </ul>
    </section>
  );
};
