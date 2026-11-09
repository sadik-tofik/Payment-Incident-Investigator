// ui/src/api/types.ts
// Direct TypeScript representations of docs/05a-API-CONTRACT.md LOCKED and docs/ui-fixtures

export type InvestigationMode = "replay" | "injected" | "live";
export type IdentityState = "confirmed" | "provisional_association" | "unresolved";
export type DecisionStatus = "rule_matched" | "abstain";

export interface HealthResponse {
  ok: boolean;
  build: string;
  modesAvailable: InvestigationMode[];
}

export interface CaseEntry {
  id: string;
  title: string;
  mode: "replay" | "injected";
}

export type CasesResponse = CaseEntry[];

export interface Capture {
  id: string;
  status: string;
  amount?: string;
  currency?: string;
  createTime?: string;
}

export interface PayPalSystemFacts {
  status: string;
  normalizedStatus?: string;
  amount: string;
  currency: string;
  retrievedAt: string | null;
  eventTime: string | null;
  timeKind: "observed";
  captures: Capture[];
  paypalOrderId?: string;
}

export interface StoreSystemFacts {
  localOrderId: string;
  status: string;
  normalizedStatus: string;
  amount: string;
  currency: string;
  retrievedAt: string | null;
  eventTime: string | null;
  timeKind: "observed";
  holdsPayPalOrderId: boolean;
  pluginVersion?: string;
  pluginVersionSource?: string;
}

export interface Identity {
  state: IdentityState;
  basis: string;
  reason: string | null;
  requiredNotice: string | null;
}

export interface Needs {
  paypalOrderId?: boolean;
}

export interface Decision {
  decisionStatus: DecisionStatus;
  verdict: string;
  ruleRow: number;
  reason: string;
  finding: string | null;
  divergencePoint?: Record<string, unknown> | null;
  stateFingerprint: string;
}

export interface EvidenceItem {
  id: string;
  source: "paypal" | "store" | "engine";
  field: string;
  value: unknown;
  observedAt: string | null;
  eventTime?: string | null;
  rawHash: string | null;
}

export interface SafeAction {
  id: string;
  label: string;
  rule: string;
  humanActionOnly: true;
}

export interface ForbiddenAction {
  id: string;
  reason: string;
  rule: string;
}

export interface Actions {
  safe: SafeAction[];
  forbidden: ForbiddenAction[];
}

export interface Integrity {
  hashSpec: string;
  paypal?: string;
  store?: string;
  establishesAuthenticity: boolean;
  note: string;
}

export interface ExplanationStatement {
  text: string;
  evidenceIds: string[];
}

export interface Explanation {
  kind: "template" | "ai_validated";
  text: string;
  statements: ExplanationStatement[];
  citedEvidence?: string[];
  aiStatus?: "not_configured" | "accepted" | "rejected" | "timeout" | "error";
  aiRejected?: boolean;
}

export interface InvestigationSource {
  mode: InvestigationMode;
  label: string;
}

export interface InvestigationResult {
  id: string;
  createdAt: string;
  source: InvestigationSource;
  input: {
    paypalOrderId: string | null;
    localOrderId: string | null;
  };
  identity: Identity;
  needs?: Needs;
  systems: {
    paypal: PayPalSystemFacts | null;
    store: StoreSystemFacts | null;
  };
  decision: Decision;
  evidence: EvidenceItem[];
  actions: Actions;
  explanation: Explanation;
  integrity: Integrity;
  limits: string[];
  auditId: string | null;
}

export interface InvestigationRequest {
  mode: InvestigationMode;
  caseId?: string;
  paypalOrderId?: string;
  localOrderId?: string;
}

export interface InvestigationError {
  error: {
    code: string;
    message: string;
  };
  partial?: {
    system?: "paypal" | "store";
    reason?: string;
    retrievedAt?: string;
  } | null;
  auditId?: string | null;
}

export interface AuditVerifyResponse {
  ok: boolean;
  entries: number;
  firstBadIndex: number | null;
}
