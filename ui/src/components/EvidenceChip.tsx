// ui/src/components/EvidenceChip.tsx
import React from "react";
import { Glyph, type GlyphName } from "./icons/Glyphs";
import type { EvidenceItem } from "../api/types";

export type EvidenceClass = "Observation" | "Derived" | "Inference" | "Declared" | "Advice";

export function getEvidenceClass(item: Partial<EvidenceItem>): {
  className: EvidenceClass;
  glyph: GlyphName;
} {
  if (item.source === "paypal" || item.source === "store") {
    if (item.field?.includes("plugin_version") || item.field?.includes("pluginVersion")) {
      return { className: "Declared", glyph: "declared" };
    }
    return { className: "Observation", glyph: "observed" };
  }
  if (item.source === "engine") {
    if (item.field?.includes("identity") || item.field?.includes("basis")) {
      return { className: "Inference", glyph: "inferred" };
    }
    return { className: "Derived", glyph: "derived" };
  }
  return { className: "Derived", glyph: "derived" };
}

interface EvidenceChipProps {
  evidenceId: string;
  item?: EvidenceItem;
  onClick: (id: string, triggerEl: HTMLElement) => void;
  isSelected?: boolean;
}

export const EvidenceChip: React.FC<EvidenceChipProps> = ({
  evidenceId,
  item,
  onClick,
  isSelected,
}) => {
  const { className, glyph } = getEvidenceClass(item || { id: evidenceId });

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick(evidenceId, e.currentTarget);
  }

  return (
    <button
      type="button"
      className={`evidence-chip ${isSelected ? "is-selected" : ""}`}
      onClick={handleClick}
      aria-haspopup="dialog"
      aria-label={`Open evidence ${evidenceId}, class: ${className}`}
      title={`${evidenceId} · ${className}`}
    >
      <Glyph name={glyph} size={14} />
      <span className="chip-id mono">{evidenceId}</span>
    </button>
  );
};
