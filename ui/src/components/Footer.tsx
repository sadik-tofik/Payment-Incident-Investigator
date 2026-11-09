// ui/src/components/Footer.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SHELL_COPY } from "../copy";
import { getHealth } from "../api/client";

export const Footer: React.FC = () => {
  const [buildVersion, setBuildVersion] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((h) => {
        if (active && h && h.build) {
          setBuildVersion(h.build);
        }
      })
      .catch(() => {
        if (active) setBuildVersion(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const f = SHELL_COPY.footer;

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-inner">
        <div className="footer-cols">
          <div className="footer-col col-1">
            <h2 className="footer-title">{f.col1Title}</h2>
            <p className="footer-body">{f.col1Body}</p>
          </div>

          <div className="footer-col col-2">
            <h2 className="footer-title">{f.col2Title}</h2>
            <ul className="footer-links">
              {f.col2Links.map((link) => (
                <li key={link.path}>
                  <Link to={link.path}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col col-3">
            <h2 className="footer-title">{f.col3Title}</h2>
            <ul className="footer-links">
              {f.col3Links.map((link) => (
                <li key={link.path}>
                  <Link to={link.path}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col col-4">
            <h2 className="footer-title">{f.col4Title}</h2>
            <p className="footer-body mono">
              {buildVersion ? `${f.buildPrefix}${buildVersion}` : f.buildUnknown}
            </p>
          </div>
        </div>

        <div className="footer-disclaimer">
          <p>{f.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
};
