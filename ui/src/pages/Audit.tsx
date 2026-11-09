// ui/src/pages/Audit.tsx
import React, { useState, useEffect } from "react";
import { AUDIT_COPY } from "../copy";
import { getAuditVerify } from "../api/client";
import type { AuditVerifyResponse } from "../api/types";

export const Audit: React.FC = () => {
  const [data, setData] = useState<AuditVerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Audit chain check · Incident Investigator";
  }, []);

  async function handleRunCheck() {
    setLoading(true);
    setErr(null);
    try {
      const res = await getAuditVerify();
      setData(res);
    } catch {
      setErr("Failed to run audit verification check.");
    } finally {
      setLoading(false);
    }
  }

  const c = AUDIT_COPY;

  return (
    <div className="audit-page container" id="main-content">
      <header className="page-header">
        <h1 className="page-h1">{c.h1}</h1>
      </header>

      <div className="audit-content">
        <p className="audit-body">{c.body}</p>

        <div className="audit-action-row">
          <button
            type="button"
            className="btn-primary"
            onClick={handleRunCheck}
            disabled={loading}
          >
            {loading ? "Running check..." : c.button}
          </button>
        </div>

        {err && (
          <div className="audit-error" role="alert">
            <p className="mono caption">{err}</p>
          </div>
        )}

        {data && (
          <div className="audit-results-card" aria-live="polite">
            <h2 className="caption uppercase">Check Results</h2>
            <div className="results-grid">
              <div className="result-row">
                <span className="caption uppercase">Status</span>
                <span className="mono">
                  {data.ok ? c.okLabel : `Chain inconsistent (ok: false)`}
                </span>
              </div>
              <div className="result-row">
                <span className="caption uppercase">Entries checked</span>
                <span className="mono">{data.entries}</span>
              </div>
              <div className="result-row">
                <span className="caption uppercase">First bad index</span>
                <span className="mono">
                  {data.firstBadIndex !== null ? data.firstBadIndex : "None"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
