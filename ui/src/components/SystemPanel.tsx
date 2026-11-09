// ui/src/components/SystemPanel.tsx
import React, { useState } from "react";
import type { PayPalSystemFacts, StoreSystemFacts, Capture } from "../api/types";

interface SystemPanelProps {
  systemName: "PayPal" | "Store";
  facts: PayPalSystemFacts | StoreSystemFacts | null;
  nullReason?: string;
  isInjected?: boolean;
}

function formatUtc(isoStr: string | null): string {
  if (!isoStr) return "Not recorded";
  try {
    const d = new Date(isoStr);
    const yr = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    const hr = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yr}-${mo}-${da} ${hr}:${mi} UTC`;
  } catch {
    return isoStr;
  }
}

function formatLocalTime(isoStr: string | null): string {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleString();
  } catch {
    return "";
  }
}

const TimeDisplay: React.FC<{ timeStr: string | null }> = ({ timeStr }) => {
  const [showLocal, setShowLocal] = useState(false);
  const formattedUtc = formatUtc(timeStr);
  const formattedLocal = formatLocalTime(timeStr);

  return (
    <div
      className="time-popover-wrap"
      onMouseEnter={() => setShowLocal(true)}
      onMouseLeave={() => setShowLocal(false)}
      onFocus={() => setShowLocal(true)}
      onBlur={() => setShowLocal(false)}
      tabIndex={0}
      role="region"
      aria-label="Observed time details"
    >
      <span className="mono tabular">{formattedUtc}</span>
      {showLocal && formattedLocal && (
        <span className="local-time-popover" role="tooltip">
          Local: {formattedLocal}
        </span>
      )}
    </div>
  );
};

export const CaptureList: React.FC<{ captures: Capture[] }> = ({ captures }) => {
  if (!captures || captures.length === 0) {
    return <p className="captures-empty muted">No captures recorded.</p>;
  }

  return (
    <div className="captures-list">
      <span className="caption uppercase">Captures ({captures.length})</span>
      <ul className="captures-items">
        {captures.map((cap) => (
          <li key={cap.id} className="capture-item">
            <span className="mono capture-id">{cap.id}</span>
            <span className="capture-status">{cap.status}</span>
            <span className="capture-amount mono tabular">
              {cap.currency} {cap.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const SystemPanel: React.FC<SystemPanelProps> = ({
  systemName,
  facts,
  nullReason,
  isInjected,
}) => {
  if (!facts) {
    return (
      <section
        className={`system-panel is-null ${isInjected ? "has-injected-border" : ""}`}
        aria-label={`${systemName} facts`}
      >
        <div className="system-panel-header">
          <h3 className="system-title">{systemName}</h3>
          <span className="status-badge is-unread">Not read</span>
        </div>
        <div className="system-null-body">
          <p className="null-reason">
            {nullReason || "This system was not read during this investigation."}
          </p>
        </div>
      </section>
    );
  }

  const isPayPal = systemName === "PayPal";
  const paypalFacts = isPayPal ? (facts as PayPalSystemFacts) : null;
  const storeFacts = !isPayPal ? (facts as StoreSystemFacts) : null;

  const orderId = isPayPal ? paypalFacts?.paypalOrderId : storeFacts?.localOrderId;
  const normalizedStatus = facts.normalizedStatus;
  const rawStatus = facts.status;
  const amountStr = facts.amount ? `${facts.currency} ${facts.amount}` : "None";

  return (
    <section
      className={`system-panel ${isInjected ? "has-injected-border" : ""}`}
      aria-label={`${systemName} facts`}
    >
      <div className="system-panel-header">
        <h3 className="system-title">{systemName}</h3>
        {orderId && (
          <span className="order-id mono caption tabular">Order {orderId}</span>
        )}
      </div>

      <div className="system-status-row">
        <div className="normalized-status">
          <span className="caption uppercase">Normalised Status</span>
          <p className="large-status">{normalizedStatus}</p>
        </div>
        <div className="raw-status">
          <span className="caption uppercase">Raw Status</span>
          <p className="raw-status-text mono">{rawStatus}</p>
        </div>
      </div>

      <div className="system-data-grid">
        <div className="data-row">
          <span className="caption uppercase">Amount</span>
          <span className="mono tabular">{amountStr}</span>
        </div>

        <div className="data-row">
          <span className="caption uppercase">Observed at</span>
          <TimeDisplay timeStr={facts.retrievedAt} />
        </div>

        {!isPayPal && storeFacts && (
          <>
            <div className="data-row">
              <span className="caption uppercase">PayPal ID in Store</span>
              <span className="store-holds-text">
                Store holds the PayPal order ID: {storeFacts.holdsPayPalOrderId ? "yes" : "no"}
              </span>
            </div>

            {storeFacts.pluginVersion && (
              <div className="data-row">
                <span className="caption uppercase">Plugin Version</span>
                <span className="mono">
                  {storeFacts.pluginVersion} (declared by the operator)
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {isPayPal && paypalFacts && (
        <div className="system-captures-wrap">
          <CaptureList captures={paypalFacts.captures} />
        </div>
      )}
    </section>
  );
};
