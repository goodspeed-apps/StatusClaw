import { CostEntry, OpenRouterCostEntry, NanoBananaCostEntry, SessionSpend, AggregatedSpendData, DailySpendData, TimePeriod, NANO_BANANA_RATES } from '@/types/spend';

const STORAGE_KEY = 'spend-tracking-data';
const HISTORICAL_KEY = 'spend-tracking-history';

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

export function getHistoricalSpendData(): CostEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(HISTORICAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading historical spend data:', e);
    return [];
  }
}

export function saveHistoricalSpendData(entries: CostEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(HISTORICAL_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Error saving historical spend data:', e);
  }
}

export function getTodaysDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function logOpenRouterCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  costUsd: number
): OpenRouterCostEntry {
  const today = getTodaysDate();
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
    date: today,
  };

  // Save to session-based storage (backward compatibility)
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
  
  // Also save to historical storage
  const historicalData = getHistoricalSpendData();
  historicalData.push(entry);
  saveHistoricalSpendData(historicalData);
  
  // Dispatch event for real-time UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spend-updated', { detail: allData[sessionId] }));
  }

  return entry;
}

export function logNanoBananaCost(resolution: '1K' | '2K' | '4K'): NanoBananaCostEntry {
  const costUsd = NANO_BANANA_RATES[resolution];
  const today = getTodaysDate();
  
  const entry: NanoBananaCostEntry = {
    id: generateId(),
    timestamp: Date.now(),
    sessionId: getSessionId(),
    resolution,
    costUsd,
    type: 'nano-banana',
    date: today,
  };

  // Save to session-based storage (backward compatibility)
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
  
  // Also save to historical storage
  const historicalData = getHistoricalSpendData();
  historicalData.push(entry);
  saveHistoricalSpendData(historicalData);
  
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
  localStorage.removeItem(HISTORICAL_KEY);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spend-updated', { detail: null }));
  }
}

// Time-based filtering functions
export function getStartDateForPeriod(period: TimePeriod): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return today;
    case '7d':
      return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'all':
      return new Date(0); // Beginning of time
    default:
      return today;
  }
}

export function filterEntriesByPeriod(entries: CostEntry[], period: TimePeriod): CostEntry[] {
  const startDate = getStartDateForPeriod(period);
  return entries.filter(entry => entry.timestamp >= startDate.getTime());
}

export function getAggregatedSpendData(period: TimePeriod): AggregatedSpendData {
  const allEntries = getHistoricalSpendData();
  const filteredEntries = filterEntriesByPeriod(allEntries, period);
  
  // Initialize result
  const result: AggregatedSpendData = {
    totalSpend: 0,
    llmSpend: 0,
    imageSpend: 0,
    totalRequests: filteredEntries.length,
    llmRequests: 0,
    imageRequests: 0,
    dailyData: [],
    byModel: {},
    byType: {},
  };
  
  // Group entries by date
  const entriesByDate = new Map<string, CostEntry[]>();
  
  filteredEntries.forEach(entry => {
    const date = entry.date || new Date(entry.timestamp).toISOString().split('T')[0];
    
    if (!entriesByDate.has(date)) {
      entriesByDate.set(date, []);
    }
    entriesByDate.get(date)!.push(entry);
    
    // Update totals
    result.totalSpend += entry.costUsd;
    
    if (entry.type === 'openrouter') {
      result.llmSpend += entry.costUsd;
      result.llmRequests += 1;
      
      // Track by model
      const model = entry.model;
      if (!result.byModel[model]) {
        result.byModel[model] = { cost: 0, requests: 0 };
      }
      result.byModel[model].cost += entry.costUsd;
      result.byModel[model].requests += 1;
    } else {
      result.imageSpend += entry.costUsd;
      result.imageRequests += 1;
    }
    
    // Track by type
    const typeName = entry.type === 'openrouter' ? 'LLM' : 'Image';
    if (!result.byType[typeName]) {
      result.byType[typeName] = { cost: 0, requests: 0 };
    }
    result.byType[typeName].cost += entry.costUsd;
    result.byType[typeName].requests += 1;
  });
  
  // Create daily data array sorted by date
  const sortedDates = Array.from(entriesByDate.keys()).sort();
  result.dailyData = sortedDates.map(date => {
    const dayEntries = entriesByDate.get(date)!;
    return {
      date,
      totalSpend: dayEntries.reduce((sum, e) => sum + e.costUsd, 0),
      llmSpend: dayEntries.filter(e => e.type === 'openrouter').reduce((sum, e) => sum + e.costUsd, 0),
      imageSpend: dayEntries.filter(e => e.type === 'nano-banana').reduce((sum, e) => sum + e.costUsd, 0),
      entries: dayEntries,
    };
  });
  
  return result;
}

// Get spend data for a specific date range
export function getSpendDataByDateRange(startDate: Date, endDate: Date): AggregatedSpendData {
  const allEntries = getHistoricalSpendData();
  const filteredEntries = allEntries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= startDate && entryDate <= endDate;
  });
  
  return calculateAggregatedData(filteredEntries);
}

function calculateAggregatedData(entries: CostEntry[]): AggregatedSpendData {
  const result: AggregatedSpendData = {
    totalSpend: 0,
    llmSpend: 0,
    imageSpend: 0,
    totalRequests: entries.length,
    llmRequests: 0,
    imageRequests: 0,
    dailyData: [],
    byModel: {},
    byType: {},
  };
  
  const entriesByDate = new Map<string, CostEntry[]>();
  
  entries.forEach(entry => {
    const date = entry.date || new Date(entry.timestamp).toISOString().split('T')[0];
    
    if (!entriesByDate.has(date)) {
      entriesByDate.set(date, []);
    }
    entriesByDate.get(date)!.push(entry);
    
    result.totalSpend += entry.costUsd;
    
    if (entry.type === 'openrouter') {
      result.llmSpend += entry.costUsd;
      result.llmRequests += 1;
      
      if (!result.byModel[entry.model]) {
        result.byModel[entry.model] = { cost: 0, requests: 0 };
      }
      result.byModel[entry.model].cost += entry.costUsd;
      result.byModel[entry.model].requests += 1;
    } else {
      result.imageSpend += entry.costUsd;
      result.imageRequests += 1;
    }
    
    const typeName = entry.type === 'openrouter' ? 'LLM' : 'Image';
    if (!result.byType[typeName]) {
      result.byType[typeName] = { cost: 0, requests: 0 };
    }
    result.byType[typeName].cost += entry.costUsd;
    result.byType[typeName].requests += 1;
  });
  
  const sortedDates = Array.from(entriesByDate.keys()).sort();
  result.dailyData = sortedDates.map(date => {
    const dayEntries = entriesByDate.get(date)!;
    return {
      date,
      totalSpend: dayEntries.reduce((sum, e) => sum + e.costUsd, 0),
      llmSpend: dayEntries.filter(e => e.type === 'openrouter').reduce((sum, e) => sum + e.costUsd, 0),
      imageSpend: dayEntries.filter(e => e.type === 'nano-banana').reduce((sum, e) => sum + e.costUsd, 0),
      entries: dayEntries,
    };
  });
  
  return result;
}
