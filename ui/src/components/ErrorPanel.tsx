// ui/src/components/ErrorPanel.tsx
import React from "react";
import type { InvestigationError } from "../api/types";
import { INVESTIGATE_COPY } from "../copy";

interface ErrorPanelProps {
  error: InvestigationError;
  onRetry?: () => void;
  onBack?: () => void;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  error,
  onRetry,
  onBack,
}) => {
  const code = error?.error?.code || "internal_error";
  const rawMsg = error?.error?.message || "";
  const partial = error?.partial;
  const auditId = error?.auditId;

  const copyEntry = INVESTIGATE_COPY.errorCopyMap[code] || {
    headline: "An error occurred",
    body: "The read did not complete.",
  };

  // Replace {system} placeholder
  let systemName = "the system";
  if (partial?.system === "paypal") systemName = "PayPal";
  else if (partial?.system === "store") systemName = "the store";

  let headline = copyEntry.headline;
  if (headline.includes("{system}")) {
    headline = partial?.system
      ? headline.replace("{system}", systemName)
      : "We could not complete the read";
  }

  return (
    <section className="error-panel" role="alert" aria-live="assertive">
      <div className="error-panel-header">
        <span className="caption uppercase error-badge">Error · {code}</span>
        <h2 className="error-headline">{headline}</h2>
        <p className="error-body">{copyEntry.body}</p>
      </div>

      {rawMsg && (
        <div className="error-server-msg-wrap">
          <span className="caption uppercase">Server message</span>
          <pre className="error-server-msg mono">{rawMsg}</pre>
        </div>
      )}

      {partial && (
        <div className="error-partial-wrap">
          <span className="caption uppercase">Partial details</span>
          <dl className="partial-list">
            {partial.system && (
              <>
                <dt className="caption uppercase">System</dt>
                <dd className="mono">{partial.system}</dd>
              </>
            )}
            {partial.reason && (
              <>
                <dt className="caption uppercase">Reason</dt>
                <dd className="mono">{partial.reason}</dd>
              </>
            )}
            {partial.retrievedAt && (
              <>
                <dt className="caption uppercase">Observed at</dt>
                <dd className="mono">{partial.retrievedAt}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {auditId && (
        <div className="error-audit-wrap">
          <span className="caption uppercase">Audit entry</span>
          <span className="mono">{auditId}</span>
        </div>
      )}

      <div className="error-actions">
        {onRetry && (
          <button type="button" className="btn-secondary" onClick={onRetry}>
            Try again
          </button>
        )}
        {onBack && (
          <button type="button" className="text-btn" onClick={onBack}>
            Back to start
          </button>
        )}
      </div>

      <p className="error-note muted">
        {INVESTIGATE_COPY.errorPanelNote}
      </p>
    </section>
  );
};
