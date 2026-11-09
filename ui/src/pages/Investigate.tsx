// ui/src/pages/Investigate.tsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { OrderIdForm } from "../components/OrderIdForm";
import { CaseRow } from "../components/CaseRow";
import { InvestigationView } from "../components/InvestigationView";
import { ErrorPanel } from "../components/ErrorPanel";
import { SkeletonInvestigation } from "../components/SkeletonInvestigation";
import { INVESTIGATE_COPY } from "../copy";
import {
  runInvestigation,
  getInvestigationById,
  getCases,
  getHealth,
} from "../api/client";
import type {
  InvestigationResult,
  InvestigationError,
  CaseEntry,
} from "../api/types";

export const Investigate: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeInvestigationId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const caseParam = searchParams.get("case");
  const paypalParam = searchParams.get("paypal");

  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<InvestigationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cases, setCases] = useState<CaseEntry[]>([]);
  const [isLiveAvailable, setIsLiveAvailable] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load health and cases
  useEffect(() => {
    getHealth()
      .then((h) => {
        setIsLiveAvailable(h.modesAvailable?.includes("live") || false);
      })
      .catch(() => {});

    getCases()
      .then((c) => {
        setCases(c);
      })
      .catch(() => {});
  }, []);

  // Set document title
  useEffect(() => {
    if (result) {
      const headline =
        INVESTIGATE_COPY.verdictHeadlines[result.decision.verdict] ||
        result.decision.verdict;
      if (result.source.mode === "injected") {
        document.title = `Injected: ${headline} · Incident Investigator`;
      } else {
        document.title = `${headline} · Incident Investigator`;
      }
    } else {
      document.title = "Investigate · Incident Investigator";
    }
  }, [result]);

  // Handle URL params
  useEffect(() => {
    if (routeInvestigationId) {
      loadStoredInvestigation(routeInvestigationId);
    } else if (caseParam) {
      executeInvestigation({ mode: caseParam.startsWith("injected") ? "injected" : "replay", caseId: caseParam });
    }
  }, [routeInvestigationId, caseParam]);

  function startTimer() {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function loadStoredInvestigation(id: string) {
    setIsLoading(true);
    setError(null);
    startTimer();

    try {
      const inv = await getInvestigationById(id);
      setResult(inv);
    } catch (err) {
      setError(err as InvestigationError);
    } finally {
      setIsLoading(false);
      stopTimer();
    }
  }

  async function executeInvestigation(req: {
    mode: "replay" | "injected" | "live";
    caseId?: string;
    paypalOrderId?: string;
    localOrderId?: string;
  }) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    startTimer();

    abortControllerRef.current = new AbortController();

    try {
      const res = await runInvestigation(req);
      setResult(res);
    } catch (err) {
      setError(err as InvestigationError);
    } finally {
      setIsLoading(false);
      stopTimer();
    }
  }

  function handleCancelLoading() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopTimer();
    setIsLoading(false);
    setError({
      error: {
        code: "deadline_exceeded",
        message: "Request abandoned in browser by user",
      },
      auditId: null,
    });
  }

  function handleFormSubmit(paypalOrderId: string) {
    executeInvestigation({
      mode: "replay",
      paypalOrderId,
    });
  }

  function handleSelectCase(caseId: string) {
    setSearchParams({ case: caseId });
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setSearchParams({});
    navigate("/investigate");
  }

  const c = INVESTIGATE_COPY.startScreen;
  const loadCopy = INVESTIGATE_COPY.loading;

  return (
    <div className="investigate-page">
      {/* Loading overlay view */}
      {isLoading && (
        <div className="investigate-loading-view" aria-live="polite">
          <div className="container loading-header-bar">
            <div className="loading-status-group">
              <span className="caption uppercase">{loadCopy.statusText}</span>
              {elapsedSeconds >= 3 && (
                <span className="elapsed-counter mono caption">
                  {elapsedSeconds} s of 30 s allowed
                </span>
              )}
            </div>
            <div className="loading-cancel-group">
              <button
                type="button"
                className="text-btn cancel-btn"
                onClick={handleCancelLoading}
              >
                {loadCopy.cancelButton}
              </button>
              <span className="cancel-helper muted caption">
                {loadCopy.cancelHelper}
              </span>
            </div>
          </div>
          <div className="container">
            <SkeletonInvestigation />
          </div>
        </div>
      )}

      {/* Error state view */}
      {!isLoading && error && (
        <div className="container investigate-error-view">
          <ErrorPanel
            error={error}
            onRetry={() => {
              if (caseParam) {
                executeInvestigation({
                  mode: caseParam.startsWith("injected") ? "injected" : "replay",
                  caseId: caseParam,
                });
              } else if (paypalParam) {
                handleFormSubmit(paypalParam);
              } else {
                handleReset();
              }
            }}
            onBack={handleReset}
          />
        </div>
      )}

      {/* Completed Investigation Result */}
      {!isLoading && !error && result && (
        <InvestigationView
          investigation={result}
          onNewInvestigation={handleReset}
          onEnterPaypalId={() => {
            handleReset();
          }}
        />
      )}

      {/* Start screen: Form + Help + Cases list */}
      {!isLoading && !error && !result && (
        <div className="container start-screen-container">
          <div className="start-screen-grid">
            {/* Left column (cols 1 to 7) */}
            <div className="start-screen-left">
              <h1 className="start-h1">{c.h1}</h1>
              <p className="start-lead">{c.lead}</p>

              <div className="start-form-wrap">
                <OrderIdForm
                  initialValue={paypalParam || ""}
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                  showOfflineNote={!isLiveAvailable}
                />
              </div>

              <div className="start-help-panel" role="region" aria-labelledby="help-title">
                <h2 id="help-title" className="help-title">
                  {c.helpTitle}
                </h2>
                <p className="help-body muted">{c.helpBody}</p>
              </div>
            </div>

            {/* Right column (cols 8 to 12) */}
            <aside className="start-screen-right" aria-labelledby="cases-title">
              <h2 id="cases-title" className="cases-title">
                {c.casesTitle}
              </h2>
              <p className="cases-intro muted">{c.casesIntro}</p>

              <div className="cases-mini-list">
                {cases.map((cs) => (
                  <CaseRow
                    key={cs.id}
                    caseEntry={cs}
                    onSelect={handleSelectCase}
                  />
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
};
