// ui/src/components/SkeletonInvestigation.tsx
import React from "react";

export const SkeletonInvestigation: React.FC = () => {
  return (
    <div
      className="skeleton-investigation-layout"
      aria-busy="true"
      aria-label="Loading investigation result"
    >
      <span className="sr-only">Loading investigation result...</span>

      {/* Main column */}
      <div className="skeleton-main-col" aria-hidden="true">
        {/* Verdict block */}
        <div className="skeleton-box skeleton-verdict">
          <div className="skeleton-bar h-28 w-40" />
          <div className="skeleton-bar h-16 w-80" />
        </div>

        {/* Systems grid: two panels with 4 labelled rows each */}
        <div className="skeleton-systems-grid">
          <div className="skeleton-box skeleton-panel">
            <div className="skeleton-bar h-20 w-32" />
            <div className="skeleton-bar h-16 w-full" />
            <div className="skeleton-bar h-16 w-full" />
            <div className="skeleton-bar h-16 w-full" />
            <div className="skeleton-bar h-16 w-3/4" />
          </div>

          <div className="skeleton-box skeleton-panel">
            <div className="skeleton-bar h-20 w-32" />
            <div className="skeleton-bar h-16 w-full" />
            <div className="skeleton-bar h-16 w-full" />
            <div className="skeleton-bar h-16 w-full" />
            <div className="skeleton-bar h-16 w-3/4" />
          </div>
        </div>

        {/* Explanation block of 3 lines */}
        <div className="skeleton-box skeleton-explanation">
          <div className="skeleton-bar h-20 w-28" />
          <div className="skeleton-bar h-18 w-full" />
          <div className="skeleton-bar h-18 w-full" />
          <div className="skeleton-bar h-18 w-4/5" />
        </div>

        {/* 5 evidence rows */}
        <div className="skeleton-box skeleton-evidence-list">
          <div className="skeleton-bar h-20 w-32" />
          <div className="skeleton-bar h-14 w-full" />
          <div className="skeleton-bar h-14 w-full" />
          <div className="skeleton-bar h-14 w-full" />
          <div className="skeleton-bar h-14 w-full" />
          <div className="skeleton-bar h-14 w-full" />
        </div>
      </div>

      {/* Side column */}
      <div className="skeleton-side-col" aria-hidden="true">
        <div className="skeleton-box skeleton-identity">
          <div className="skeleton-bar h-20 w-32" />
          <div className="skeleton-bar h-16 w-full" />
          <div className="skeleton-bar h-16 w-2/3" />
        </div>
        <div className="skeleton-box skeleton-actions">
          <div className="skeleton-bar h-20 w-40" />
          <div className="skeleton-bar h-14 w-full" />
          <div className="skeleton-bar h-14 w-full" />
        </div>
      </div>
    </div>
  );
};
