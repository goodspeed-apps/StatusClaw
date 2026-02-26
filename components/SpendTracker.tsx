'use client';

import { useState, useEffect } from 'react';
import { SessionSpend } from '@/types/spend';
import { getCurrentSessionSpend } from '@/lib/spend';

export function SpendTracker() {
  const [spend, setSpend] = useState<SessionSpend | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Initial load
    setSpend(getCurrentSessionSpend());

    // Listen for spend updates
    const handleSpendUpdate = (event: CustomEvent<SessionSpend | null>) => {
      setSpend(event.detail);
    };

    window.addEventListener('spend-updated', handleSpendUpdate as EventListener);

    return () => {
      window.removeEventListener('spend-updated', handleSpendUpdate as EventListener);
    };
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show spend tracker"
      >
        💰
      </button>
    );
  }

  const totalSpend = spend?.totalSpend || 0;
  const llmSpend = spend?.llmSpend || 0;
  const imageSpend = spend?.imageSpend || 0;
  const entryCount = spend?.entries.length || 0;

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[280px] z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Session Spend</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
          ${totalSpend.toFixed(4)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {entryCount} API calls
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">LLM Costs:</span>
          <span className="font-medium text-gray-900 dark:text-white">${llmSpend.toFixed(6)}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: totalSpend > 0 ? `${(llmSpend / totalSpend) * 100}%` : '0%' }}
          />
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Image Costs:</span>
          <span className="font-medium text-gray-900 dark:text-white">${imageSpend.toFixed(2)}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: totalSpend > 0 ? `${(imageSpend / totalSpend) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Session ID: {spend?.sessionId?.substring(0, 16)}...
      </div>
    </div>
  );
}