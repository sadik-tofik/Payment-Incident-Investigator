// ui/src/components/HonestyTable.tsx
import React from "react";
import { Link } from "react-router-dom";
import { HOME_COPY } from "../copy";

export const HonestyTable: React.FC = () => {
  const c = HOME_COPY.honestyTable;

  return (
    <section className="honesty-section" aria-labelledby="honesty-heading">
      <div className="section-label caption uppercase">{c.sectionLabel}</div>
      <h2 id="honesty-heading" className="section-h2">
        {c.h2}
      </h2>

      <div className="table-responsive">
        <table className="honesty-table">
          <thead>
            <tr>
              <th scope="col" className="caption uppercase">Capability / Scope</th>
              <th scope="col" className="caption uppercase">Current Status</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row, idx) => (
              <tr key={idx}>
                <th scope="row" className="row-what">
                  {row.what}
                </th>
                <td className="row-status">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="honesty-link-row">
        <Link to="/evidence" className="action-link">
          {c.linkText}
        </Link>
      </div>
    </section>
  );
};
