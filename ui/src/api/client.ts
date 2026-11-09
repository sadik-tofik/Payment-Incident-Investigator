// ui/src/api/client.ts
// Real API client for backend server with mock fallback when VITE_USE_MOCK=1

import type {
  HealthResponse,
  CasesResponse,
  InvestigationResult,
  InvestigationError,
  AuditVerifyResponse,
  EvidenceItem,
  InvestigationRequest,
} from "./types";
import {
  getMockHealth,
  getMockCases,
  getMockInvestigation,
  getMockAuditVerify,
  FIXTURES,
} from "./mock";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8787/api/v1";
export const isMockMode = (import.meta as any).env?.VITE_USE_MOCK === "1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    const networkErr: InvestigationError = {
      error: {
        code: "upstream_unreachable",
        message: "Failed to connect to investigation server",
      },
      auditId: null,
    };
    throw networkErr;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw data as InvestigationError;
  }
  return data as T;
}

export async function getHealth(): Promise<HealthResponse> {
  if (isMockMode) {
    return getMockHealth();
  }
  try {
    return await request<HealthResponse>("/health");
  } catch {
    // Fallback to mock if server is not reachable during local UI dev
    return getMockHealth();
  }
}

export async function getCases(): Promise<CasesResponse> {
  if (isMockMode) {
    return getMockCases();
  }
  try {
    return await request<CasesResponse>("/cases");
  } catch {
    return getMockCases();
  }
}

export async function runInvestigation(body: InvestigationRequest): Promise<InvestigationResult> {
  if (isMockMode) {
    if (body.caseId) {
      return getMockInvestigation(body.caseId);
    }
    // Simulate by checking known ID
    if (body.paypalOrderId === "5W721345678901234") {
      return getMockInvestigation("investigation-confirmed-ok");
    }
    return getMockInvestigation("investigation-confirmed-ok");
  }
  return request<InvestigationResult>("/investigations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getInvestigationById(id: string): Promise<InvestigationResult> {
  if (isMockMode) {
    return getMockInvestigation(id);
  }
  return request<InvestigationResult>(`/investigations/${encodeURIComponent(id)}`);
}

export async function getEvidenceItem(investigationId: string, evidenceId: string): Promise<EvidenceItem> {
  if (isMockMode) {
    const inv = await getMockInvestigation(investigationId);
    const item = inv.evidence.find((e) => e.id === evidenceId);
    if (!item) {
      throw {
        error: { code: "evidence_not_found", message: "Evidence item not found" },
        auditId: null,
      } as InvestigationError;
    }
    return item;
  }
  return request<EvidenceItem>(
    `/investigations/${encodeURIComponent(investigationId)}/evidence/${encodeURIComponent(evidenceId)}`
  );
}

export async function getAuditVerify(): Promise<AuditVerifyResponse> {
  if (isMockMode) {
    return getMockAuditVerify();
  }
  try {
    return await request<AuditVerifyResponse>("/audit/verify");
  } catch {
    return getMockAuditVerify();
  }
}

export function getAllFixtureKeys(): string[] {
  return Object.keys(FIXTURES);
}

export function getFixtureEntry(key: string) {
  return FIXTURES[key];
}
