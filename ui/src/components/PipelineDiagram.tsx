// ui/src/components/PipelineDiagram.tsx
import React from "react";

export const PipelineDiagram: React.FC = () => {
  const steps = [
    { num: "01", label: "Input", note: null },
    { num: "02", label: "Two reads", note: "not simultaneous" },
    { num: "03", label: "Identity", note: null },
    { num: "04", label: "Decision", note: null },
    { num: "05", label: "Evidence", note: null },
    { num: "06", label: "Explanation", note: "template by default" },
    { num: "07", label: "Next steps", note: null },
    { num: "08", label: "Record", note: "local only" },
  ];

  return (
    <figure
      className="pipeline-figure"
      aria-label="Eight-step pipeline: Input, Two reads, Identity, Decision, Evidence, Explanation, Next steps, Record"
    >
      {/* Desktop SVG layout */}
      <div className="pipeline-desktop desktop-only">
        <svg
          viewBox="0 0 1200 130"
          className="pipeline-svg"
          role="img"
          aria-hidden="true"
        >
          {/* Connecting line behind boxes */}
          <line
            x1="60"
            y1="40"
            x2="1140"
            y2="40"
            stroke="var(--hairline-strong)"
            strokeWidth="1"
          />

          {/* Bracket line under node 02 */}
          <line
            x1="180"
            y1="82"
            x2="280"
            y2="82"
            stroke="var(--hairline-strong)"
            strokeWidth="1"
          />
          <text
            x="230"
            y="98"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            not simultaneous
          </text>

          {/* 8 Nodes */}
          {steps.map((s, i) => {
            const x = 20 + i * 145;
            const y = 14;
            const width = 125;
            const height = 52;

            return (
              <g key={s.num} transform={`translate(${x}, ${y})`}>
                <rect
                  width={width}
                  height={height}
                  rx="4"
                  ry="4"
                  fill="var(--surface)"
                  stroke="var(--hairline-strong)"
                  strokeWidth="1"
                />
                <text
                  x="14"
                  y="24"
                  fill="var(--muted)"
                  fontSize="12"
                  fontFamily="var(--font-mono)"
                >
                  {s.num}
                </text>
                <text
                  x="14"
                  y="40"
                  fill="var(--ink)"
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="var(--font-sans)"
                >
                  {s.label}
                </text>
                {s.note && s.num !== "02" && (
                  <text
                    x={width / 2}
                    y={height + 18}
                    textAnchor="middle"
                    fill="var(--muted)"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                  >
                    {s.note}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile vertical list */}
      <ol className="pipeline-mobile-list mobile-only" aria-label="Pipeline steps">
        {steps.map((s) => (
          <li key={s.num} className="pipeline-mobile-item">
            <span className="mono step-num">{s.num}</span>
            <div className="step-info">
              <span className="step-label">{s.label}</span>
              {s.note && <span className="step-note mono caption">{s.note}</span>}
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="sr-only">
        Investigation pipeline: 01 Input, 02 Two reads (not simultaneous), 03 Identity, 04 Decision, 05 Evidence, 06 Explanation (template by default), 07 Next steps, 08 Record (local only).
      </figcaption>
    </figure>
  );
};
