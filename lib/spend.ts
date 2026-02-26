import { CostEntry, OpenRouterCostEntry, NanoBananaCostEntry, SessionSpend, NANO_BANANA_RATES } from '@/types/spend';

const STORAGE_KEY = 'spend-tracking-data';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  // Check for env-defined session ID
  const envSessionId = process.env.NEXT_PUBLIC_SESSION_ID;
  if (envSessionId) return envSessionId;
  
  // Use stored session or create new one
  let sessionId = sessionStorage.getItem('current-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('current-session-id', sessionId);
  }
  return sessionId;
}

export function getStoredSpendData(): Record<string, SessionSpend> {
  if (typeof window === 'undefined') return {};
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Error reading spend data:', e);
    return {};
  }
}

export function saveSpendData(data: Record<string, SessionSpend>): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving spend data:', e);
  }
}

export function logOpenRouterCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  costUsd: number
): OpenRouterCostEntry {
  const entry: OpenRouterCostEntry = {
    id: generateId(),
    timestamp: Date.now(),
    sessionId: getSessionId(),
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd,
    type: 'openrouter',
  };

  const allData = getStoredSpendData();
  const sessionId = getSessionId();
  
  if (!allData[sessionId]) {
    allData[sessionId] = {
      sessionId,
      totalSpend: 0,
      llmSpend: 0,
      imageSpend: 0,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  allData[sessionId].entries.push(entry);
  allData[sessionId].llmSpend += costUsd;
  allData[sessionId].totalSpend += costUsd;
  allData[sessionId].updatedAt = Date.now();

  saveSpendData(allData);
  
  // Dispatch event for real-time UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spend-updated', { detail: allData[sessionId] }));
  }

  return entry;
}

export function logNanoBananaCost(resolution: '1K' | '2K' | '4K'): NanoBananaCostEntry {
  const costUsd = NANO_BANANA_RATES[resolution];
  
  const entry: NanoBananaCostEntry = {
    id: generateId(),
    timestamp: Date.now(),
    sessionId: getSessionId(),
    resolution,
    costUsd,
    type: 'nano-banana',
  };

  const allData = getStoredSpendData();
  const sessionId = getSessionId();
  
  if (!allData[sessionId]) {
    allData[sessionId] = {
      sessionId,
      totalSpend: 0,
      llmSpend: 0,
      imageSpend: 0,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  allData[sessionId].entries.push(entry);
  allData[sessionId].imageSpend += costUsd;
  allData[sessionId].totalSpend += costUsd;
  allData[sessionId].updatedAt = Date.now();

  saveSpendData(allData);
  
  // Dispatch event for real-time UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spend-updated', { detail: allData[sessionId] }));
  }

  return entry;
}

export function getCurrentSessionSpend(): SessionSpend | null {
  const allData = getStoredSpendData();
  const sessionId = getSessionId();
  return allData[sessionId] || null;
}

export function getAllSessionsSpend(): SessionSpend[] {
  const allData = getStoredSpendData();
  return Object.values(allData).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function clearSessionSpend(): void {
  const allData = getStoredSpendData();
  const sessionId = getSessionId();
  delete allData[sessionId];
  saveSpendData(allData);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spend-updated', { detail: null }));
  }
}

export function clearAllSpendData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spend-updated', { detail: null }));
  }
}