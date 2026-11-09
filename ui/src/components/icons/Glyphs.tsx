// ui/src/components/icons/Glyphs.tsx
// 14 custom inline SVG glyphs on 20x20 grid, 1.5px stroke, square caps, mitre joins, currentColor

import React from "react";

export type GlyphSize = 14 | 16 | 20 | 24;

export type GlyphName =
  | "observed"
  | "derived"
  | "inferred"
  | "declared"
  | "advice"
  | "link-confirmed"
  | "link-provisional"
  | "link-unresolved"
  | "replay"
  | "injected"
  | "evidence"
  | "hash"
  | "stop"
  | "person";

export const GLYPH_NAMES: GlyphName[] = [
  "observed",
  "derived",
  "inferred",
  "declared",
  "advice",
  "link-confirmed",
  "link-provisional",
  "link-unresolved",
  "replay",
  "injected",
  "evidence",
  "hash",
  "stop",
  "person",
];

interface GlyphProps {
  size?: GlyphSize;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const baseStyle = (size: GlyphSize) => ({
  width: `${size}px`,
  height: `${size}px`,
  display: "inline-block",
  verticalAlign: "middle",
  flexShrink: 0,
});

export const GlyphObserved: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="currentColor" {...rest}>
    <circle cx="10" cy="10" r="5" />
  </svg>
);

export const GlyphDerived: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <polygon points="10,3 17,10 10,17 3,10" />
  </svg>
);

export const GlyphInferred: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <circle cx="10" cy="10" r="6" />
    <path d="M10,4 A6,6 0 0,1 10,16 Z" fill="currentColor" />
  </svg>
);

export const GlyphDeclared: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <rect x="4" y="5" width="12" height="10" />
  </svg>
);

export const GlyphAdvice: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <polygon points="6,4 16,10 6,16" />
  </svg>
);

export const GlyphLinkConfirmed: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <rect x="2" y="6" width="7" height="8" rx="1" />
    <rect x="11" y="6" width="7" height="8" rx="1" />
    <line x1="9" y1="10" x2="11" y2="10" />
  </svg>
);

export const GlyphLinkProvisional: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <rect x="2" y="6" width="7" height="8" rx="1" strokeDasharray="3 2" />
    <rect x="11" y="6" width="7" height="8" rx="1" strokeDasharray="3 2" />
    <line x1="9" y1="10" x2="11" y2="10" strokeDasharray="1 1" />
  </svg>
);

export const GlyphLinkUnresolved: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <rect x="2" y="6" width="6" height="8" rx="1" />
    <rect x="12" y="6" width="6" height="8" rx="1" />
  </svg>
);

export const GlyphReplay: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <rect x="2" y="5" width="16" height="10" />
    <circle cx="6.5" cy="10" r="2" />
    <circle cx="13.5" cy="10" r="2" />
  </svg>
);

export const GlyphInjected: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <rect x="3" y="3" width="14" height="14" />
    <line x1="3" y1="9" x2="9" y2="3" />
    <line x1="5" y1="17" x2="17" y2="5" />
    <line x1="11" y1="17" x2="17" y2="11" />
  </svg>
);

export const GlyphEvidence: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <path d="M4,3 L12,3 L16,7 L16,17 L4,17 Z" />
    <polyline points="12,3 12,7 16,7" />
  </svg>
);

export const GlyphHash: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <line x1="7" y1="3" x2="5" y2="17" />
    <line x1="15" y1="3" x2="13" y2="17" />
    <line x1="3" y1="7" x2="17" y2="7" />
    <line x1="3" y1="13" x2="17" y2="13" />
  </svg>
);

export const GlyphStop: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <rect x="3" y="3" width="14" height="14" />
    <line x1="4" y1="16" x2="16" y2="4" />
  </svg>
);

export const GlyphPerson: React.FC<GlyphProps> = ({ size = 20, className, ...rest }) => (
  <svg viewBox="0 0 20 20" style={baseStyle(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...rest}>
    <circle cx="10" cy="7" r="3.5" />
    <path d="M4,17 C4,13.5 6.7,12.5 10,12.5 C13.3,12.5 16,13.5 16,17" />
  </svg>
);

export const Glyph: React.FC<{ name: GlyphName; size?: GlyphSize; className?: string }> = ({
  name,
  size = 20,
  className,
}) => {
  switch (name) {
    case "observed":
      return <GlyphObserved size={size} className={className} />;
    case "derived":
      return <GlyphDerived size={size} className={className} />;
    case "inferred":
      return <GlyphInferred size={size} className={className} />;
    case "declared":
      return <GlyphDeclared size={size} className={className} />;
    case "advice":
      return <GlyphAdvice size={size} className={className} />;
    case "link-confirmed":
      return <GlyphLinkConfirmed size={size} className={className} />;
    case "link-provisional":
      return <GlyphLinkProvisional size={size} className={className} />;
    case "link-unresolved":
      return <GlyphLinkUnresolved size={size} className={className} />;
    case "replay":
      return <GlyphReplay size={size} className={className} />;
    case "injected":
      return <GlyphInjected size={size} className={className} />;
    case "evidence":
      return <GlyphEvidence size={size} className={className} />;
    case "hash":
      return <GlyphHash size={size} className={className} />;
    case "stop":
      return <GlyphStop size={size} className={className} />;
    case "person":
      return <GlyphPerson size={size} className={className} />;
  }
};
