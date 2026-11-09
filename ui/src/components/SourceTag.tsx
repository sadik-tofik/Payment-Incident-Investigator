// ui/src/components/SourceTag.tsx
import React from "react";
import { Glyph } from "./icons/Glyphs";
import type { InvestigationSource } from "../api/types";

interface SourceTagProps {
  source: InvestigationSource;
}

export const SourceTag: React.FC<SourceTagProps> = ({ source }) => {
  if (source.mode === "injected") {
    // Injected cases use the full InjectedBand instead
    return null;
  }

  const isReplay = source.mode === "replay";
  const label = source.label || (isReplay ? "REPLAY · recorded real sandbox capture" : "LIVE SANDBOX");

  return (
    <aside className="source-tag-wrap" aria-label="Investigation source">
      <div className="source-tag">
        <Glyph name={isReplay ? "replay" : "observed"} size={16} />
        <span className="source-label uppercase mono">{label}</span>
      </div>
    </aside>
  );
};

export const InjectedBand: React.FC = () => {
  return (
    <aside className="injected-band" role="status" aria-label="Injected case warning">
      <div className="container injected-band-inner">
        <Glyph name="injected" size={20} />
        <span className="injected-text uppercase mono">
          INJECTED · not a real merchant incident
        </span>
      </div>
    </aside>
  );
};
