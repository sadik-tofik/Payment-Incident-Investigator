// ui/src/components/OrderIdForm.tsx
import React, { useState } from "react";
import { Glyph } from "./icons/Glyphs";
import { INVESTIGATE_COPY } from "../copy";

interface OrderIdFormProps {
  initialValue?: string;
  onSubmit: (paypalOrderId: string) => void;
  isLoading?: boolean;
  showOfflineNote?: boolean;
}

export const OrderIdForm: React.FC<OrderIdFormProps> = ({
  initialValue = "",
  onSubmit,
  isLoading,
  showOfflineNote = true,
}) => {
  const [value, setValue] = useState(initialValue);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setClientError("Enter a PayPal order ID to investigate.");
      return;
    }
    setClientError(null);
    onSubmit(trimmed);
  }

  const c = INVESTIGATE_COPY.startScreen;

  return (
    <form className="order-id-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="paypal-order-id-input" className="form-label caption uppercase">
          {c.fieldLabel}
        </label>
        <div className="input-wrap">
          <input
            id="paypal-order-id-input"
            type="text"
            className={`form-input mono ${clientError ? "has-error" : ""}`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (clientError) setClientError(null);
            }}
            placeholder="e.g. 5W721345678901234"
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <p className="form-helper muted">{c.fieldHelper}</p>
        {clientError && (
          <p className="form-error-msg" role="alert">
            <Glyph name="stop" size={14} />
            <span>{clientError}</span>
          </p>
        )}
      </div>

      <div className="form-action-row">
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? "Reading systems..." : c.button}
        </button>
      </div>

      {showOfflineNote && (
        <p className="form-offline-note muted caption">
          {c.noteBelowForm}
        </p>
      )}
    </form>
  );
};
