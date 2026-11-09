// ui/src/scene/TwoLedgers.tsx
import React, { useState, useEffect, useRef } from "react";

export type TwoLedgersState = "confirmed" | "provisional" | "unresolved";

interface TwoLedgersProps {
  staticState?: TwoLedgersState;
  isSmall?: boolean;
}

export const TwoLedgers: React.FC<TwoLedgersProps> = ({
  staticState,
  isSmall = false,
}) => {
  const [currentState, setCurrentState] = useState<TwoLedgersState>(
    staticState || "confirmed"
  );
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    if (mq.matches && !staticState) {
      setCurrentState("provisional");
    }

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches && !staticState) {
        setCurrentState("provisional");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [staticState]);

  // 12-second loop: 3.6s per state (3.2s hold + 0.4s transition)
  useEffect(() => {
    if (staticState || reducedMotion || isPaused || isHovered) return;

    const interval = setInterval(() => {
      setCurrentState((prev) => {
        if (prev === "confirmed") return "provisional";
        if (prev === "provisional") return "unresolved";
        return "confirmed";
      });
    }, 3600);

    return () => clearInterval(interval);
  }, [staticState, reducedMotion, isPaused, isHovered]);

  const stateDetails = {
    confirmed: {
      label: "Confirmed: both name each other",
      className: "thread-confirmed",
      color: "var(--accent)",
    },
    provisional: {
      label: "Provisional: link inferred",
      className: "thread-provisional",
      color: "var(--amber)",
    },
    unresolved: {
      label: "Unresolved: cannot link",
      className: "thread-unresolved",
      color: "var(--slate)",
    },
  }[currentState];

  return (
    <figure
      ref={containerRef}
      className={`two-ledgers-scene ${isSmall ? "is-small" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      aria-label={`Two Ledgers visual model: ${stateDetails.label}`}
    >
      <div className="scene-stage">
        {/* Plane A: Upper (PayPal Order) */}
        <div className="ledger-plane plane-paypal" aria-hidden="true">
          <div className="plane-header">
            <span className="plane-title mono">PAYPAL ORDER</span>
          </div>
          <div className="plane-rows">
            <div className="plane-row">
              <span className="mono caption">status</span>
              <div className="placeholder-bar bar-1" />
            </div>
            <div className="plane-row">
              <span className="mono caption">amount</span>
              <div className="placeholder-bar bar-2" />
            </div>
            <div className="plane-row">
              <span className="mono caption">currency</span>
              <div className="placeholder-bar bar-3" />
            </div>
            <div className="plane-row">
              <span className="mono caption">observed at</span>
              <div className="placeholder-bar bar-4" />
            </div>
            <div className="plane-row has-anchor">
              <span className="mono caption">order id</span>
              <div className="placeholder-bar bar-5" />
            </div>
          </div>
        </div>

        {/* Dynamic connecting thread in 3D perspective space */}
        <div className={`scene-thread-wrap ${stateDetails.className}`} aria-hidden="true">
          <svg className="thread-svg" viewBox="0 0 100 160">
            {currentState === "confirmed" && (
              <>
                <line x1="50" y1="10" x2="50" y2="150" stroke="var(--accent)" strokeWidth="2" />
                <rect x="47" y="7" width="6" height="6" fill="var(--accent)" />
                <rect x="47" y="147" width="6" height="6" fill="var(--accent)" />
              </>
            )}
            {currentState === "provisional" && (
              <>
                <line
                  x1="50"
                  y1="10"
                  x2="50"
                  y2="150"
                  stroke="var(--amber)"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                />
                <circle cx="50" cy="80" r="7" fill="var(--paper)" stroke="var(--amber)" strokeWidth="1.5" />
                <path d="M 50 73 A 7 7 0 0 1 50 87 Z" fill="var(--amber)" />
              </>
            )}
            {currentState === "unresolved" && (
              <>
                <line x1="50" y1="10" x2="50" y2="55" stroke="var(--slate)" strokeWidth="2" />
                <line x1="50" y1="105" x2="50" y2="150" stroke="var(--slate)" strokeWidth="2" />
              </>
            )}
          </svg>
          <div className="thread-state-badge mono caption">
            <span>{stateDetails.label}</span>
          </div>
        </div>

        {/* Plane B: Lower (Store Order) */}
        <div className="ledger-plane plane-store" aria-hidden="true">
          <div className="plane-header">
            <span className="plane-title mono">STORE ORDER</span>
          </div>
          <div className="plane-rows">
            <div className="plane-row">
              <span className="mono caption">status</span>
              <div className="placeholder-bar bar-2" />
            </div>
            <div className="plane-row">
              <span className="mono caption">amount</span>
              <div className="placeholder-bar bar-2" />
            </div>
            <div className="plane-row">
              <span className="mono caption">currency</span>
              <div className="placeholder-bar bar-3" />
            </div>
            <div className="plane-row">
              <span className="mono caption">observed at</span>
              <div className="placeholder-bar bar-4" />
            </div>
            <div className="plane-row has-anchor">
              <span className="mono caption">order id</span>
              <div className="placeholder-bar bar-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="scene-footer">
        <figcaption className="scene-caption mono uppercase">
          ILLUSTRATION OF THE IDEA. NOT DATA.
        </figcaption>
        {!staticState && !reducedMotion && (
          <button
            type="button"
            className="text-btn pause-toggle-btn mono caption"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? "Play scene animation" : "Pause scene animation"}
          >
            {isPaused ? "Play" : "Pause"}
          </button>
        )}
      </div>
    </figure>
  );
};
