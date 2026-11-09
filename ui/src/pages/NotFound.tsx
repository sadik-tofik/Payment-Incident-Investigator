// ui/src/pages/NotFound.tsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SHELL_COPY } from "../copy";

export const NotFound: React.FC = () => {
  useEffect(() => {
    document.title = "Not found · Incident Investigator";
  }, []);

  const c = SHELL_COPY.notFound;

  return (
    <div className="not-found-page container" id="main-content">
      <div className="not-found-card">
        <h1 className="not-found-h1">{c.h1}</h1>
        <p className="not-found-body muted">{c.body}</p>
        <div className="not-found-links">
          {c.links.map((link, idx) => (
            <React.Fragment key={link.path}>
              {idx > 0 && <span className="sep" aria-hidden="true">·</span>}
              <Link to={link.path} className="action-link">
                {link.label}
              </Link>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
