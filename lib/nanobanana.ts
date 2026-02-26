import { logNanoBananaCost } from './spend';

const NANO_BANANA_API_URL = 'https://api.nano-banana.com/v1/generate';

export interface NanoBananaResponse {
  id: string;
  imageUrl: string;
  resolution: '1K' | '2K' | '4K';
}

export async function generateImage(
  prompt: string,
  resolution: '1K' | '2K' | '4K' = '1K'
): Promise<{ response: NanoBananaResponse; cost: number }> {
  const apiKey = process.env.NEXT_PUBLIC_NANO_BANANA_API_KEY;
  
  // For testing/demo purposes, we'll simulate the API call
  // In production, this would make the actual API request
  
  if (!apiKey || apiKey === 'your_nano_banana_api_key_here') {
    // Simulate API call for testing
    console.log('Nano Banana API: Simulating image generation (no API key configured)');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const response: NanoBananaResponse = {
      id: `img-${Date.now()}`,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/${resolution === '4K' ? '3840/2160' : resolution === '2K' ? '2560/1440' : '1920/1080'}`,
      resolution,
    };

    // Log the cost
    const entry = logNanoBananaCost(resolution);
    
    return { response, cost: entry.costUsd };
  }

  // Real API call
  const apiResponse = await fetch(NANO_BANANA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      resolution,
    }),
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.text();
    throw new Error(`Nano Banana API error: ${apiResponse.status} ${error}`);
  }

  const data: NanoBananaResponse = await apiResponse.json();
  
  // Log the cost
  const entry = logNanoBananaCost(resolution);
  
  return { response: data, cost: entry.costUsd };
}

export async function testNanoBananaCall(resolution: '1K' | '2K' | '4K' = '1K'): Promise<{ success: boolean; cost: number; message: string }> {
  try {
    const { cost } = await generateImage(
      'A beautiful landscape with mountains and clouds',
      resolution
    );
    
    return {
      success: true,
      cost,
      message: `Test image generation successful! Cost: $${cost.toFixed(2)} (${resolution})`,
    };
  } catch (error) {
    return {
      success: false,
      cost: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}