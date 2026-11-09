// ui/src/components/IntegrityPanel.tsx
import React, { useState } from "react";
import type { Integrity } from "../api/types";
import { INVESTIGATE_COPY } from "../copy";

interface IntegrityPanelProps {
  integrity: Integrity;
}

export const FingerprintLine: React.FC<{
  fingerprint: string;
  auditId?: string | null;
}> = ({ fingerprint, auditId }) => {
  const [copied, setCopied] = useState(false);

  function copyFingerprint() {
    navigator.clipboard?.writeText(fingerprint).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fingerprint-line" role="group" aria-label="State fingerprint and audit">
      <div className="fingerprint-row">
        <span className="caption uppercase">State fingerprint:</span>
        <span className="mono truncate-hash" title={fingerprint}>
          {fingerprint.slice(0, 16)}…{fingerprint.slice(-8)}
        </span>
        <button
          type="button"
          className="text-btn copy-btn caption mono"
          onClick={copyFingerprint}
          aria-label="Copy full state fingerprint"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="audit-id-row">
        <span className="caption uppercase">Audit entry:</span>
        <span className="mono">{auditId || "No audit entry"}</span>
      </div>
    </div>
  );
};

export const IntegrityPanel: React.FC<IntegrityPanelProps> = ({ integrity }) => {
  const [copiedPaypal, setCopiedPaypal] = useState(false);
  const [copiedStore, setCopiedStore] = useState(false);

  function copyText(val: string, type: "paypal" | "store") {
    navigator.clipboard?.writeText(val).catch(() => {});
    if (type === "paypal") {
      setCopiedPaypal(true);
      setTimeout(() => setCopiedPaypal(false), 2000);
    } else {
      setCopiedStore(true);
      setTimeout(() => setCopiedStore(false), 2000);
    }
  }

  function truncateMiddle(hash: string): string {
    if (hash.length <= 24) return hash;
    return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
  }

  return (
    <section className="integrity-panel" aria-labelledby="integrity-heading">
      <h2 id="integrity-heading" className="section-title">
        {INVESTIGATE_COPY.integrityHeader}
      </h2>

      {integrity.hashSpec && (
        <div className="integrity-spec">
          <span className="caption uppercase">Specification</span>
          <p className="spec-text mono">{integrity.hashSpec}</p>
        </div>
      )}

      <div className="hashes-grid">
        <div className="hash-row">
          <span className="caption uppercase">PayPal stored copy hash</span>
          {integrity.paypal ? (
            <div className="hash-action-wrap">
              <span className="mono hash-val" title={integrity.paypal}>
                {truncateMiddle(integrity.paypal)}
              </span>
              <button
                type="button"
                className="text-btn copy-btn caption mono"
                onClick={() => integrity.paypal && copyText(integrity.paypal, "paypal")}
                aria-label="Copy PayPal stored copy hash"
              >
                {copiedPaypal ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <span className="mono muted">None: system not read</span>
          )}
        </div>

        <div className="hash-row">
          <span className="caption uppercase">Store stored copy hash</span>
          {integrity.store ? (
            <div className="hash-action-wrap">
              <span className="mono hash-val" title={integrity.store}>
                {truncateMiddle(integrity.store)}
              </span>
              <button
                type="button"
                className="text-btn copy-btn caption mono"
                onClick={() => integrity.store && copyText(integrity.store, "store")}
                aria-label="Copy Store stored copy hash"
              >
                {copiedStore ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <span className="mono muted">None: system not read</span>
          )}
        </div>
      </div>

      {integrity.note && (
        <p className="integrity-note muted">{integrity.note}</p>
      )}
    </section>
  );
};
