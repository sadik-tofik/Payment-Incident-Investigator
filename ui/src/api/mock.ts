// ui/src/api/mock.ts
// Serves saved fixtures from docs/ui-fixtures for development and offline testing

import casesFixture from "@fixtures/cases.json";
import healthFixture from "@fixtures/health.json";
import confirmedOk from "@fixtures/investigation-confirmed-ok.json";
import provisionalApproved from "@fixtures/investigation-provisional-approved-not-captured.json";
import unresolvedNeedsId from "@fixtures/investigation-unresolved-needs-paypal-id.json";
import abstainLinkUnresolved from "@fixtures/investigation-abstain-link-unresolved.json";
import injectedCapturedUnpaid from "@fixtures/investigation-injected-captured-local-unpaid.json";
import injectedAmountMismatch from "@fixtures/investigation-injected-amount-mismatch.json";
import injectedMultipleCaptures from "@fixtures/investigation-injected-multiple-captures.json";

import err400InvalidId from "@fixtures/error-400-invalid-order-id.json";
import err400CaseCombined from "@fixtures/error-400-case-combined-with-order-id.json";
import err403LiveNotEnabled from "@fixtures/error-403-live-not-enabled.json";
import err404PaypalNotFound from "@fixtures/error-404-paypal-order-not-found.json";
import err404StoreNotFound from "@fixtures/error-404-store-order-not-found.json";
import err502UpstreamUnreachable from "@fixtures/error-502-upstream-unreachable.json";
import err502AuthRejected from "@fixtures/error-502-upstream-auth-rejected.json";
import err504Deadline from "@fixtures/error-504-deadline-exceeded.json";

import type {
  HealthResponse,
  CasesResponse,
  InvestigationResult,
  InvestigationError,
  AuditVerifyResponse,
  EvidenceItem,
} from "./types";

export interface MockFixtureEntry {
  httpStatus: number;
  body: any;
}

export const FIXTURES: Record<string, MockFixtureEntry> = {
  health: healthFixture as unknown as MockFixtureEntry,
  cases: casesFixture as unknown as MockFixtureEntry,
  "investigation-confirmed-ok": confirmedOk as unknown as MockFixtureEntry,
  "investigation-provisional-approved-not-captured": provisionalApproved as unknown as MockFixtureEntry,
  "investigation-unresolved-needs-paypal-id": unresolvedNeedsId as unknown as MockFixtureEntry,
  "investigation-abstain-link-unresolved": abstainLinkUnresolved as unknown as MockFixtureEntry,
  "investigation-injected-captured-local-unpaid": injectedCapturedUnpaid as unknown as MockFixtureEntry,
  "investigation-injected-amount-mismatch": injectedAmountMismatch as unknown as MockFixtureEntry,
  "investigation-injected-multiple-captures": injectedMultipleCaptures as unknown as MockFixtureEntry,
  "error-400-invalid-order-id": err400InvalidId as unknown as MockFixtureEntry,
  "error-400-case-combined-with-order-id": err400CaseCombined as unknown as MockFixtureEntry,
  "error-403-live-not-enabled": err403LiveNotEnabled as unknown as MockFixtureEntry,
  "error-404-paypal-order-not-found": err404PaypalNotFound as unknown as MockFixtureEntry,
  "error-404-store-order-not-found": err404StoreNotFound as unknown as MockFixtureEntry,
  "error-502-upstream-unreachable": err502UpstreamUnreachable as unknown as MockFixtureEntry,
  "error-502-upstream-auth-rejected": err502AuthRejected as unknown as MockFixtureEntry,
  "error-504-deadline-exceeded": err504Deadline as unknown as MockFixtureEntry,
};

export function getMockHealth(): Promise<HealthResponse> {
  return Promise.resolve(healthFixture.body as unknown as HealthResponse);
}

export function getMockCases(): Promise<CasesResponse> {
  return Promise.resolve(casesFixture.body as unknown as CasesResponse);
}

export function getMockInvestigation(caseIdOrFixtureKey: string): Promise<InvestigationResult> {
  const map: Record<string, string> = {
    "replay-order-13": "investigation-confirmed-ok",
    "replay-order-17": "investigation-confirmed-ok",
    "replay-order-20": "investigation-provisional-approved-not-captured",
    "injected-captured-local-unpaid": "investigation-injected-captured-local-unpaid",
    "injected-amount-mismatch": "investigation-injected-amount-mismatch",
    "injected-multiple-captures": "investigation-injected-multiple-captures",
  };

  const key = map[caseIdOrFixtureKey] ?? caseIdOrFixtureKey;
  const entry = FIXTURES[key] ?? FIXTURES["investigation-confirmed-ok"];

  if (entry.httpStatus >= 400) {
    return Promise.reject(entry.body as InvestigationError);
  }
  return Promise.resolve(entry.body as InvestigationResult);
}

export function getMockEvidence(result: InvestigationResult, evidenceId: string): Promise<EvidenceItem> {
  const item = result.evidence.find((e) => e.id === evidenceId);
  if (!item) {
    return Promise.reject({
      error: { code: "evidence_not_found", message: "Evidence item not found" },
    } as InvestigationError);
  }
  return Promise.resolve(item);
}

export function getMockAuditVerify(): Promise<AuditVerifyResponse> {
  return Promise.resolve({ ok: true, entries: 6, firstBadIndex: null });
}
