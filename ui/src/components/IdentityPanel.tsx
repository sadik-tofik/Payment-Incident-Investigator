// ui/src/components/IdentityPanel.tsx
import React from "react";
import { Glyph } from "./icons/Glyphs";
import type { Identity, Needs } from "../api/types";
import { INVESTIGATE_COPY } from "../copy";

interface IdentityPanelProps {
  identity: Identity;
  needs?: Needs;
  onEnterPaypalId?: () => void;
}

export const IdentityPanel: React.FC<IdentityPanelProps> = ({
  identity,
  needs,
  onEnterPaypalId,
}) => {
  const isProvisional = identity.state === "provisional_association";
  const isUnresolved = identity.state === "unresolved";

  let glyphName: "link-confirmed" | "link-provisional" | "link-unresolved" = "link-confirmed";
  let label = "Confirmed: both systems name each other";

  if (isProvisional) {
    glyphName = "link-provisional";
    label = "Provisional association";
  } else if (isUnresolved) {
    glyphName = "link-unresolved";
    label = "Unresolved: cannot link the two orders";
  }

  const reasonText = identity.reason
    ? INVESTIGATE_COPY.identityReasonMap[identity.reason] || identity.reason
    : null;

  return (
    <aside
      className={`identity-panel state-${identity.state}`}
      aria-label="Order identity linkage"
    >
      <div className="identity-header">
        <div className="identity-glyph" aria-hidden="true">
          <Glyph name={glyphName} size={20} />
        </div>
        <div className="identity-title-group">
          <span className="caption uppercase">Identity Link</span>
          <h3 className="identity-label">{label}</h3>
        </div>
      </div>

      {identity.basis && (
        <div className="identity-basis">
          <span className="caption uppercase">Basis</span>
          <p className="basis-text mono">{identity.basis}</p>
        </div>
      )}

      {isProvisional && identity.requiredNotice && (
        <div className="identity-notice" role="note">
          <p className="notice-text">{identity.requiredNotice}</p>
        </div>
      )}

      {isUnresolved && reasonText && (
        <div className="identity-reason">
          <span className="caption uppercase">Reason</span>
          <p className="reason-text">{reasonText}</p>
        </div>
      )}

      {isUnresolved && needs?.paypalOrderId && (
        <div className="identity-needs-action">
          <p className="needs-text">
            Supply the PayPal order ID to link this store order.
          </p>
          {onEnterPaypalId && (
            <button
              type="button"
              className="text-btn action-link"
              onClick={onEnterPaypalId}
            >
              Enter PayPal order ID
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
