'use client';

import { useState } from 'react';
import { testOpenRouterCall } from '@/lib/openrouter';
import { testNanoBananaCall } from '@/lib/nanobanana';
import { clearSessionSpend, clearAllSpendData } from '@/lib/spend';

export function TestPanel() {
  const [openRouterResult, setOpenRouterResult] = useState<{ success: boolean; message: string } | null>(null);
  const [nanoBananaResult, setNanoBananaResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState({ openrouter: false, nanobanana: false });

  const handleTestOpenRouter = async () => {
    setIsLoading(prev => ({ ...prev, openrouter: true }));
    setOpenRouterResult(null);
    
    const result = await testOpenRouterCall();
    setOpenRouterResult(result);
    
    setIsLoading(prev => ({ ...prev, openrouter: false }));
  };

  const handleTestNanoBanana = async (resolution: '1K' | '2K' | '4K') => {
    setIsLoading(prev => ({ ...prev, nanobanana: true }));
    setNanoBananaResult(null);
    
    const result = await testNanoBananaCall(resolution);
    setNanoBananaResult(result);
    
    setIsLoading(prev => ({ ...prev, nanobanana: false }));
  };

  const handleClearSession = () => {
    clearSessionSpend();
    setOpenRouterResult(null);
    setNanoBananaResult(null);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all spend data across all sessions?')) {
      clearAllSpendData();
      setOpenRouterResult(null);
      setNanoBananaResult(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test OpenRouter</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Make a test API call to OpenRouter and verify cost capture from response headers.
        </p>
        <button
          onClick={handleTestOpenRouter}
          disabled={isLoading.openrouter}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isLoading.openrouter ? 'Testing...' : 'Test OpenRouter Call'}
        </button>
        
        {openRouterResult && (
          <div className={`mt-4 p-4 rounded-lg ${openRouterResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            <p className={openRouterResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
              {openRouterResult.success ? '✅ ' : '❌ '} {openRouterResult.message}
            </p>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test Nano Banana Pro</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Test image generation cost tracking at different resolutions.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['1K', '2K', '4K'] as const).map((res) => (
            <button
              key={res}
              onClick={() => handleTestNanoBanana(res)}
              disabled={isLoading.nanobanana}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading.nanobanana ? 'Generating...' : `Generate ${res} Image ($${res === '4K' ? '0.24' : '0.14'})`}
            </button>
          ))}
        </div>
        
        {nanoBananaResult && (
          <div className={`mt-4 p-4 rounded-lg ${nanoBananaResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            <p className={nanoBananaResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
              {nanoBananaResult.success ? '✅ ' : '❌ '} {nanoBananaResult.message}
            </p>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data Management</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Clear spend data. Use &quot;Clear Session&quot; to reset current session only.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleClearSession}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Clear Session
          </button>
          <button
            onClick={handleClearAll}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </section>
    </div>
  );
}