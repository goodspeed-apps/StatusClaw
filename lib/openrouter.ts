import { logOpenRouterCost } from './spend';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterUsageHeader {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost: number;
}

function parseUsageHeader(headerValue: string | null): OpenRouterUsageHeader | null {
  if (!headerValue) return null;
  
  try {
    // The X-GenAi-Usage header contains structured data
    // Format varies, but typically contains token counts and cost
    const parsed = JSON.parse(headerValue);
    return {
      prompt_tokens: parsed.prompt_tokens || 0,
      completion_tokens: parsed.completion_tokens || 0,
      total_tokens: parsed.total_tokens || 0,
      total_cost: parsed.total_cost || 0,
    };
  } catch (e) {
    // Try parsing as a string format
    if (headerValue.includes('cost=') || headerValue.includes('tokens=')) {
      const costMatch = headerValue.match(/cost[=:]([\d.]+)/);
      const promptMatch = headerValue.match(/prompt_tokens[=:](\d+)/);
      const completionMatch = headerValue.match(/completion_tokens[=:](\d+)/);
      const totalMatch = headerValue.match(/total_tokens[=:](\d+)/);
      
      return {
        prompt_tokens: promptMatch ? parseInt(promptMatch[1]) : 0,
        completion_tokens: completionMatch ? parseInt(completionMatch[1]) : 0,
        total_tokens: totalMatch ? parseInt(totalMatch[1]) : 0,
        total_cost: costMatch ? parseFloat(costMatch[1]) : 0,
      };
    }
    return null;
  }
}

export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  model: string = 'openai/gpt-3.5-turbo'
): Promise<{ response: OpenRouterResponse; cost: number }> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Set NEXT_PUBLIC_OPENROUTER_API_KEY in .env.local');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      'X-Title': 'Spend Tracking App',
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${error}`);
  }

  // Capture usage from headers
  const usageHeader = response.headers.get('X-GenAi-Usage');
  const genaiUsageHeader = response.headers.get('x-genai-usage');
  const costHeader = response.headers.get('X-Cost');
  
  console.log('OpenRouter Headers:', {
    'X-GenAi-Usage': usageHeader,
    'x-genai-usage': genaiUsageHeader,
    'X-Cost': costHeader,
  });

  const data: OpenRouterResponse = await response.json();

  // Calculate cost from headers or fallback to usage data
  let costUsd = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  const parsedUsage = parseUsageHeader(usageHeader) || parseUsageHeader(genaiUsageHeader);
  
  if (parsedUsage) {
    costUsd = parsedUsage.total_cost;
    promptTokens = parsedUsage.prompt_tokens;
    completionTokens = parsedUsage.completion_tokens;
  } else if (data.usage) {
    // Fallback to response body usage data
    promptTokens = data.usage.prompt_tokens;
    completionTokens = data.usage.completion_tokens;
    // Estimate cost based on known rates (fallback)
    costUsd = estimateCost(model, promptTokens, completionTokens);
  }

  // Log the cost
  logOpenRouterCost(model, promptTokens, completionTokens, costUsd);

  return { response: data, cost: costUsd };
}

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Approximate pricing for common models (per 1K tokens)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'openai/gpt-4': { prompt: 0.03, completion: 0.06 },
    'openai/gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'openai/gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'anthropic/claude-3-opus': { prompt: 0.015, completion: 0.075 },
    'anthropic/claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
    'google/gemini-pro': { prompt: 0.0005, completion: 0.0015 },
    'meta-llama/llama-3-70b': { prompt: 0.0009, completion: 0.0009 },
  };

  const modelPricing = pricing[model] || pricing['openai/gpt-3.5-turbo'];
  
  const promptCost = (promptTokens / 1000) * modelPricing.prompt;
  const completionCost = (completionTokens / 1000) * modelPricing.completion;
  
  return promptCost + completionCost;
}

export async function testOpenRouterCall(): Promise<{ success: boolean; cost: number; message: string }> {
  try {
    const { cost } = await callOpenRouter(
      [{ role: 'user', content: 'Say "Hello, spend tracking is working!" and nothing else.' }],
      'openai/gpt-3.5-turbo'
    );
    
    return {
      success: true,
      cost,
      message: `Test call successful! Cost: $${cost.toFixed(6)}`,
    };
  } catch (error) {
    return {
      success: false,
      cost: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}