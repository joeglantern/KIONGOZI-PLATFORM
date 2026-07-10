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

export interface Analytics {
  total_inputs: number;
  sector_distribution: { sector: string; count: number }[];
  sentiment_distribution: { sentiment: string; count: number }[];
}

export const toolsApi = {
  submitInput: (data: { raw_text: string; location: string; language: string }) =>
    request<YouthInput>('/api/v1/inputs', { method: 'POST', body: JSON.stringify(data) }),

  getInputs: () => request<YouthInput[]>('/api/v1/inputs'),

  getAnalytics: () => request<Analytics>('/api/v1/advocacy/analytics'),

  generateBrief: () =>
    request<{ brief: string; generated_at: string }>('/api/v1/advocacy/generate-brief', { method: 'POST' }),
};
