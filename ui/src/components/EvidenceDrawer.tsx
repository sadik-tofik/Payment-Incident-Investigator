// ui/src/components/EvidenceDrawer.tsx
import React, { useEffect, useRef } from "react";
import { Glyph } from "./icons/Glyphs";
import { getEvidenceClass } from "./EvidenceChip";
import type { EvidenceItem, InvestigationError } from "../api/types";
import { ErrorPanel } from "./ErrorPanel";

interface EvidenceDrawerProps {
  isOpen: boolean;
  item: EvidenceItem | null;
  error?: InvestigationError | null;
  isLoading?: boolean;
  onClose: () => void;
  triggerElement?: HTMLElement | null;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  item,
  error,
  isLoading,
  onClose,
  triggerElement,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when opened
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Trap focus
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      // Return focus to trigger element
      triggerElement?.focus();
    };
  }, [isOpen, onClose, triggerElement]);

  if (!isOpen) return null;

  const { className, glyph } = item
    ? getEvidenceClass(item)
    : { className: "Observation", glyph: "observed" as const };

  return (
    <div
      className="drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={drawerRef}
        className="evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="caption uppercase">Evidence Item</span>
            <h2 id="drawer-title" className="drawer-title mono">
              {item ? item.id : "Loading..."}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="text-btn drawer-close-btn"
            onClick={onClose}
            aria-label="Close evidence drawer"
          >
            Close
          </button>
        </div>

        <div className="drawer-content">
          {isLoading && (
            <div className="drawer-loading" aria-busy="true">
              <p className="caption">Loading evidence details...</p>
            </div>
          )}

          {error && (
            <div className="drawer-error">
              <ErrorPanel error={error} onRetry={() => {}} onBack={onClose} />
            </div>
          )}

          {!isLoading && !error && item && (
            <div className="drawer-body">
              <div className="drawer-row">
                <span className="caption uppercase">Evidence Class</span>
                <div className="evidence-class-badge">
                  <Glyph name={glyph} size={16} />
                  <span>{className}</span>
                </div>
              </div>

              <div className="drawer-row">
                <span className="caption uppercase">Source</span>
                <span className="mono">{item.source}</span>
              </div>

              <div className="drawer-row">
                <span className="caption uppercase">Field</span>
                <span className="mono">{item.field}</span>
              </div>

              <div className="drawer-row">
                <span className="caption uppercase">Value</span>
                <pre className="drawer-value mono">
                  {typeof item.value === "object"
                    ? JSON.stringify(item.value, null, 2)
                    : String(item.value)}
                </pre>
              </div>

              {item.observedAt && (
                <div className="drawer-row">
                  <span className="caption uppercase">Observed at</span>
                  <span className="mono">{item.observedAt}</span>
                </div>
              )}

              <div className="drawer-row hash-section">
                <span className="caption uppercase">Stored Copy Hash</span>
                <p className="mono hash-val">
                  {item.rawHash ? item.rawHash : "None: derived by the engine"}
                </p>
                <p className="hash-note muted">
                  This hash identifies the stored copy. It does not show that PayPal or the store said it.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
