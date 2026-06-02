const TOOLS_API_URL = process.env.EXPO_PUBLIC_TOOLS_API_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${TOOLS_API_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface YouthInput {
  id: string;
  raw_text: string;
  location: string;
  language: string;
  ai_categories: string[];
  ai_sentiment: string | null;
  ai_summary: string | null;
  processed: boolean;
  created_at: string;
}

export interface WelfareFund {
  id: string;
  fund_name: string;
  total_allocated: number;
  disbursed_amount: number;
  beneficiary_ylo: string | null;
  status: 'Disbursed' | 'Pending' | 'Audited';
  accountability_score: number;
  created_at: string;
}

export interface Analytics {
  total_inputs: number;
  sector_distribution: { sector: string; count: number }[];
  sentiment_distribution: { sentiment: string; count: number }[];
  total_funds: number;
  total_allocated_kes: number;
  total_disbursed_kes: number;
  disbursement_rate: number;
  fund_distribution: { name: string; allocated: number; disbursed: number; status: string }[];
}

export const toolsApi = {
  submitInput: (data: { raw_text: string; location: string; language: string }) =>
    request<YouthInput>('/api/v1/inputs', { method: 'POST', body: JSON.stringify(data) }),

  getInputs: () => request<YouthInput[]>('/api/v1/inputs'),

  getFunds: () => request<WelfareFund[]>('/api/v1/funds'),

  reportFund: (data: { fund_id: string; reporter_name?: string; description: string; severity: string }) =>
    request('/api/v1/funds/report', { method: 'POST', body: JSON.stringify(data) }),

  getAnalytics: () => request<Analytics>('/api/v1/advocacy/analytics'),

  generateBrief: () =>
    request<{ brief: string; generated_at: string }>('/api/v1/advocacy/generate-brief', { method: 'POST' }),
};
