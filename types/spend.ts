export interface OpenRouterUsage {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
}

export interface OpenRouterCostEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  type: 'openrouter';
}

export interface NanoBananaCostEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  resolution: '1K' | '2K' | '4K';
  costUsd: number;
  type: 'nano-banana';
}

export type CostEntry = OpenRouterCostEntry | NanoBananaCostEntry;

export interface SessionSpend {
  sessionId: string;
  totalSpend: number;
  llmSpend: number;
  imageSpend: number;
  entries: CostEntry[];
  createdAt: number;
  updatedAt: number;
}

export const NANO_BANANA_RATES = {
  '1K': 0.14,
  '2K': 0.14,
  '4K': 0.24,
} as const;